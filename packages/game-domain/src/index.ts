import { z } from "zod";

export const raritySchema = z.enum(["common", "rare", "epic", "legendary"]);
export const gameModeSchema = z.enum(["deck", "chaotic"]);

export const cardSchema = z.object({
	id: z.string().trim().min(1),
	name: z.string().trim().min(1),
	effect: z.string(),
	rarity: raritySchema,
	iconId: z.string().trim().min(1),
});

export const deckCardSchema = z.object({
	cardId: z.string().trim().min(1),
	quantity: z.number().int().positive(),
});

export const deckSchema = z.object({
	id: z.string().trim().min(1),
	name: z.string().trim().min(1),
	cards: z.array(deckCardSchema),
});

export const playCardSchema = cardSchema.extend({
	instanceId: z.string().trim().min(1),
});

export const gameSessionSchema = z.object({
	deckId: z.string().trim().min(1),
	mode: gameModeSchema,
	startingCards: z.array(playCardSchema),
	remainingCards: z.array(playCardSchema),
	drawnCards: z.array(playCardSchema),
});

export type Rarity = z.infer<typeof raritySchema>;
export type GameMode = z.infer<typeof gameModeSchema>;
export type Card = z.infer<typeof cardSchema>;
export type DeckCard = z.infer<typeof deckCardSchema>;
export type Deck = z.infer<typeof deckSchema>;
export type PlayCard = z.infer<typeof playCardSchema>;
export type GameSession = z.infer<typeof gameSessionSchema>;

function randomToken() {
	return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createInstanceId(cardId: string, copyIndex: number) {
	return `${cardId}-${copyIndex}-${randomToken()}`;
}

export function shuffleCards(cards: PlayCard[]): PlayCard[] {
	const result = [...cards];

	for (let index = result.length - 1; index > 0; index -= 1) {
		const swapIndex = Math.floor(Math.random() * (index + 1));
		[result[index], result[swapIndex]] = [result[swapIndex], result[index]];
	}

	return result;
}

export function createSessionFromDeck(
	deck: Deck,
	cards: Card[],
	mode: GameMode = "deck",
): GameSession {
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
		mode,
		startingCards,
		remainingCards: shuffleCards(startingCards),
		drawnCards: [],
	};
}

export function drawCard(session: GameSession): GameSession {
	if (session.mode === "chaotic") {
		if (session.startingCards.length === 0) {
			return session;
		}

		const randomIndex = Math.floor(
			Math.random() * session.startingCards.length,
		);
		const baseCard = session.startingCards[randomIndex];

		if (!baseCard) {
			return session;
		}

		const nextDrawn: PlayCard = {
			...baseCard,
			instanceId: createInstanceId(baseCard.id, session.drawnCards.length),
		};

		return {
			...session,
			drawnCards: [nextDrawn, ...session.drawnCards],
		};
	}

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

export type Room = {
	id: string;
	name: string;
	hostClientId: string;
	createdAt: number;
	updatedAt: number;
	deckSnapshot: Deck;
	cardsSnapshot: Card[];
	session: GameSession;
	participants: Record<string, { clientId: string; joinedAt: number }>;
};

export function createRoom(params: {
	roomId: string;
	name: string;
	hostClientId: string;
	deck: Deck;
	cards: Card[];
	mode: GameMode;
	now?: number;
}): Room {
	const now = params.now ?? Date.now();
	const deckSnapshot = deckSchema.parse(params.deck);
	const cardsSnapshot = z.array(cardSchema).parse(params.cards);
	const session = createSessionFromDeck(
		deckSnapshot,
		cardsSnapshot,
		params.mode,
	);

	return {
		id: params.roomId,
		name: params.name,
		hostClientId: params.hostClientId,
		createdAt: now,
		updatedAt: now,
		deckSnapshot,
		cardsSnapshot,
		session,
		participants: {
			[params.hostClientId]: {
				clientId: params.hostClientId,
				joinedAt: now,
			},
		},
	};
}

export function joinRoom(room: Room, clientId: string, now = Date.now()): Room {
	if (room.participants[clientId]) {
		return room;
	}

	return {
		...room,
		updatedAt: now,
		participants: {
			...room.participants,
			[clientId]: {
				clientId,
				joinedAt: now,
			},
		},
	};
}

export function leaveRoom(
	room: Room,
	clientId: string,
	now = Date.now(),
): Room {
	if (!room.participants[clientId]) {
		return room;
	}

	const participants = { ...room.participants };
	delete participants[clientId];

	return {
		...room,
		updatedAt: now,
		participants,
	};
}

export function drawFromRoom(room: Room, now = Date.now()): Room {
	return {
		...room,
		updatedAt: now,
		session: drawCard(room.session),
	};
}

export function resetRoom(room: Room, now = Date.now()): Room {
	return {
		...room,
		updatedAt: now,
		session: resetSession(room.session),
	};
}

export function getParticipantCount(room: Room): number {
	return Object.keys(room.participants).length;
}
