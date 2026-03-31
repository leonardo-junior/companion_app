import type { PlayCard } from "@game-companion/game-domain";
import type { RoomState } from "@game-companion/game-protocol";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { CardPreview } from "../components/CardPreview";
import { connectRealtime, type RealtimeConnection } from "../lib/realtime";

export const Route = createFileRoute("/rooms/$roomId")({
	component: RoomDetailsPage,
});

function RoomDetailsPage() {
	const { roomId } = Route.useParams();
	const normalizedRoomId = roomId.toUpperCase();

	const [room, setRoom] = useState<RoomState | null>(null);
	const [connection, setConnection] = useState<RealtimeConnection | null>(null);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const realtime = connectRealtime({
			onMessage(serverMessage) {
				if (serverMessage.type === "room:state") {
					if (serverMessage.payload.roomId !== normalizedRoomId) {
						return;
					}

					setRoom(serverMessage.payload);
					setError(null);
					return;
				}

				if (serverMessage.type === "room:deleted") {
					if (serverMessage.payload.roomId === normalizedRoomId) {
						setRoom(null);
						setError("Room was destroyed after all players left.");
					}
					return;
				}

				if (serverMessage.type === "error") {
					setError(serverMessage.payload.message);
				}
			},
			onOpen() {
				realtime.send({
					type: "room:join",
					payload: { roomId: normalizedRoomId },
				});
			},
			onError(message) {
				setError(message);
			},
		});

		setConnection(realtime);

		return () => {
			realtime.send({
				type: "room:leave",
				payload: { roomId: normalizedRoomId },
			});
			realtime.close();
		};
	}, [normalizedRoomId]);

	const latestDrawn = useMemo(
		() => room?.session.drawnCards[0] ?? null,
		[room],
	);
	const isChaotic = room?.session.mode === "chaotic";

	function requestDraw() {
		if (!connection) {
			return;
		}

		connection.send({
			type: "session:draw",
			payload: { roomId: normalizedRoomId },
		});
	}

	function requestReset() {
		if (!connection) {
			return;
		}

		connection.send({
			type: "session:reset",
			payload: { roomId: normalizedRoomId },
		});
	}

	return (
		<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
			<section className="rounded-3xl border bg-card p-6 shadow-sm">
				<p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
					Room {normalizedRoomId}
				</p>
				<h1 className="mt-2 text-3xl font-black tracking-tight">
					{room?.name ?? "Shared room"}
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{room
						? `${room.participantCount} participant${room.participantCount === 1 ? "" : "s"} connected · ${room.session.mode} mode`
						: "Waiting for room state..."}
				</p>
				{room ? (
					<p className="mt-2 text-sm text-muted-foreground">
						{isChaotic
							? "Chaotic mode keeps the same chance on every draw. Repeats are allowed."
							: "Deck mode removes cards from the shared deck for everyone."}
					</p>
				) : null}
			</section>

			{error ? (
				<div className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					{error}
				</div>
			) : null}

			<div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
				<div className="rounded-3xl border bg-card p-5 shadow-sm">
					<div className="grid grid-cols-3 gap-3 text-center">
						<div className="rounded-2xl bg-muted/40 p-3">
							<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Start
							</p>
							<p className="mt-2 text-2xl font-black">
								{room?.session.startingCards.length ?? 0}
							</p>
						</div>
						<div className="rounded-2xl bg-muted/40 p-3">
							<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
								{isChaotic ? "Pool" : "Remain"}
							</p>
							<p className="mt-2 text-2xl font-black">
								{isChaotic
									? (room?.session.startingCards.length ?? 0)
									: (room?.session.remainingCards.length ?? 0)}
							</p>
						</div>
						<div className="rounded-2xl bg-muted/40 p-3">
							<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
								Drawn
							</p>
							<p className="mt-2 text-2xl font-black">
								{room?.session.drawnCards.length ?? 0}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={requestDraw}
						disabled={
							!room ||
							(!isChaotic && (room?.session.remainingCards.length ?? 0) === 0)
						}
						className="mt-5 flex h-56 w-full items-center justify-center rounded-3xl border-4 border-dashed border-primary/50 bg-primary/5 px-4 text-center text-lg font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{!room
							? "Waiting for room"
							: !isChaotic && room.session.remainingCards.length === 0
								? "Shared deck empty"
								: "Draw shared card"}
					</button>

					<button
						type="button"
						onClick={requestReset}
						disabled={!room}
						className="mt-3 w-full rounded-xl border px-4 py-3 text-sm font-semibold"
					>
						Reset shared deck
					</button>
				</div>

				<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
					<div className="rounded-3xl border bg-card p-6 shadow-sm">
						<p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
							Latest shared draw
						</p>
						<div className="mt-5 flex min-h-[22rem] items-center justify-center">
							{latestDrawn ? (
								<CardPreview card={latestDrawn} />
							) : (
								<div className="rounded-3xl border border-dashed bg-muted/20 px-8 py-16 text-center text-muted-foreground">
									No cards drawn yet.
								</div>
							)}
						</div>

						<div className="mt-6">
							<Link
								to="/rooms"
								className="text-sm text-muted-foreground hover:underline"
							>
								Back to rooms
							</Link>
						</div>
					</div>

					<div className="space-y-4">
						<DisclosureList
							title={isChaotic ? "Card pool" : "Starting cards"}
							cards={room?.session.startingCards ?? []}
						/>
						{!isChaotic ? (
							<DisclosureList
								title="Remaining cards"
								cards={room?.session.remainingCards ?? []}
							/>
						) : null}
						<DisclosureList
							title="Drawn cards"
							cards={room?.session.drawnCards ?? []}
						/>
					</div>
				</div>
			</div>
		</main>
	);
}

function DisclosureList({
	title,
	cards,
}: {
	title: string;
	cards: PlayCard[];
}) {
	return (
		<details
			className="overflow-hidden rounded-3xl border bg-card shadow-sm"
			open
		>
			<summary className="cursor-pointer list-none px-5 py-4 text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
				{title} ({cards.length})
			</summary>
			<div className="border-t px-5 py-4">
				{cards.length === 0 ? (
					<p className="text-sm text-muted-foreground">No cards here yet.</p>
				) : (
					<ul className="space-y-2">
						{cards.map((card) => (
							<li
								key={card.instanceId}
								className="flex items-center justify-between gap-3 rounded-2xl bg-muted/20 px-3 py-2 text-sm"
							>
								<span className="truncate font-medium text-foreground">
									{card.name}
								</span>
								<span className="capitalize text-muted-foreground">
									{card.rarity}
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</details>
	);
}
