import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CardPreview, rarityClasses } from "../components/CardPreview";
import { Badge } from "../components/ui/badge";
import { getIcon } from "../lib/icons";
import {
	type Deck,
	type DeckCard,
	type Card as GameCard,
	getCards,
	getDecks,
	saveDecks,
} from "../lib/storage";

export const Route = createFileRoute("/decks")({
	component: DecksPage,
});

function DecksPage() {
	const [allCards, setAllCards] = useState<GameCard[]>([]);
	const [decks, setDecks] = useState<Deck[]>([]);
	const [newDeckName, setNewDeckName] = useState("");
	const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
	const [message, setMessage] = useState<string | null>(null);
	const [editingDeckId, setEditingDeckId] = useState<string | null>(null);

	useEffect(() => {
		setAllCards(getCards());
		setDecks(getDecks());
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

	function resetDeckForm() {
		setNewDeckName("");
		setDeckCards([]);
		setEditingDeckId(null);
	}

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
			id: editingDeckId ?? `deck-${Date.now()}`,
			name: trimmedDeckName,
			cards: cleanedCards,
		};

		const nextDecks = editingDeckId
			? decks.map((deck) => (deck.id === editingDeckId ? nextDeck : deck))
			: [...decks, nextDeck];
		setDecks(nextDecks);
		saveDecks(nextDecks);
		resetDeckForm();
		setMessage(
			editingDeckId
				? `Updated deck “${trimmedDeckName}”.`
				: `Saved deck “${trimmedDeckName}”.`,
		);
	}

	function handleEditDeck(deck: Deck) {
		setEditingDeckId(deck.id);
		setNewDeckName(deck.name);
		setDeckCards(deck.cards);
		setMessage(`Editing deck “${deck.name}”.`);
	}

	function handleDeleteDeck(deckId: string) {
		const nextDecks = decks.filter((deck) => deck.id !== deckId);
		setDecks(nextDecks);
		saveDecks(nextDecks);

		if (editingDeckId === deckId) {
			resetDeckForm();
		}

		setMessage("Deck deleted.");
	}

	return (
		<main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
			<section className="space-y-3">
				<p className="text-sm font-semibold uppercase tracking-[0.25em] text-muted-foreground">
					Decks
				</p>
				<div className="space-y-2">
					<h1 className="text-4xl font-black tracking-tight text-foreground">
						Build and save decks.
					</h1>
					<p className="max-w-3xl text-base text-muted-foreground">
						Choose saved cards, set quantities, and save your deck to play with
						later.
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
							No cards available yet. Go to the{" "}
							<Link to="/" className="text-primary hover:underline">
								Cards page
							</Link>{" "}
							and create your first card.
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
						<h2 className="text-xl font-bold text-foreground">
							{editingDeckId ? "Edit deck" : "Save new deck"}
						</h2>

						{editingDeckId ? (
							<div className="mt-4 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
								You are editing an existing deck. Save to update it, or cancel
								to go back to create mode.
							</div>
						) : null}

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
								{editingDeckId ? "Update deck" : "Save deck"}
							</button>

							{editingDeckId ? (
								<button
									type="button"
									onClick={resetDeckForm}
									className="w-full rounded-xl border px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
								>
									Cancel edit
								</button>
							) : null}
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
											<div className="flex flex-col gap-2">
												<button
													type="button"
													onClick={() => handleEditDeck(deck)}
													className="rounded-xl border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
												>
													{editingDeckId === deck.id ? "Editing" : "Edit"}
												</button>
												<button
													type="button"
													onClick={() => handleDeleteDeck(deck.id)}
													className="rounded-xl border border-destructive/30 px-3 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
												>
													Delete
												</button>
											</div>
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
