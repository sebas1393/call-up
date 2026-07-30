/**
 * Callup domain helpers (US-003a, US-004, US-006): threshold, DTOs, edit guards.
 */

import type { CallupStatus, CourtType } from "@/lib/constants/callup";
import { ErrorCode } from "@/lib/constants/error-codes";
import {
  getSubscribeEligibility,
  type SubscribeEligibility,
} from "@/lib/rules/subscribe-eligibility";
import { isMatchInPast, statusFromCapacity } from "@/lib/rules/callup-status";

export type CallupRow = {
  id: string;
  caller: string;
  court_id: string;
  court_type: CourtType;
  match_at: string;
  spots_quantity: number;
  wait_list: boolean;
  wait_list_threshold: number;
  payment_key: string;
  status: CallupStatus;
  created_at: string;
};

export type PlayerRow = {
  id: string;
  callup_id: string;
  name: string;
  has_payment: boolean;
  is_wait_list: boolean;
  user_id: string | null;
  created_at: string;
};

export type CourtEmbed = {
  id: string;
  name: string;
  address: string;
};

export type PlayerDto = {
  id: string;
  name: string;
  hasPayment: boolean;
  isWaitList: boolean;
  userId: string | null;
  createdAt: string;
};

export type CallupSummaryDto = {
  id: string;
  matchAt: string;
  status: CallupStatus;
  spotsQuantity: number;
  rosterCount: number;
  waitlistCount: number;
  courtName: string;
  courtAddress: string;
  paymentKey: string;
  subscribeEligibility: SubscribeEligibility;
};

export type CallupDetailDto = {
  id: string;
  /** Owner user id — used for admin gate (US-005); not PII. */
  callerId: string;
  status: CallupStatus;
  matchAt: string;
  courtType: CourtType;
  spotsQuantity: number;
  waitList: boolean;
  waitListThreshold: number;
  paymentKey: string;
  court: { id: string; name: string; address: string };
  rosterCount: number;
  waitlistCount: number;
  subscribeEligibility: SubscribeEligibility;
  players: PlayerDto[];
};

/**
 * Snapshot at create: floor(spotsQuantity / 2). Never recalculated on edit.
 */
export function computeWaitListThreshold(spotsQuantity: number): number {
  return Math.floor(spotsQuantity / 2);
}

/**
 * Counts roster vs waitlist players (waitlist excluded from roster).
 */
export function countPlayers(players: ReadonlyArray<{ is_wait_list: boolean }>): {
  rosterCount: number;
  waitlistCount: number;
} {
  let rosterCount = 0;
  let waitlistCount = 0;
  for (const p of players) {
    if (p.is_wait_list) waitlistCount += 1;
    else rosterCount += 1;
  }
  return { rosterCount, waitlistCount };
}

/**
 * Public player DTO — never includes email/phone.
 */
export function toPlayerDto(row: PlayerRow): PlayerDto {
  return {
    id: row.id,
    name: row.name,
    hasPayment: row.has_payment,
    isWaitList: row.is_wait_list,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

/**
 * Stable roster/waitlist order: enrollment time (`created_at` ASC), then id.
 * Payment / name edits MUST NOT change positions (spec US-005/009).
 */
export function sortPlayersByEnrollment<T extends { created_at: string; id: string }>(
  players: ReadonlyArray<T>,
): T[] {
  return players.slice().sort((a, b) => {
    const byTime = a.created_at.localeCompare(b.created_at);
    if (byTime !== 0) return byTime;
    return a.id.localeCompare(b.id);
  });
}

/**
 * List/summary DTO (mine / channel). No email/phone.
 */
export function toCallupSummaryDto(input: {
  callup: CallupRow;
  courtName: string;
  courtAddress?: string;
  rosterCount: number;
  waitlistCount: number;
}): CallupSummaryDto {
  const { callup, courtName, courtAddress, rosterCount, waitlistCount } = input;
  return {
    id: callup.id,
    matchAt: callup.match_at,
    status: callup.status,
    spotsQuantity: callup.spots_quantity,
    rosterCount,
    waitlistCount,
    courtName,
    courtAddress: courtAddress ?? "",
    paymentKey: callup.payment_key,
    subscribeEligibility: getSubscribeEligibility({
      spotsQuantity: callup.spots_quantity,
      rosterCount,
      waitList: callup.wait_list,
      waitListThreshold: callup.wait_list_threshold,
      waitlistCount,
      status: callup.status,
    }),
  };
}

/**
 * Detail DTO for GET /callups/{id}. Omits email/phone on nested objects.
 */
export function toCallupDetailDto(input: {
  callup: CallupRow;
  court: CourtEmbed;
  players: PlayerRow[];
}): CallupDetailDto {
  const { callup, court, players } = input;
  const ordered = sortPlayersByEnrollment(players);
  const { rosterCount, waitlistCount } = countPlayers(ordered);
  return {
    id: callup.id,
    callerId: callup.caller,
    status: callup.status,
    matchAt: callup.match_at,
    courtType: callup.court_type,
    spotsQuantity: callup.spots_quantity,
    waitList: callup.wait_list,
    waitListThreshold: callup.wait_list_threshold,
    paymentKey: callup.payment_key,
    court: {
      id: court.id,
      name: court.name,
      address: court.address,
    },
    rosterCount,
    waitlistCount,
    subscribeEligibility: getSubscribeEligibility({
      spotsQuantity: callup.spots_quantity,
      rosterCount,
      waitList: callup.wait_list,
      waitListThreshold: callup.wait_list_threshold,
      waitlistCount,
      status: callup.status,
    }),
    players: ordered.map(toPlayerDto),
  };
}

export type CallupEditDecision =
  | { ok: true }
  | {
      ok: false;
      status: 409;
      code: typeof ErrorCode.CALLUP_READ_ONLY;
      detail: string;
    };

/**
 * Edit allowed only while Open or Full (not cancelled / Closed).
 */
export function assertCallupEditable(status: CallupStatus): CallupEditDecision {
  if (status === "cancelled" || status === "Closed") {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.CALLUP_READ_ONLY,
      detail:
        status === "cancelled"
          ? "La convocatoria está cancelada y no se puede editar."
          : "La convocatoria está cerrada y no se puede editar.",
    };
  }
  return { ok: true };
}

export type SpotsDecision =
  | { ok: true }
  | {
      ok: false;
      status: 409;
      code: typeof ErrorCode.SPOTS_BELOW_ROSTER;
      detail: string;
    };

/**
 * spotsQuantity must be ≥ roster count (waitlist ignored).
 */
export function assertSpotsAboveRoster(
  spotsQuantity: number,
  rosterCount: number,
): SpotsDecision {
  if (spotsQuantity < rosterCount) {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.SPOTS_BELOW_ROSTER,
      detail: `Las plazas no pueden ser menores que los inscritos en nómina (${rosterCount}).`,
    };
  }
  return { ok: true };
}

export type MatchAtDecision =
  | { ok: true }
  | {
      ok: false;
      status: 400;
      code: typeof ErrorCode.VALIDATION_ERROR;
      detail: string;
    };

/**
 * Reject matchAt strictly in the past (absolute instant; Bogotá is display TZ).
 */
export function assertMatchAtNotPast(
  matchAt: Date | string,
  now: Date | string = new Date(),
): MatchAtDecision {
  if (isMatchInPast(matchAt, now)) {
    return {
      ok: false,
      status: 400,
      code: ErrorCode.VALIDATION_ERROR,
      detail: "La fecha del cotejo no puede estar en el pasado.",
    };
  }
  return { ok: true };
}

/**
 * Initial status after create given capacity (future match assumed).
 */
export function initialCallupStatus(capacity: {
  spotsQuantity: number;
  rosterCount: number;
  waitList: boolean;
  waitListThreshold: number;
  waitlistCount: number;
}): "Open" | "Full" {
  return statusFromCapacity(capacity);
}

export type CallupOwnerDecision =
  | { ok: true }
  | {
      ok: false;
      status: 403;
      code: typeof ErrorCode.FORBIDDEN;
      detail: string;
    };

/**
 * Only the callup owner (caller) may mutate via PUT/cancel/admin.
 */
export function assertCallupOwner(
  callerId: string,
  actorUserId: string,
): CallupOwnerDecision {
  if (callerId !== actorUserId) {
    return {
      ok: false,
      status: 403,
      code: ErrorCode.FORBIDDEN,
      detail: "Solo el dueño de la convocatoria puede modificarla.",
    };
  }
  return { ok: true };
}
