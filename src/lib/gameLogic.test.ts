import { describe, expect, test } from "vitest";

import { createSessionFromDeck, drawCard, resetSession } from "./gameLogic";
import type { Card, Deck } from "./storage";

describe("gameLogic", () => {
	const mockCards: Card[] = [
		{
			id: "c1",
			name: "Card 1",
			effect: "Eff 1",
			rarity: "common",
			iconId: "GiAxeSword",
		},
		{
			id: "c2",
			name: "Card 2",
			effect: "Eff 2",
			rarity: "rare",
			iconId: "GiBattleAxe",
		},
	];

	const mockDeck: Deck = {
		id: "d1",
		name: "My Deck",
		cards: [
			{ cardId: "c1", quantity: 2 },
			{ cardId: "c2", quantity: 1 },
		],
	};

	test("createSessionFromDeck initializes correctly", () => {
		const session = createSessionFromDeck(mockDeck, mockCards);

		expect(session.deckId).toBe("d1");
		expect(session.startingCards.length).toBe(3);
		expect(session.remainingCards.length).toBe(3);
		expect(session.drawnCards.length).toBe(0);
		expect(
			session.startingCards.filter((card) => card.id === "c1"),
		).toHaveLength(2);
	});

	test("createSessionFromDeck skips stale card references", () => {
		const staleDeck: Deck = {
			id: "d2",
			name: "Missing Cards",
			cards: [
				{ cardId: "c1", quantity: 1 },
				{ cardId: "missing-card", quantity: 3 },
			],
		};

		const session = createSessionFromDeck(staleDeck, mockCards);

		expect(session.startingCards).toHaveLength(1);
		expect(session.remainingCards).toHaveLength(1);
		expect(session.startingCards[0]?.id).toBe("c1");
	});

	test("drawCard moves exactly one card from remaining to drawn", () => {
		let session = createSessionFromDeck(mockDeck, mockCards);

		const beforeInstanceIds = session.remainingCards.map(
			(card) => card.instanceId,
		);
		session = drawCard(session);

		expect(session.remainingCards).toHaveLength(2);
		expect(session.drawnCards).toHaveLength(1);
		expect(beforeInstanceIds).toContain(session.drawnCards[0]?.instanceId);
	});

	test("drawCard on empty deck does nothing", () => {
		let session = createSessionFromDeck(mockDeck, mockCards);

		session = drawCard(session);
		session = drawCard(session);
		session = drawCard(session);
		const snapshot = session;

		expect(session.remainingCards).toHaveLength(0);

		session = drawCard(session);

		expect(session).toEqual(snapshot);
		expect(session.drawnCards).toHaveLength(3);
	});

	test("resetSession restores all cards and clears draws", () => {
		let session = createSessionFromDeck(mockDeck, mockCards);

		session = drawCard(session);
		expect(session.drawnCards).toHaveLength(1);

		session = resetSession(session);

		expect(session.remainingCards).toHaveLength(3);
		expect(session.drawnCards).toHaveLength(0);
	});
});
