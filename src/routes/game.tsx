import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { CardPreview } from "../components/CardPreview";
import {
	createSessionFromDeck,
	drawCard,
	resetSession,
} from "../lib/gameLogic";
import {
	type Deck,
	type Card as GameCard,
	type GameMode,
	type GameSession,
	getCards,
	getDecks,
	getSession,
	type PlayCard,
	saveSession,
} from "../lib/storage";

export const Route = createFileRoute("/game")({
	component: GamePage,
});

function GamePage() {
	const [allCards, setAllCards] = useState<GameCard[]>([]);
	const [decks, setDecks] = useState<Deck[]>([]);
	const [session, setSession] = useState<GameSession | null>(null);
	const [message, setMessage] = useState<string | null>(null);
	const [selectedMode, setSelectedMode] = useState<GameMode>("deck");

	useEffect(() => {
		setAllCards(getCards());
		setDecks(getDecks());
		setSession(getSession());
		// test
	}, []);

	function startGame(deck: Deck) {
		const nextSession = createSessionFromDeck(deck, allCards, selectedMode);

		if (nextSession.startingCards.length === 0) {
			setMessage(
				"This deck has no playable cards. Create cards or rebuild the deck.",
			);
			setSession(null);
			saveSession(null);
			return;
		}

		setSession(nextSession);
		saveSession(nextSession);
		setMessage(`Started “${deck.name}” in ${selectedMode} mode.`);
	}

	function handleDraw() {
		if (!session) {
			return;
		}

		const nextSession = drawCard(session);
		setSession(nextSession);
		saveSession(nextSession);
	}

	function handleReset() {
		if (!session) {
			return;
		}

		const nextSession = resetSession(session);
		setSession(nextSession);
		saveSession(nextSession);
	}

	function handleQuit() {
		setSession(null);
		saveSession(null);
		setMessage("Game session cleared.");
	}

	if (session) {
		const latestDrawn = session.drawnCards[0] ?? null;
		const isChaotic = session.mode === "chaotic";

		return (
			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
				<section className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
							Game session &middot; {isChaotic ? "Chaotic mode" : "Deck mode"}
						</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
							{isChaotic
								? "Draw cards with replacement."
								: "Draw cards without replacement."}
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							{isChaotic
								? "Chances never change. Draw from the full deck every time."
								: "Remaining cards drop one by one as you draw from the deck."}
						</p>
					</div>

					<div className="flex flex-wrap gap-3">
						<button
							type="button"
							onClick={handleReset}
							className="rounded-xl border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
						>
							Reset deck
						</button>
						<button
							type="button"
							onClick={handleQuit}
							className="rounded-xl bg-destructive/15 px-4 py-2 text-sm font-semibold text-destructive transition hover:bg-destructive/20"
						>
							End game
						</button>
					</div>
				</section>

				<section className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
					<div className="rounded-3xl border bg-card p-5 shadow-sm">
						<p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
							Deck status
						</p>
						<div className="mt-4 grid grid-cols-3 gap-3 text-center">
							<div className="rounded-2xl bg-muted/40 p-3">
								<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
									Start
								</p>
								<p className="mt-2 text-2xl font-black">
									{session.startingCards.length}
								</p>
							</div>
							<div className="rounded-2xl bg-muted/40 p-3">
								<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
									{isChaotic ? "Pool" : "Remain"}
								</p>
								<p className="mt-2 text-2xl font-black">
									{isChaotic
										? session.startingCards.length
										: session.remainingCards.length}
								</p>
							</div>
							<div className="rounded-2xl bg-muted/40 p-3">
								<p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
									Drawn
								</p>
								<p className="mt-2 text-2xl font-black">
									{session.drawnCards.length}
								</p>
							</div>
						</div>

						<button
							type="button"
							onClick={handleDraw}
							disabled={!isChaotic && session.remainingCards.length === 0}
							className="mt-5 flex h-72 w-full items-center justify-center rounded-3xl border-4 border-dashed border-primary/50 bg-primary/5 px-4 text-center text-lg font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted/30 disabled:text-muted-foreground"
						>
							{!isChaotic && session.remainingCards.length === 0
								? "Deck empty"
								: isChaotic
									? "Draw card"
									: `Draw card (${session.remainingCards.length} left)`}
						</button>
					</div>

					<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
						<div className="rounded-3xl border bg-card p-6 shadow-sm">
							<p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
								Current draw
							</p>

							<div className="mt-4 flex min-h-[22rem] items-center justify-center">
								{latestDrawn ? (
									<CardPreview card={latestDrawn} />
								) : (
									<div className="rounded-3xl border border-dashed bg-muted/20 px-8 py-16 text-center text-muted-foreground">
										Draw a card to reveal it here.
									</div>
								)}
							</div>
						</div>

						<div className="space-y-4">
							<DisclosureList
								title={isChaotic ? "Card Pool" : "Starting cards"}
								cards={session.startingCards}
							/>
							{!isChaotic && (
								<DisclosureList
									title="Remaining cards"
									cards={session.remainingCards}
								/>
							)}
							<DisclosureList title="Drawn cards" cards={session.drawnCards} />
						</div>
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
			<section className="space-y-3">
				<p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
					Play
				</p>
				<div className="space-y-2">
					<h1 className="text-4xl font-black tracking-tight text-foreground">
						Select a deck to play.
					</h1>
					<p className="max-w-3xl text-base text-muted-foreground">
						Choose one of your saved decks to start a new game session.
					</p>
				</div>
			</section>

			<section className="flex flex-col gap-4 sm:flex-row sm:items-center">
				<label className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm cursor-pointer hover:bg-muted/50 transition flex-1">
					<input
						type="radio"
						name="mode"
						value="deck"
						checked={selectedMode === "deck"}
						onChange={() => setSelectedMode("deck")}
						className="h-5 w-5 text-primary accent-primary"
					/>
					<div>
						<p className="font-bold text-foreground">Deck mode</p>
						<p className="text-sm text-muted-foreground">
							Draw without replacement
						</p>
					</div>
				</label>
				<label className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm cursor-pointer hover:bg-muted/50 transition flex-1">
					<input
						type="radio"
						name="mode"
						value="chaotic"
						checked={selectedMode === "chaotic"}
						onChange={() => setSelectedMode("chaotic")}
						className="h-5 w-5 text-primary accent-primary"
					/>
					<div>
						<p className="font-bold text-foreground">Chaotic mode</p>
						<p className="text-sm text-muted-foreground">
							Draw with replacement
						</p>
					</div>
				</label>
			</section>

			{message ? (
				<div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
					{message}
				</div>
			) : null}

			<section>
				{decks.length === 0 ? (
					<div className="rounded-3xl border border-dashed bg-muted/20 p-12 text-center flex flex-col items-center gap-4">
						<p className="text-muted-foreground">
							You don't have any saved decks yet.
						</p>
						<Link
							to="/decks"
							className="rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
						>
							Go to Decks to build one
						</Link>
					</div>
				) : (
					<ul className="grid gap-4 sm:grid-cols-2">
						{decks.map((deck) => (
							<li
								key={deck.id}
								className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm"
							>
								<div>
									<h2 className="text-xl font-bold text-foreground">
										{deck.name}
									</h2>
									<p className="mt-1 text-sm text-muted-foreground">
										{deck.cards.reduce(
											(total, entry) => total + entry.quantity,
											0,
										)}{" "}
										cards
									</p>
								</div>
								<button
									type="button"
									onClick={() => startGame(deck)}
									className="mt-auto w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
								>
									Start Playing
								</button>
							</li>
						))}
					</ul>
				)}
			</section>
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
