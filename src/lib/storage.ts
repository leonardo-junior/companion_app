import { GAME_ICONS, type GameIconId } from "./icons";

export type Rarity = "common" | "rare" | "epic" | "legendary";

export interface Card {
	id: string;
	name: string;
	effect: string;
	rarity: Rarity;
	iconId: GameIconId;
}

export interface DeckCard {
	cardId: string;
	quantity: number;
}

export interface Deck {
	id: string;
	name: string;
	cards: DeckCard[];
}

export interface PlayCard extends Card {
	instanceId: string;
}

export interface GameSession {
	deckId: string;
	startingCards: PlayCard[];
	remainingCards: PlayCard[];
	drawnCards: PlayCard[];
}

function syncPlayCard(playCard: PlayCard, card: Card): PlayCard {
	if (playCard.id !== card.id) {
		return playCard;
	}

	return {
		...playCard,
		name: card.name,
		effect: card.effect,
		rarity: card.rarity,
		iconId: card.iconId,
	};
}

export const StorageKeys = {
	CARDS: "gc.cards.v1",
	DECKS: "gc.decks.v1",
	SESSION: "gc.session.v1",
} as const;

const iconIds = new Set<string>(GAME_ICONS);

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function isRarity(value: unknown): value is Rarity {
	return (
		value === "common" ||
		value === "rare" ||
		value === "epic" ||
		value === "legendary"
	);
}

function asNonEmptyString(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}

	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

function sanitizeIconId(value: unknown): GameIconId | null {
	if (typeof value !== "string" || !iconIds.has(value)) {
		return null;
	}

	return value as GameIconId;
}

function sanitizeCard(value: unknown): Card | null {
	if (!isObject(value)) {
		return null;
	}

	const id = asNonEmptyString(value.id);
	const name = asNonEmptyString(value.name);
	const rarity = isRarity(value.rarity) ? value.rarity : null;
	const iconId = sanitizeIconId(value.iconId);

	if (!id || !name || !rarity || !iconId || typeof value.effect !== "string") {
		return null;
	}

	return {
		id,
		name,
		effect: value.effect.trim(),
		rarity,
		iconId,
	};
}

function sanitizeDeckCard(value: unknown): DeckCard | null {
	if (!isObject(value)) {
		return null;
	}

	const cardId = asNonEmptyString(value.cardId);
	const quantity =
		typeof value.quantity === "number" && Number.isInteger(value.quantity)
			? value.quantity
			: null;

	if (!cardId || quantity === null || quantity <= 0) {
		return null;
	}

	return {
		cardId,
		quantity,
	};
}

function sanitizeDeck(value: unknown): Deck | null {
	if (!isObject(value) || !Array.isArray(value.cards)) {
		return null;
	}

	const id = asNonEmptyString(value.id);
	const name = asNonEmptyString(value.name);
	const cards = value.cards
		.map((entry) => sanitizeDeckCard(entry))
		.filter((entry): entry is DeckCard => entry !== null);

	if (!id || !name || cards.length === 0) {
		return null;
	}

	return {
		id,
		name,
		cards,
	};
}

function sanitizePlayCard(value: unknown): PlayCard | null {
	if (!isObject(value)) {
		return null;
	}

	const baseCard = sanitizeCard(value);
	const instanceId = asNonEmptyString(value.instanceId);

	if (!baseCard || !instanceId) {
		return null;
	}

	return {
		...baseCard,
		instanceId,
	};
}

function sanitizePlayCards(value: unknown): PlayCard[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value
		.map((entry) => sanitizePlayCard(entry))
		.filter((entry): entry is PlayCard => entry !== null);
}

function sanitizeSession(value: unknown): GameSession | null {
	if (!isObject(value)) {
		return null;
	}

	const deckId = asNonEmptyString(value.deckId);
	const startingCards = sanitizePlayCards(value.startingCards);
	const remainingCards = sanitizePlayCards(value.remainingCards);
	const drawnCards = sanitizePlayCards(value.drawnCards);

	if (!deckId) {
		return null;
	}

	return {
		deckId,
		startingCards,
		remainingCards,
		drawnCards,
	};
}

function readJson(key: string): unknown {
	if (typeof window === "undefined") {
		return null;
	}

	try {
		const rawValue = window.localStorage.getItem(key);
		return rawValue ? JSON.parse(rawValue) : null;
	} catch {
		return null;
	}
}

function writeJson(key: string, value: unknown) {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.localStorage.setItem(key, JSON.stringify(value));
	} catch {}
}

export function getCards(): Card[] {
	const parsed = readJson(StorageKeys.CARDS);

	if (!Array.isArray(parsed)) {
		return [];
	}

	return parsed
		.map((entry) => sanitizeCard(entry))
		.filter((entry): entry is Card => entry !== null);
}

export function saveCards(cards: Card[]) {
	writeJson(StorageKeys.CARDS, cards);
}

export function getDecks(): Deck[] {
	const parsed = readJson(StorageKeys.DECKS);

	if (!Array.isArray(parsed)) {
		return [];
	}

	return parsed
		.map((entry) => sanitizeDeck(entry))
		.filter((entry): entry is Deck => entry !== null);
}

export function saveDecks(decks: Deck[]) {
	writeJson(StorageKeys.DECKS, decks);
}

export function getSession(): GameSession | null {
	return sanitizeSession(readJson(StorageKeys.SESSION));
}

export function saveSession(session: GameSession | null) {
	writeJson(StorageKeys.SESSION, session);
}

export function syncCardInSession(
	session: GameSession,
	card: Card,
): GameSession {
	return {
		...session,
		startingCards: session.startingCards.map((playCard) =>
			syncPlayCard(playCard, card),
		),
		remainingCards: session.remainingCards.map((playCard) =>
			syncPlayCard(playCard, card),
		),
		drawnCards: session.drawnCards.map((playCard) =>
			syncPlayCard(playCard, card),
		),
	};
}

export function syncStoredSessionCard(card: Card) {
	const session = getSession();

	if (!session) {
		return;
	}

	saveSession(syncCardInSession(session, card));
}
