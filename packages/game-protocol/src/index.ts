import {
	cardSchema,
	deckSchema,
	gameModeSchema,
	gameSessionSchema,
} from "@game-companion/game-domain";
import { z } from "zod";

const roomIdSchema = z
	.string()
	.trim()
	.min(4)
	.max(12)
	.regex(/^[A-Z0-9]+$/);

const clientIdSchema = z.string().trim().min(1);

export const clientMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("room:create"),
		payload: z.object({
			name: z.string().trim().min(1).max(80),
			deck: deckSchema,
			cards: z.array(cardSchema),
			mode: gameModeSchema,
			roomId: roomIdSchema.optional(),
		}),
	}),
	z.object({
		type: z.literal("room:join"),
		payload: z.object({
			roomId: roomIdSchema,
		}),
	}),
	z.object({
		type: z.literal("room:leave"),
		payload: z.object({
			roomId: roomIdSchema,
		}),
	}),
	z.object({
		type: z.literal("session:draw"),
		payload: z.object({
			roomId: roomIdSchema,
		}),
	}),
	z.object({
		type: z.literal("session:reset"),
		payload: z.object({
			roomId: roomIdSchema,
		}),
	}),
	z.object({
		type: z.literal("ping"),
		payload: z.object({
			time: z.number(),
		}),
	}),
]);

export const roomStateSchema = z.object({
	roomId: roomIdSchema,
	name: z.string(),
	hostClientId: clientIdSchema,
	participantCount: z.number().int().nonnegative(),
	session: gameSessionSchema,
	deckSnapshot: deckSchema,
	updatedAt: z.number(),
});

export const serverMessageSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("connected"),
		payload: z.object({
			clientId: clientIdSchema,
		}),
	}),
	z.object({
		type: z.literal("room:state"),
		payload: roomStateSchema,
	}),
	z.object({
		type: z.literal("room:deleted"),
		payload: z.object({
			roomId: roomIdSchema,
		}),
	}),
	z.object({
		type: z.literal("error"),
		payload: z.object({
			message: z.string(),
			code: z
				.enum([
					"bad_request",
					"room_not_found",
					"room_exists",
					"invalid_deck",
					"internal_error",
				])
				.default("bad_request"),
		}),
	}),
	z.object({
		type: z.literal("pong"),
		payload: z.object({
			time: z.number(),
		}),
	}),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;
export type RoomState = z.infer<typeof roomStateSchema>;

export function parseClientMessage(input: unknown): ClientMessage {
	return clientMessageSchema.parse(input);
}

export function parseServerMessage(input: unknown): ServerMessage {
	return serverMessageSchema.parse(input);
}

export function safeParseClientMessage(input: unknown) {
	return clientMessageSchema.safeParse(input);
}

export function safeParseServerMessage(input: unknown) {
	return serverMessageSchema.safeParse(input);
}
