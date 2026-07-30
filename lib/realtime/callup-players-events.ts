/**
 * Pure helpers for callup Realtime (spec §11) — unit-testable without a live socket.
 */

export type PlayersChangePayload = {
  eventType?: string;
  new?: { callup_id?: string | null; id?: string | null } | null;
  old?: { callup_id?: string | null; id?: string | null } | null;
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
 * True when the change belongs to one of the callups currently on screen.
 */
export function isPlayersChangeForCallups(
  payload: PlayersChangePayload,
  callupIds: readonly string[],
): boolean {
  const id = callupIdFromPlayersChange(payload);
  if (!id) return false;
  return callupIds.includes(id);
}
