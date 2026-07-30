/**
 * Pure helpers for callup Realtime (spec §11) — unit-testable without a live socket.
 */

export type PlayersChangePayload = {
  eventType?: string;
  new?: { callup_id?: string | null; id?: string | null } | null;
  old?: { callup_id?: string | null; id?: string | null } | null;
};

export type CallupsChangePayload = {
  eventType?: string;
  new?: { id?: string | null; status?: string | null } | null;
  old?: { id?: string | null; status?: string | null } | null;
};

/**
 * Extracts callup_id from a players postgres_changes payload (insert/update/delete).
 */
export function callupIdFromPlayersChange(
  payload: PlayersChangePayload,
): string | null {
  const fromNew = payload.new?.callup_id;
  if (typeof fromNew === "string" && fromNew.length > 0) return fromNew;
  const fromOld = payload.old?.callup_id;
  if (typeof fromOld === "string" && fromOld.length > 0) return fromOld;
  return null;
}

/**
 * True when the players change belongs to one of the callups currently on screen.
 * DELETE with default REPLICA IDENTITY often omits callup_id on `old` — in that
 * case refetch when we have any watched ids (avoids missing admin removals).
 */
export function isPlayersChangeForCallups(
  payload: PlayersChangePayload,
  callupIds: readonly string[],
): boolean {
  if (callupIds.length === 0) return false;
  const id = callupIdFromPlayersChange(payload);
  if (id) return callupIds.includes(id);
  const event = payload.eventType?.toUpperCase();
  if (event === "DELETE") return true;
  return false;
}

/**
 * Extracts callup id from a callups postgres_changes payload (status / spots, etc.).
 */
export function callupIdFromCallupsChange(
  payload: CallupsChangePayload,
): string | null {
  const fromNew = payload.new?.id;
  if (typeof fromNew === "string" && fromNew.length > 0) return fromNew;
  const fromOld = payload.old?.id;
  if (typeof fromOld === "string" && fromOld.length > 0) return fromOld;
  return null;
}

/**
 * True when a callups row change is for an on-screen callup (live status / counts).
 */
export function isCallupsChangeForCallups(
  payload: CallupsChangePayload,
  callupIds: readonly string[],
): boolean {
  if (callupIds.length === 0) return false;
  const id = callupIdFromCallupsChange(payload);
  if (id) return callupIds.includes(id);
  const event = payload.eventType?.toUpperCase();
  if (event === "DELETE") return true;
  return false;
}
