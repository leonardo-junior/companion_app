import {
	createRoom,
	drawFromRoom,
	getParticipantCount,
	joinRoom,
	leaveRoom,
	type Room,
	resetRoom,
} from "@game-companion/game-domain";
import {
	type ServerMessage,
	safeParseClientMessage,
} from "@game-companion/game-protocol";

type ClientData = {
	clientId: string;
	rooms: Set<string>;
};

type WsClient = {
	data: ClientData;
	send: (payload: string) => void;
};

type BunServer = {
	port: number;
	upgrade: (request: Request, options: { data: ClientData }) => boolean;
	stop: (closeActiveConnections?: boolean) => void;
};

declare const Bun: {
	env: Record<string, string | undefined>;
	serve: (options: {
		port: number;
		fetch: (request: Request, server: BunServer) => Response | undefined;
		websocket: {
			open: (ws: WsClient) => void;
			message: (ws: WsClient, rawMessage: string | ArrayBuffer) => void;
			close: (ws: WsClient) => void;
		};
	}) => BunServer;
};

function createClientId() {
	return `client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createRoomId() {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let roomId = "";
	for (let index = 0; index < 6; index += 1) {
		roomId += alphabet[Math.floor(Math.random() * alphabet.length)] ?? "A";
	}
	return roomId;
}

function roomStateMessage(room: Room): ServerMessage {
	return {
		type: "room:state",
		payload: {
			roomId: room.id,
			name: room.name,
			hostClientId: room.hostClientId,
			participantCount: getParticipantCount(room),
			session: room.session,
			deckSnapshot: room.deckSnapshot,
			updatedAt: room.updatedAt,
		},
	};
}

function send(ws: WsClient, message: ServerMessage) {
	ws.send(JSON.stringify(message));
}

export function createRealtimeServer(port = Number(Bun.env.PORT ?? 3001)) {
	const rooms = new Map<string, Room>();
	const socketsByRoom = new Map<string, Set<WsClient>>();
	const emptyRoomTimers = new Map<string, ReturnType<typeof setTimeout>>();
	const emptyRoomTtlMs = Number(Bun.env.EMPTY_ROOM_TTL_MS ?? 60_000);

	function clearRoomDeletionTimer(roomId: string) {
		const timer = emptyRoomTimers.get(roomId);

		if (!timer) {
			return;
		}

		clearTimeout(timer);
		emptyRoomTimers.delete(roomId);
	}

	function scheduleRoomDeletion(roomId: string) {
		clearRoomDeletionTimer(roomId);

		const timer = setTimeout(() => {
			const room = rooms.get(roomId);

			if (!room || getParticipantCount(room) > 0) {
				emptyRoomTimers.delete(roomId);
				return;
			}

			rooms.delete(roomId);
			socketsByRoom.delete(roomId);
			emptyRoomTimers.delete(roomId);
		}, emptyRoomTtlMs);

		emptyRoomTimers.set(roomId, timer);
	}

	const server = Bun.serve({
		port,
		fetch(request: Request, serverInstance: BunServer) {
			const pathname = new URL(request.url).pathname;

			if (pathname === "/ws") {
				const upgraded = serverInstance.upgrade(request, {
					data: {
						clientId: createClientId(),
						rooms: new Set<string>(),
					},
				});

				if (upgraded) {
					return;
				}
			}

			if (pathname === "/healthz") {
				return new Response("ok", { status: 200 });
			}

			return new Response("Realtime server running", { status: 200 });
		},
		websocket: {
			open(ws: WsClient) {
				send(ws, {
					type: "connected",
					payload: { clientId: ws.data.clientId },
				});
			},
			message(ws: WsClient, rawMessage: string | ArrayBuffer) {
				const text =
					typeof rawMessage === "string"
						? rawMessage
						: new TextDecoder().decode(rawMessage);
				let json: unknown;

				try {
					json = JSON.parse(text);
				} catch {
					send(ws, {
						type: "error",
						payload: { code: "bad_request", message: "Invalid JSON payload." },
					});
					return;
				}

				const parsed = safeParseClientMessage(json);

				if (!parsed.success) {
					send(ws, {
						type: "error",
						payload: {
							code: "bad_request",
							message: "Invalid message payload.",
						},
					});
					return;
				}

				const message = parsed.data;

				if (message.type === "ping") {
					send(ws, { type: "pong", payload: { time: message.payload.time } });
					return;
				}

				if (message.type === "room:create") {
					const roomId = message.payload.roomId ?? createRoomId();

					if (rooms.has(roomId)) {
						send(ws, {
							type: "error",
							payload: { code: "room_exists", message: "Room already exists." },
						});
						return;
					}

					const room = createRoom({
						roomId,
						name: message.payload.name,
						hostClientId: ws.data.clientId,
						deck: message.payload.deck,
						cards: message.payload.cards,
						mode: message.payload.mode,
					});

					if (room.session.startingCards.length === 0) {
						send(ws, {
							type: "error",
							payload: {
								code: "invalid_deck",
								message: "Deck has no playable cards.",
							},
						});
						return;
					}

					rooms.set(roomId, room);
					clearRoomDeletionTimer(roomId);
					ws.data.rooms.add(roomId);

					const roomSockets = socketsByRoom.get(roomId) ?? new Set<WsClient>();
					roomSockets.add(ws);
					socketsByRoom.set(roomId, roomSockets);

					send(ws, roomStateMessage(room));
					return;
				}

				if (message.type === "room:join") {
					const room = rooms.get(message.payload.roomId);

					if (!room) {
						send(ws, {
							type: "error",
							payload: { code: "room_not_found", message: "Room not found." },
						});
						return;
					}

					const nextRoom = joinRoom(room, ws.data.clientId);
					rooms.set(nextRoom.id, nextRoom);
					clearRoomDeletionTimer(nextRoom.id);
					ws.data.rooms.add(nextRoom.id);

					const roomSockets =
						socketsByRoom.get(nextRoom.id) ?? new Set<WsClient>();
					roomSockets.add(ws);
					socketsByRoom.set(nextRoom.id, roomSockets);

					for (const roomSocket of roomSockets) {
						send(roomSocket, roomStateMessage(nextRoom));
					}
					return;
				}

				if (message.type === "room:leave") {
					const room = rooms.get(message.payload.roomId);

					if (!room) {
						return;
					}

					const nextRoom = leaveRoom(room, ws.data.clientId);
					ws.data.rooms.delete(nextRoom.id);

					const roomSockets =
						socketsByRoom.get(nextRoom.id) ?? new Set<WsClient>();
					roomSockets.delete(ws);

					if (getParticipantCount(nextRoom) === 0) {
						rooms.set(nextRoom.id, nextRoom);
						socketsByRoom.delete(nextRoom.id);
						scheduleRoomDeletion(nextRoom.id);
						return;
					}

					rooms.set(nextRoom.id, nextRoom);
					clearRoomDeletionTimer(nextRoom.id);

					for (const roomSocket of roomSockets) {
						send(roomSocket, roomStateMessage(nextRoom));
					}
					return;
				}

				if (
					message.type === "session:draw" ||
					message.type === "session:reset"
				) {
					const room = rooms.get(message.payload.roomId);

					if (!room) {
						send(ws, {
							type: "error",
							payload: { code: "room_not_found", message: "Room not found." },
						});
						return;
					}

					const nextRoom =
						message.type === "session:draw"
							? drawFromRoom(room)
							: resetRoom(room);

					rooms.set(nextRoom.id, nextRoom);

					const roomSockets =
						socketsByRoom.get(nextRoom.id) ?? new Set<WsClient>();
					for (const roomSocket of roomSockets) {
						send(roomSocket, roomStateMessage(nextRoom));
					}
				}
			},
			close(ws: WsClient) {
				for (const roomId of ws.data.rooms) {
					const room = rooms.get(roomId);

					if (!room) {
						continue;
					}

					const nextRoom = leaveRoom(room, ws.data.clientId);
					const roomSockets = socketsByRoom.get(roomId) ?? new Set<WsClient>();
					roomSockets.delete(ws);

					if (getParticipantCount(nextRoom) === 0) {
						rooms.set(roomId, nextRoom);
						socketsByRoom.delete(roomId);
						scheduleRoomDeletion(roomId);
						continue;
					}

					rooms.set(roomId, nextRoom);
					clearRoomDeletionTimer(roomId);
					for (const roomSocket of roomSockets) {
						send(roomSocket, roomStateMessage(nextRoom));
					}
				}
			},
		},
	});

	return server;
}
