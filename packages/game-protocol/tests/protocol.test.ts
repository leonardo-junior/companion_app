import { describe, expect, test } from "vitest";

import {
	parseClientMessage,
	parseServerMessage,
	safeParseClientMessage,
} from "../src/index";

describe("game-protocol", () => {
	test("parses valid room:create client message", () => {
		const parsed = parseClientMessage({
			type: "room:create",
			payload: {
				name: "My Room",
				mode: "deck",
				deck: {
					id: "d1",
					name: "Deck",
					cards: [{ cardId: "c1", quantity: 1 }],
				},
				cards: [
					{
						id: "c1",
						name: "Card",
						effect: "Do thing",
						rarity: "common",
						iconId: "GiAxeSword",
					},
				],
			},
		});

		expect(parsed.type).toBe("room:create");
		if (parsed.type !== "room:create") {
			throw new Error("unexpected message type");
		}
		expect(parsed.payload.mode).toBe("deck");
	});

	test("rejects malformed room code", () => {
		const parsed = safeParseClientMessage({
			type: "room:join",
			payload: {
				roomId: "bad-code",
			},
		});

		expect(parsed.success).toBe(false);
	});

	test("parses room state server event", () => {
		const parsed = parseServerMessage({
			type: "room:state",
			payload: {
				roomId: "ABCD12",
				name: "Match",
				hostClientId: "host-1",
				participantCount: 2,
				updatedAt: Date.now(),
				deckSnapshot: {
					id: "d1",
					name: "Deck",
					cards: [{ cardId: "c1", quantity: 1 }],
				},
				session: {
					deckId: "d1",
					mode: "deck",
					startingCards: [
						{
							id: "c1",
							name: "Card",
							effect: "Do thing",
							rarity: "common",
							iconId: "GiAxeSword",
							instanceId: "c1-0-x",
						},
					],
					remainingCards: [],
					drawnCards: [],
				},
			},
		});

		expect(parsed.type).toBe("room:state");
		if (parsed.type !== "room:state") {
			throw new Error("unexpected message type");
		}
		expect(parsed.payload.roomId).toBe("ABCD12");
	});
});
