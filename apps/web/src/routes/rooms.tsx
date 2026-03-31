import type { GameMode } from "@game-companion/game-domain";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { connectRealtime } from "../lib/realtime";
import { type Deck, getCards, getDecks } from "../lib/storage";

export const Route = createFileRoute("/rooms")({
	component: RoomsPage,
});

function RoomsPage() {
	const [decks, setDecks] = useState<Deck[]>([]);
	const [selectedDeckId, setSelectedDeckId] = useState("");
	const [roomName, setRoomName] = useState("Shared Match");
	const [mode, setMode] = useState<GameMode>("deck");
	const [joinRoomId, setJoinRoomId] = useState("");
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		const storedDecks = getDecks();
		setDecks(storedDecks);
		setSelectedDeckId(storedDecks[0]?.id ?? "");
	}, []);

	function createRoom() {
		const deck = decks.find((entry) => entry.id === selectedDeckId);

		if (!deck) {
			setMessage("Select a deck first.");
			return;
		}

		const cards = getCards();

		const connection = connectRealtime({
			onMessage(serverMessage) {
				if (serverMessage.type === "room:state") {
					connection.close();
					window.location.assign(`/rooms/${serverMessage.payload.roomId}`);
				}

				if (serverMessage.type === "error") {
					setMessage(serverMessage.payload.message);
				}
			},
			onError(errorMessage) {
				setMessage(errorMessage);
			},
			onOpen() {
				connection.send({
					type: "room:create",
					payload: {
						name: roomName.trim() || "Shared Match",
						deck,
						cards,
						mode,
					},
				});
			},
		});
	}

	function joinRoom() {
		const normalized = joinRoomId.trim().toUpperCase();

		if (!normalized) {
			setMessage("Enter a room code.");
			return;
		}

		window.location.assign(`/rooms/${normalized}`);
	}

	return (
		<main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
			<section className="space-y-2">
				<p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
					Online rooms
				</p>
				<h1 className="text-4xl font-black tracking-tight">
					Play together live.
				</h1>
				<p className="text-muted-foreground">
					Create a shared room from a saved deck, or join by room code.
				</p>
			</section>

			{message ? (
				<div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
					{message}
				</div>
			) : null}

			<div className="grid gap-6 md:grid-cols-2">
				<section className="rounded-3xl border bg-card p-5 shadow-sm">
					<h2 className="text-xl font-bold">Host a room</h2>
					<div className="mt-4 space-y-4">
						<div>
							<label htmlFor="room-name" className="text-sm font-medium">
								Room name
							</label>
							<input
								id="room-name"
								value={roomName}
								onChange={(event) => setRoomName(event.target.value)}
								className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm"
							/>
						</div>

						<div>
							<label htmlFor="deck-select" className="text-sm font-medium">
								Saved deck
							</label>
							<select
								id="deck-select"
								value={selectedDeckId}
								onChange={(event) => setSelectedDeckId(event.target.value)}
								className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm"
							>
								{decks.map((deck) => (
									<option key={deck.id} value={deck.id}>
										{deck.name}
									</option>
								))}
							</select>
						</div>

						<div className="grid grid-cols-2 gap-3">
							<label className="rounded-2xl border bg-muted/20 p-3 text-sm font-medium">
								<input
									type="radio"
									name="host-mode"
									checked={mode === "deck"}
									onChange={() => setMode("deck")}
									className="mr-2"
								/>
								Deck
							</label>
							<label className="rounded-2xl border bg-muted/20 p-3 text-sm font-medium">
								<input
									type="radio"
									name="host-mode"
									checked={mode === "chaotic"}
									onChange={() => setMode("chaotic")}
									className="mr-2"
								/>
								Chaotic
							</label>
						</div>

						<button
							type="button"
							onClick={createRoom}
							disabled={decks.length === 0}
							className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							Create room
						</button>
					</div>
				</section>

				<section className="rounded-3xl border bg-card p-5 shadow-sm">
					<h2 className="text-xl font-bold">Join a room</h2>
					<div className="mt-4 space-y-4">
						<div>
							<label htmlFor="join-room" className="text-sm font-medium">
								Room code
							</label>
							<input
								id="join-room"
								value={joinRoomId}
								onChange={(event) => setJoinRoomId(event.target.value)}
								placeholder="AB12CD"
								className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm uppercase"
							/>
						</div>

						<button
							type="button"
							onClick={joinRoom}
							className="w-full rounded-xl border px-4 py-3 text-sm font-semibold"
						>
							Join room
						</button>

						<Link
							to="/game"
							className="block text-center text-sm text-muted-foreground hover:underline"
						>
							Keep playing local game
						</Link>
					</div>
				</section>
			</div>
		</main>
	);
}
