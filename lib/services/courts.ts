/**
 * Court domain helpers (US-003b): normalize name, DTO mapping, ownership.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type CourtRow = {
  id: string;
  name: string;
  address: string;
  created_by: string;
};

export type CourtDto = {
  id: string;
  name: string;
  address: string;
  createdBy: string;
};

/**
 * Normalizes court name for storage/uniqueness: trim, collapse spaces, UPPERCASE.
 *
 * @param name - Raw court name from client
 * @returns Normalized name
 */
export function normalizeCourtName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Maps a DB court row to API camelCase DTO.
 */
export function toCourtDto(row: CourtRow): CourtDto {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    createdBy: row.created_by,
  };
}

/**
 * Ensures caller_courts row exists (idempotent). Uses INSERT + ignore unique
 * conflict so RLS does not require UPDATE (upsert ON CONFLICT UPDATE fails without it).
 */
export async function ensureCallerCourtLink(
  supabase: SupabaseClient,
  callerUserId: string,
  courtId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("caller_courts").insert({
    caller_user_id: callerUserId,
    court_id: courtId,
  });

  if (error && error.code !== "23505") {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export type CourtOwnerDecision =
  | { ok: true }
  | {
      ok: false;
      status: 403;
      code: "NOT_COURT_OWNER";
      detail: string;
    };

/**
 * Only `createdBy` may edit name/address.
 */
export function assertCourtOwner(
  createdBy: string,
  actorUserId: string,
): CourtOwnerDecision {
  if (createdBy !== actorUserId) {
    return {
      ok: false,
      status: 403,
      code: "NOT_COURT_OWNER",
      detail: "Solo el creador de la cancha puede editarla.",
    };
  }
  return { ok: true };
}
