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
		expect(session.mode).toBe("deck");
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
		let session = createSessionFromDeck(mockDeck, mockCards, "chaotic");

		session = drawCard(session);
		expect(session.drawnCards).toHaveLength(1);
		expect(session.mode).toBe("chaotic");

		session = resetSession(session);

		expect(session.remainingCards).toHaveLength(3);
		expect(session.drawnCards).toHaveLength(0);
		expect(session.mode).toBe("chaotic");
	});

	test("createSessionFromDeck initializes correctly in chaotic mode", () => {
		const session = createSessionFromDeck(mockDeck, mockCards, "chaotic");

		expect(session.deckId).toBe("d1");
		expect(session.mode).toBe("chaotic");
		expect(session.startingCards.length).toBe(3);
		expect(session.remainingCards.length).toBe(3);
		expect(session.drawnCards.length).toBe(0);
	});

	test("drawCard in chaotic mode does not remove from remaining pool", () => {
		let session = createSessionFromDeck(mockDeck, mockCards, "chaotic");

		session = drawCard(session);

		expect(session.remainingCards).toHaveLength(3);
		expect(session.drawnCards).toHaveLength(1);

		const drawnCardId = session.drawnCards[0]?.id;
		expect(["c1", "c2"]).toContain(drawnCardId);

		const originalInstanceIds = session.startingCards.map((c) => c.instanceId);
		expect(originalInstanceIds).not.toContain(
			session.drawnCards[0]?.instanceId,
		);
	});

	test("drawCard on empty starting cards in chaotic mode does nothing", () => {
		const emptyDeck: Deck = { id: "d3", name: "Empty", cards: [] };
		let session = createSessionFromDeck(emptyDeck, mockCards, "chaotic");

		const snapshot = session;
		session = drawCard(session);

		expect(session).toEqual(snapshot);
	});
});
