import type { Card, Deck, GameSession, PlayCard } from "./storage";

function createInstanceId(cardId: string, copyIndex: number) {
	if (
		typeof crypto !== "undefined" &&
		typeof crypto.randomUUID === "function"
	) {
		return `${cardId}-${copyIndex}-${crypto.randomUUID()}`;
	}

	return `${cardId}-${copyIndex}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function shuffleCards(cards: PlayCard[]): PlayCard[] {
	const result = [...cards];

	for (let index = result.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
	}

	return result;
}

export function createSessionFromDeck(deck: Deck, cards: Card[]): GameSession {
	const cardLookup = new Map(cards.map((card) => [card.id, card]));
	const startingCards: PlayCard[] = [];

	for (const entry of deck.cards) {
		const cardDefinition = cardLookup.get(entry.cardId);

		if (!cardDefinition) {
			continue;
		}

		for (let copyIndex = 0; copyIndex < entry.quantity; copyIndex += 1) {
			startingCards.push({
				...cardDefinition,
				instanceId: createInstanceId(cardDefinition.id, copyIndex),
			});
		}
	}

	return {
		deckId: deck.id,
		startingCards,
		remainingCards: shuffleCards(startingCards),
		drawnCards: [],
	};
}

export function drawCard(session: GameSession): GameSession {
	const [nextDrawn, ...remainingCards] = session.remainingCards;

	if (!nextDrawn) {
		return session;
	}

	return {
		...session,
		remainingCards,
		drawnCards: [nextDrawn, ...session.drawnCards],
	};
}

export function resetSession(session: GameSession): GameSession {
	return {
		...session,
		remainingCards: shuffleCards(session.startingCards),
		drawnCards: [],
	};
}
