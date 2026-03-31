import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "../components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../components/ui/card";
import {
	createSessionFromDeck,
	drawCard,
	resetSession,
} from "../lib/gameLogic";
import { getIcon } from "../lib/icons";
import {
	type Deck,
	type DeckCard,
	type Card as GameCard,
	type GameSession,
	getCards,
	getDecks,
	getSession,
	type PlayCard,
	type Rarity,
	saveDecks,
	saveSession,
} from "../lib/storage";

export const Route = createFileRoute("/game")({
	component: GamePage,
});

const rarityClasses: Record<Rarity, string> = {
	common:
		"border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-100",
	rare: "border-blue-300 bg-blue-100 text-blue-950 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-100",
	epic: "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-950 dark:border-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-100",
	legendary:
		"border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-100",
};

function GamePage() {
	const [allCards, setAllCards] = useState<GameCard[]>([]);
	const [decks, setDecks] = useState<Deck[]>([]);
	const [session, setSession] = useState<GameSession | null>(null);
	const [newDeckName, setNewDeckName] = useState("");
	const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
	const [message, setMessage] = useState<string | null>(null);

	useEffect(() => {
		setAllCards(getCards());
		setDecks(getDecks());
		setSession(getSession());
	}, []);

	const selectedDeckCards = useMemo(
		() =>
			deckCards
				.map((entry) => {
					const card = allCards.find(
						(currentCard) => currentCard.id === entry.cardId,
					);

					if (!card) {
						return null;
					}

					return {
						card,
						quantity: entry.quantity,
					};
				})
				.filter(
					(entry): entry is { card: GameCard; quantity: number } =>
						entry !== null,
				),
		[allCards, deckCards],
	);

	const totalSelectedCards = deckCards.reduce(
		(total, entry) => total + entry.quantity,
		0,
	);

	function updateCardQuantity(cardId: string, delta: number) {
		setDeckCards((currentDeckCards) => {
			const existingCard = currentDeckCards.find(
				(entry) => entry.cardId === cardId,
			);

			if (!existingCard) {
				return delta > 0
					? [...currentDeckCards, { cardId, quantity: delta }]
					: currentDeckCards;
			}

			const nextQuantity = Math.max(0, existingCard.quantity + delta);

			if (nextQuantity === 0) {
				return currentDeckCards.filter((entry) => entry.cardId !== cardId);
			}

			return currentDeckCards.map((entry) =>
				entry.cardId === cardId ? { ...entry, quantity: nextQuantity } : entry,
			);
		});
	}

	function handleSaveDeck(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		const trimmedDeckName = newDeckName.trim();
		const cleanedCards = deckCards.filter((entry) => entry.quantity > 0);

		if (!trimmedDeckName || cleanedCards.length === 0) {
			return;
		}

		const nextDeck: Deck = {
			id: `deck-${Date.now()}`,
			name: trimmedDeckName,
			cards: cleanedCards,
		};

		const nextDecks = [...decks, nextDeck];
		setDecks(nextDecks);
		saveDecks(nextDecks);
		setNewDeckName("");
		setDeckCards([]);
		setMessage(`Saved deck “${trimmedDeckName}”.`);
	}

	function startGame(deck: Deck) {
		const nextSession = createSessionFromDeck(deck, allCards);

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
		setMessage(`Started “${deck.name}”.`);
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

		return (
			<main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
				<section className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm md:flex-row md:items-center md:justify-between">
					<div>
						<p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
							Game session
						</p>
						<h1 className="mt-2 text-3xl font-black tracking-tight text-foreground">
							Draw cards without replacement.
						</h1>
						<p className="mt-2 text-sm text-muted-foreground">
							Remaining cards drop one by one as you draw from the deck.
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
									Remain
								</p>
								<p className="mt-2 text-2xl font-black">
									{session.remainingCards.length}
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
							disabled={session.remainingCards.length === 0}
							className="mt-5 flex h-72 w-full items-center justify-center rounded-3xl border-4 border-dashed border-primary/50 bg-primary/5 px-4 text-center text-lg font-black text-primary transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted/30 disabled:text-muted-foreground"
						>
							{session.remainingCards.length === 0
								? "Deck empty"
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
								title="Starting cards"
								cards={session.startingCards}
							/>
							<DisclosureList
								title="Remaining cards"
								cards={session.remainingCards}
							/>
							<DisclosureList title="Drawn cards" cards={session.drawnCards} />
						</div>
					</div>
				</section>
			</main>
		);
	}

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
			<section className="space-y-3">
				<p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
					Game
				</p>
				<div className="space-y-2">
					<h1 className="text-4xl font-black tracking-tight text-foreground">
						Build a deck and start drawing.
					</h1>
					<p className="max-w-3xl text-base text-muted-foreground">
						Choose saved cards, set quantities, save the deck, and then start a
						game session that removes cards as they are drawn.
					</p>
				</div>
			</section>

			{message ? (
				<div className="rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
					{message}
				</div>
			) : null}

			<div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_23rem]">
				<section className="space-y-4">
					<h2 className="text-2xl font-bold text-foreground">
						Choose cards for the deck
					</h2>
					{allCards.length === 0 ? (
						<div className="rounded-3xl border border-dashed bg-muted/20 p-12 text-center text-muted-foreground">
							No cards available yet. Go to the Cards page and create your first
							card.
						</div>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
							{allCards.map((card) => {
								const currentQuantity =
									deckCards.find((entry) => entry.cardId === card.id)
										?.quantity ?? 0;

								return (
									<div
										key={card.id}
										className="space-y-3 rounded-3xl border bg-card p-4 shadow-sm"
									>
										<CardPreview card={card} compact />
										<div className="flex items-center justify-between rounded-2xl bg-muted/30 px-3 py-2">
											<span className="text-sm font-medium text-muted-foreground">
												Quantity in deck
											</span>
											<div className="flex items-center gap-2">
												<button
													type="button"
													aria-label={`Remove one ${card.name}`}
													onClick={() => updateCardQuantity(card.id, -1)}
													className="flex h-8 w-8 items-center justify-center rounded-full border text-lg transition hover:bg-muted"
												>
													−
												</button>
												<span className="w-8 text-center text-base font-black text-foreground">
													{currentQuantity}
												</span>
												<button
													type="button"
													aria-label={`Add one ${card.name}`}
													onClick={() => updateCardQuantity(card.id, 1)}
													className="flex h-8 w-8 items-center justify-center rounded-full border text-lg transition hover:bg-muted"
												>
													+
												</button>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</section>

				<aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
					<div className="rounded-3xl border bg-card p-5 shadow-sm">
						<h2 className="text-xl font-bold text-foreground">Save new deck</h2>
						<form onSubmit={handleSaveDeck} className="mt-4 space-y-4">
							<div className="space-y-2">
								<label
									htmlFor="deck-name"
									className="text-sm font-medium text-foreground"
								>
									Deck name
								</label>
								<input
									id="deck-name"
									required
									value={newDeckName}
									onChange={(event) => setNewDeckName(event.target.value)}
									placeholder="Starter Deck"
									className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
								/>
							</div>

							<div className="rounded-2xl bg-muted/30 p-4 text-sm text-muted-foreground">
								Total selected cards:{" "}
								<span className="font-black text-foreground">
									{totalSelectedCards}
								</span>
							</div>

							<button
								type="submit"
								disabled={
									totalSelectedCards === 0 || newDeckName.trim().length === 0
								}
								className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
							>
								Save deck
							</button>
						</form>
					</div>

					<div className="rounded-3xl border bg-card p-5 shadow-sm">
						<h3 className="text-lg font-bold text-foreground">
							Selected cards
						</h3>
						{selectedDeckCards.length === 0 ? (
							<p className="mt-3 text-sm text-muted-foreground">
								Add cards from the grid to see your deck composition here.
							</p>
						) : (
							<ul className="mt-4 space-y-3">
								{selectedDeckCards.map(({ card, quantity }) => {
									const IconComponent = getIcon(card.iconId);

									return (
										<li
											key={card.id}
											className="flex items-center gap-3 rounded-2xl border bg-muted/20 p-3"
										>
											<div
												className={`rounded-xl border p-2 ${rarityClasses[card.rarity]}`}
											>
												<IconComponent size={20} />
											</div>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm font-semibold text-foreground">
													{card.name}
												</p>
												<p className="text-xs capitalize text-muted-foreground">
													{card.rarity}
												</p>
											</div>
											<Badge variant="secondary">x{quantity}</Badge>
										</li>
									);
								})}
							</ul>
						)}
					</div>

					<div className="rounded-3xl border bg-card p-5 shadow-sm">
						<h3 className="text-lg font-bold text-foreground">Saved decks</h3>
						{decks.length === 0 ? (
							<p className="mt-3 text-sm text-muted-foreground">
								No decks saved yet.
							</p>
						) : (
							<ul className="mt-4 space-y-3">
								{decks.map((deck) => (
									<li
										key={deck.id}
										className="rounded-2xl border bg-muted/20 p-4"
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="font-semibold text-foreground">
													{deck.name}
												</p>
												<p className="text-sm text-muted-foreground">
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
												className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
											>
												Play
											</button>
										</div>
									</li>
								))}
							</ul>
						)}
					</div>
				</aside>
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

function CardPreview({
	card,
	compact = false,
}: {
	card: Pick<GameCard, "name" | "effect" | "rarity" | "iconId">;
	compact?: boolean;
}) {
	const IconComponent = getIcon(card.iconId);

	return (
		<Card
			className={`mx-auto w-full border-2 ${rarityClasses[card.rarity]} ${
				compact ? "max-w-[16rem]" : "max-w-[18rem]"
			}`}
		>
			<CardHeader className="pb-2 text-center">
				<CardTitle className={compact ? "text-base" : "text-xl"}>
					{card.name}
				</CardTitle>
				<div className="flex justify-center">
					<Badge variant="outline" className="capitalize bg-background/70">
						{card.rarity}
					</Badge>
				</div>
			</CardHeader>
			<CardContent
				className={`flex flex-1 flex-col items-center justify-center gap-3 text-center ${compact ? "min-h-[12rem]" : "min-h-[16rem]"}`}
			>
				<IconComponent size={compact ? 42 : 58} />
				<p
					className={`leading-relaxed opacity-90 ${compact ? "line-clamp-3 text-xs" : "text-sm"}`}
				>
					{card.effect}
				</p>
			</CardContent>
		</Card>
	);
}
