/** @vitest-environment jsdom */

import { beforeEach, describe, expect, test } from "vitest";

import {
	type Card,
	type Deck,
	type GameSession,
	getCards,
	getDecks,
	getSession,
	StorageKeys,
	saveCards,
	saveDecks,
	saveSession,
	syncCardInSession,
} from "./storage";

type LocalStorageMock = {
	getItem: (key: string) => string | null;
	setItem: (key: string, value: string) => void;
	removeItem: (key: string) => void;
	clear: () => void;
};

function createLocalStorageMock(): LocalStorageMock {
	const values = new Map<string, string>();

	return {
		getItem(key) {
			return values.has(key) ? (values.get(key) ?? null) : null;
		},
		setItem(key, value) {
			values.set(key, value);
		},
		removeItem(key) {
			values.delete(key);
		},
		clear() {
			values.clear();
		},
	};
}

describe("storage", () => {
	beforeEach(() => {
		Object.defineProperty(window, "localStorage", {
			value: createLocalStorageMock(),
			configurable: true,
		});

		window.localStorage.clear();
	});

	test("returns safe defaults for empty storage", () => {
		expect(getCards()).toEqual([]);
		expect(getDecks()).toEqual([]);
		expect(getSession()).toBeNull();
	});

	test("round-trips valid card, deck, and session data", () => {
		const cards: Card[] = [
			{
				id: "card-1",
				name: "Shield",
				effect: "Block the next hit.",
				rarity: "rare",
				iconId: "GiCheckedShield",
			},
		];

		const decks: Deck[] = [
			{
				id: "deck-1",
				name: "Starter Deck",
				cards: [{ cardId: "card-1", quantity: 2 }],
			},
		];

		const session: GameSession = {
			deckId: "deck-1",
			startingCards: [
				{
					...cards[0],
					instanceId: "instance-1",
				},
			],
			remainingCards: [
				{
					...cards[0],
					instanceId: "instance-1",
				},
			],
			drawnCards: [],
		};

		saveCards(cards);
		saveDecks(decks);
		saveSession(session);

		expect(getCards()).toEqual(cards);
		expect(getDecks()).toEqual(decks);
		expect(getSession()).toEqual(session);
	});

	test("drops malformed json safely", () => {
		window.localStorage.setItem(StorageKeys.CARDS, "{bad json");
		window.localStorage.setItem(StorageKeys.DECKS, "null");
		window.localStorage.setItem(StorageKeys.SESSION, '"oops"');

		expect(getCards()).toEqual([]);
		expect(getDecks()).toEqual([]);
		expect(getSession()).toBeNull();
	});

	test("filters malformed records instead of crashing", () => {
		window.localStorage.setItem(
			StorageKeys.CARDS,
			JSON.stringify([
				{
					id: "card-1",
					name: "Bomb",
					effect: "Explode.",
					rarity: "epic",
					iconId: "GiFireball",
				},
				{
					id: "",
					name: "Bad Card",
					effect: "Bad",
					rarity: "legendary",
					iconId: "GiFireball",
				},
			]),
		);

		window.localStorage.setItem(
			StorageKeys.DECKS,
			JSON.stringify([
				{
					id: "deck-1",
					name: "Good Deck",
					cards: [{ cardId: "card-1", quantity: 2 }],
				},
				{
					id: "deck-2",
					name: "Bad Deck",
					cards: [{ cardId: "card-1", quantity: 0 }],
				},
			]),
		);

		expect(getCards()).toHaveLength(1);
		expect(getDecks()).toHaveLength(1);
		expect(getDecks()[0]?.name).toBe("Good Deck");
	});

	test("syncCardInSession updates matching cards across all session zones", () => {
		const updatedCard: Card = {
			id: "card-1",
			name: "Super Shield",
			effect: "Block everything.",
			rarity: "legendary",
			iconId: "GiWingedShield",
		};

		const session: GameSession = {
			deckId: "deck-1",
			startingCards: [
				{
					id: "card-1",
					name: "Shield",
					effect: "Block the next hit.",
					rarity: "rare",
					iconId: "GiCheckedShield",
					instanceId: "start-1",
				},
			],
			remainingCards: [
				{
					id: "card-1",
					name: "Shield",
					effect: "Block the next hit.",
					rarity: "rare",
					iconId: "GiCheckedShield",
					instanceId: "remain-1",
				},
			],
			drawnCards: [
				{
					id: "card-1",
					name: "Shield",
					effect: "Block the next hit.",
					rarity: "rare",
					iconId: "GiCheckedShield",
					instanceId: "drawn-1",
				},
			],
		};

		const syncedSession = syncCardInSession(session, updatedCard);

		expect(syncedSession.startingCards[0]).toMatchObject(updatedCard);
		expect(syncedSession.remainingCards[0]).toMatchObject(updatedCard);
		expect(syncedSession.drawnCards[0]).toMatchObject(updatedCard);
		expect(syncedSession.drawnCards[0]?.instanceId).toBe("drawn-1");
	});
});
