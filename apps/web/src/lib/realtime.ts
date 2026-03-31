import {
	type ClientMessage,
	parseServerMessage,
	type ServerMessage,
} from "@game-companion/game-protocol";

const DEFAULT_REALTIME_URL = "ws://localhost:3001/ws";

export function getRealtimeUrl() {
	const fromEnv = import.meta.env.VITE_REALTIME_URL;
	return typeof fromEnv === "string" && fromEnv.length > 0
		? fromEnv
		: DEFAULT_REALTIME_URL;
}

export type RealtimeConnection = {
	send: (message: ClientMessage) => void;
	close: () => void;
};

export function connectRealtime(params: {
	onMessage: (message: ServerMessage) => void;
	onOpen?: () => void;
	onClose?: () => void;
	onError?: (message: string) => void;
}): RealtimeConnection {
	const socket = new WebSocket(getRealtimeUrl());

	socket.addEventListener("open", () => {
		params.onOpen?.();
	});

	socket.addEventListener("close", () => {
		params.onClose?.();
	});

	socket.addEventListener("error", () => {
		params.onError?.("Realtime connection error.");
	});

	socket.addEventListener("message", (event) => {
		try {
			const raw = JSON.parse(String(event.data));
			const parsed = parseServerMessage(raw);
			params.onMessage(parsed);
		} catch {
			params.onError?.("Received invalid server message.");
		}
	});

	return {
		send(message) {
			if (socket.readyState !== WebSocket.OPEN) {
				params.onError?.("Realtime connection is not ready.");
				return;
			}

			socket.send(JSON.stringify(message));
		},
		close() {
			socket.close();
		},
	};
}
