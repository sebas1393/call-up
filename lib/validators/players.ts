import { z } from "zod";

const PLAYER_NAME_MAX = 100;

/**
 * POST .../players/subscribe
 */
export const subscribeBodySchema = z.object({
  acceptWaitlist: z.boolean().default(false),
});

export type SubscribeBody = z.infer<typeof subscribeBodySchema>;

/**
 * POST .../players/guests (Crear Jugador)
 */
export const createGuestBodySchema = z.object({
  guestName: z.string().min(1).max(PLAYER_NAME_MAX),
  acceptWaitlist: z.boolean().default(false),
  hasPayment: z.boolean().default(false),
});

export type CreateGuestBody = z.infer<typeof createGuestBodySchema>;

/**
 * PATCH .../players/{playerId} — name only (owner).
 */
export const patchPlayerNameBodySchema = z.object({
  name: z.string().trim().min(1).max(PLAYER_NAME_MAX),
});

export type PatchPlayerNameBody = z.infer<typeof patchPlayerNameBodySchema>;

/**
 * PATCH .../players/{playerId}/payment
 */
export const patchPaymentBodySchema = z.object({
  hasPayment: z.boolean(),
});

export type PatchPaymentBody = z.infer<typeof patchPaymentBodySchema>;
