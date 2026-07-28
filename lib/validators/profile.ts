import { z } from "zod";

import {
  PHONE_LENGTH,
  PHONE_PATTERN,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/constants/callup";

/**
 * Profile PATCH body: editable name + phone (not username).
 */
export const patchMeBodySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(100),
  phone: z
    .string()
    .regex(
      PHONE_PATTERN,
      `El teléfono debe tener exactamente ${PHONE_LENGTH} dígitos.`,
    ),
});

export type PatchMeBody = z.infer<typeof patchMeBodySchema>;

/**
 * Caller username set-once body.
 */
export const usernameBodySchema = z.object({
  userName: z
    .string()
    .trim()
    .toLowerCase()
    .min(USERNAME_MIN_LENGTH)
    .max(USERNAME_MAX_LENGTH)
    .regex(
      USERNAME_PATTERN,
      "Usuario inválido: usa a-z, 0-9 y guiones (5-10).",
    ),
});

export type UsernameBody = z.infer<typeof usernameBodySchema>;
