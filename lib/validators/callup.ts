import { z } from "zod";

import {
  CALLUP_STATUSES,
  COURT_ADDRESS_MAX_LENGTH,
  COURT_NAME_MAX_LENGTH,
  COURT_SEARCH_MIN_LENGTH,
  COURT_TYPES,
  DEFAULT_SPOTS_BY_COURT_TYPE,
  PAYMENT_KEY_MAX_LENGTH,
  PAYMENT_KEY_PATTERN,
  SPOTS_QUANTITY_MAX,
  SPOTS_QUANTITY_MIN,
} from "@/lib/constants/callup";

/**
 * Payment key (llave): max 50, no whitespace, email-allowed charset.
 */
export const paymentKeySchema = z
  .string()
  .trim()
  .min(1, "La llave es obligatoria.")
  .max(PAYMENT_KEY_MAX_LENGTH)
  .regex(PAYMENT_KEY_PATTERN, "La llave contiene caracteres no permitidos.")
  .refine((v) => !/\s/.test(v), "La llave no puede tener espacios.");

export const courtTypeSchema = z.enum(COURT_TYPES);

export const spotsQuantitySchema = z
  .number()
  .int()
  .min(SPOTS_QUANTITY_MIN)
  .max(SPOTS_QUANTITY_MAX);

/**
 * Default plazas by court type (F5=10, F6=12).
 */
export function defaultSpotsForCourtType(
  courtType: z.infer<typeof courtTypeSchema>,
): number {
  return DEFAULT_SPOTS_BY_COURT_TYPE[courtType];
}

/**
 * Court search query: required, min length 3.
 */
export const courtSearchQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(
      COURT_SEARCH_MIN_LENGTH,
      `La búsqueda debe tener al menos ${COURT_SEARCH_MIN_LENGTH} caracteres.`,
    ),
});

export type CourtSearchQuery = z.infer<typeof courtSearchQuerySchema>;

/**
 * Create court body.
 */
export const createCourtBodySchema = z.object({
  name: z.string().trim().min(1).max(COURT_NAME_MAX_LENGTH),
  address: z.string().trim().min(1).max(COURT_ADDRESS_MAX_LENGTH),
});

export type CreateCourtBody = z.infer<typeof createCourtBodySchema>;

/**
 * Create callup body (US-003a).
 */
export const createCallupBodySchema = z.object({
  courtId: z.string().uuid(),
  courtType: courtTypeSchema,
  spotsQuantity: spotsQuantitySchema,
  waitList: z.boolean(),
  matchAt: z.string().datetime({ offset: true }),
  paymentKey: paymentKeySchema,
  subscribeMyself: z.boolean().default(false),
});

export type CreateCallupBody = z.infer<typeof createCallupBodySchema>;

/**
 * Edit callup body (US-006) — waitList is immutable after create (not in schema).
 */
export const updateCallupBodySchema = z.object({
  courtId: z.string().uuid(),
  courtType: courtTypeSchema,
  spotsQuantity: spotsQuantitySchema,
  matchAt: z.string().datetime({ offset: true }),
  paymentKey: paymentKeySchema,
});

export type UpdateCallupBody = z.infer<typeof updateCallupBodySchema>;

export const callupStatusSchema = z.enum(CALLUP_STATUSES);
