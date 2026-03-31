import { describe, expect, test } from "vitest";

import {
	type Card,
	createRoom,
	createSessionFromDeck,
	type Deck,
	drawCard,
	drawFromRoom,
	getParticipantCount,
	joinRoom,
	leaveRoom,
	resetRoom,
} from "../src/index";

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

describe("game-domain", () => {
	test("createSessionFromDeck initializes correctly", () => {
		const session = createSessionFromDeck(mockDeck, mockCards);

		expect(session.deckId).toBe("d1");
		expect(session.mode).toBe("deck");
		expect(session.startingCards).toHaveLength(3);
		expect(session.remainingCards).toHaveLength(3);
		expect(session.drawnCards).toHaveLength(0);
	});

	test("drawCard in chaotic mode keeps remaining deck intact", () => {
		const session = createSessionFromDeck(mockDeck, mockCards, "chaotic");
		const next = drawCard(session);

		expect(next.remainingCards).toHaveLength(session.remainingCards.length);
		expect(next.drawnCards).toHaveLength(1);
	});

	test("room lifecycle preserves deck snapshot and authority updates", () => {
		const room = createRoom({
			roomId: "ABC123",
			name: "Night Match",
			hostClientId: "host-1",
			deck: mockDeck,
			cards: mockCards,
			mode: "deck",
			now: 1,
		});

		expect(room.deckSnapshot.name).toBe("My Deck");
		expect(getParticipantCount(room)).toBe(1);

		const joined = joinRoom(room, "client-2", 2);
		expect(getParticipantCount(joined)).toBe(2);

		const drawn = drawFromRoom(joined, 3);
		expect(drawn.session.drawnCards).toHaveLength(1);

		const reset = resetRoom(drawn, 4);
		expect(reset.session.drawnCards).toHaveLength(0);

		const left = leaveRoom(reset, "client-2", 5);
		expect(getParticipantCount(left)).toBe(1);
	});
});
