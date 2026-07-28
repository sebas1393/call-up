import { ErrorCode } from "@/lib/constants/error-codes";

/** Waitlisted player row for promote race (FIFO by createdAt). */
export type PromoteCandidate = {
  id: string;
  createdAt: Date | string;
};

export type PromoteRaceResult =
  | { ok: true; winnerId: string }
  | { ok: false; code: typeof ErrorCode.SPOT_TAKEN_FIFO; winnerId: string };

/**
 * Resolves concurrent self-promote race for the last roster spot.
 * Winner = earliest `createdAt` (FIFO). Others should get `SPOT_TAKEN_FIFO`.
 *
 * @param candidates - Waitlisted players attempting promote (must be non-empty)
 * @param requestingPlayerId - Player id of the request being evaluated
 * @returns Whether this request wins the spot
 */
export function resolvePromoteRace(
  candidates: PromoteCandidate[],
  requestingPlayerId: string,
): PromoteRaceResult {
  if (candidates.length === 0) {
    throw new Error("resolvePromoteRace requires at least one candidate");
  }

  const sorted = [...candidates].sort((a, b) => {
    const ta = toTime(a.createdAt);
    const tb = toTime(b.createdAt);
    if (ta !== tb) return ta - tb;
    return a.id.localeCompare(b.id);
  });

  const winnerId = sorted[0].id;

  if (requestingPlayerId === winnerId) {
    return { ok: true, winnerId };
  }

  return {
    ok: false,
    code: ErrorCode.SPOT_TAKEN_FIFO,
    winnerId,
  };
}

/**
 * Result shape after a successful promote (waitlist → roster).
 */
export type PromoteSuccessFields = {
  isWaitList: false;
  hasPayment: false;
};

/**
 * Fields to apply when promoting waitlist → roster (spec US-009).
 */
export function promoteSuccessFields(): PromoteSuccessFields {
  return { isWaitList: false, hasPayment: false };
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}
