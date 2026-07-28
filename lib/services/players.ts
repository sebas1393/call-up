/**
 * Player / roster / waitlist decisions (US-005, US-009).
 * Notify hooks are injectable so claim-no-notify and promote paths are unit-testable.
 */

import { ErrorCode } from "@/lib/constants/error-codes";
import type { CallupStatus } from "@/lib/constants/callup";
import { resolveClaim, type ClaimCandidate } from "@/lib/rules/claim";
import {
  promoteSuccessFields,
  resolvePromoteRace,
  type PromoteCandidate,
} from "@/lib/rules/promote";
import { normalizePlayerName, playerNamesMatch } from "@/lib/rules/player-name";
import {
  getSubscribeEligibility,
  type SubscribeEligibilityInput,
} from "@/lib/rules/subscribe-eligibility";
import { toPlayerDto, type PlayerDto, type PlayerRow } from "@/lib/services/callups";

export type ChannelEvent =
  | "subscribe"
  | "unsubscribe"
  | "promote"
  | "plaza_libre"
  | "payment";

export type ChannelNotify = (event: ChannelEvent) => void;

/** Display name for storage: trim + collapse spaces (case preserved). */
export function formatPlayerDisplayName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

export type ChurnGuardDecision =
  | { ok: true }
  | {
      ok: false;
      status: 409;
      code: typeof ErrorCode.CALLUP_READ_ONLY;
      detail: string;
    };

/**
 * Subscribe / guest / unsubscribe / delete / promote / rename blocked on cancelled|Closed.
 */
export function assertChurnMutationAllowed(
  status: CallupStatus,
): ChurnGuardDecision {
  if (status === "cancelled" || status === "Closed") {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.CALLUP_READ_ONLY,
      detail:
        status === "cancelled"
          ? "La convocatoria está cancelada."
          : "La convocatoria está cerrada.",
    };
  }
  return { ok: true };
}

/**
 * Payment toggles allowed on Closed; blocked on cancelled.
 */
export function assertPaymentMutationAllowed(
  status: CallupStatus,
): ChurnGuardDecision {
  if (status === "cancelled") {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.CALLUP_READ_ONLY,
      detail: "La convocatoria está cancelada.",
    };
  }
  return { ok: true };
}

export type PaymentAuthDecision =
  | { ok: true }
  | {
      ok: false;
      status: 403;
      code: typeof ErrorCode.FORBIDDEN;
      detail: string;
    };

/**
 * Guest (`userId` null) → owner only. Registered row → self or owner.
 */
export function assertPaymentAllowed(input: {
  actorUserId: string;
  callupCallerId: string;
  playerUserId: string | null;
}): PaymentAuthDecision {
  const isOwner = input.actorUserId === input.callupCallerId;
  if (input.playerUserId == null) {
    if (!isOwner) {
      return {
        ok: false,
        status: 403,
        code: ErrorCode.FORBIDDEN,
        detail: "Solo el caller puede marcar el pago de un invitado.",
      };
    }
    return { ok: true };
  }
  if (isOwner || input.actorUserId === input.playerUserId) {
    return { ok: true };
  }
  return {
    ok: false,
    status: 403,
    code: ErrorCode.FORBIDDEN,
    detail: "Solo el jugador o el caller pueden marcar este pago.",
  };
}

export type PromoteAuthDecision =
  | { ok: true; mode: "owner" | "self" }
  | {
      ok: false;
      status: 403;
      code: typeof ErrorCode.FORBIDDEN;
      detail: string;
    };

/**
 * Promote: callup owner, or self when player.userId === me and on waitlist.
 */
export function assertPromoteAllowed(input: {
  actorUserId: string;
  callupCallerId: string;
  playerUserId: string | null;
  isWaitList: boolean;
}): PromoteAuthDecision {
  if (!input.isWaitList) {
    return {
      ok: false,
      status: 403,
      code: ErrorCode.FORBIDDEN,
      detail: "Solo se puede promover desde la lista de espera.",
    };
  }
  if (input.actorUserId === input.callupCallerId) {
    return { ok: true, mode: "owner" };
  }
  if (
    input.playerUserId != null &&
    input.actorUserId === input.playerUserId
  ) {
    return { ok: true, mode: "self" };
  }
  return {
    ok: false,
    status: 403,
    code: ErrorCode.FORBIDDEN,
    detail: "No tienes permiso para promover a este jugador.",
  };
}

export type SubscribePlacementDecision =
  | { ok: true; kind: "claim"; playerId: string; notifyChannel: false }
  | {
      ok: true;
      kind: "create";
      isWaitList: boolean;
      notifyChannel: true;
      event: "subscribe";
    }
  | {
      ok: false;
      status: 409;
      code:
        | typeof ErrorCode.WAITLIST_CONFIRM_REQUIRED
        | typeof ErrorCode.CALLUP_FULL
        | typeof ErrorCode.VALIDATION_ERROR;
      detail: string;
    };

/**
 * Pure subscribe decision: claim (silent) vs create roster/waitlist vs errors.
 */
export function decideSubscribe(input: {
  subscriberName: string;
  existingPlayers: ClaimCandidate[];
  alreadySubscribed: boolean;
  acceptWaitlist: boolean;
  eligibility: SubscribeEligibilityInput;
}): SubscribePlacementDecision {
  if (input.alreadySubscribed) {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.VALIDATION_ERROR,
      detail: "Ya estás inscrito en esta convocatoria.",
    };
  }

  const claim = resolveClaim(input.subscriberName, input.existingPlayers);
  if (claim.kind === "claim") {
    return {
      ok: true,
      kind: "claim",
      playerId: claim.playerId,
      notifyChannel: false,
    };
  }

  const eligibility = getSubscribeEligibility(input.eligibility);
  if (eligibility.canJoinRoster) {
    return {
      ok: true,
      kind: "create",
      isWaitList: false,
      notifyChannel: true,
      event: "subscribe",
    };
  }
  if (eligibility.canJoinWaitlist) {
    if (!input.acceptWaitlist) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.WAITLIST_CONFIRM_REQUIRED,
        detail:
          "La nómina está llena. Confirma si quieres entrar a la lista de espera.",
      };
    }
    return {
      ok: true,
      kind: "create",
      isWaitList: true,
      notifyChannel: true,
      event: "subscribe",
    };
  }

  return {
    ok: false,
    status: 409,
    code: ErrorCode.CALLUP_FULL,
    detail: "La convocatoria está llena.",
  };
}

/**
 * Runs claim path and ensures notify is NOT invoked (occupancy unchanged).
 */
export function applyClaimNotifyContract(
  notify: ChannelNotify | undefined,
): { notifyChannel: false } {
  // Claim must never emit channel events.
  void notify;
  return { notifyChannel: false };
}

/**
 * Emits subscribe only when a new row was created (not claim).
 */
export function emitSubscribeIfNeeded(
  notify: ChannelNotify | undefined,
  notifyChannel: boolean,
): void {
  if (notifyChannel && notify) {
    notify("subscribe");
  }
}

export type GuestPlacementDecision =
  | {
      ok: true;
      isWaitList: boolean;
      hasPayment: boolean;
      displayName: string;
      notifyChannel: true;
      event: "subscribe";
    }
  | {
      ok: false;
      status: 409 | 400;
      code:
        | typeof ErrorCode.WAITLIST_CONFIRM_REQUIRED
        | typeof ErrorCode.CALLUP_FULL
        | typeof ErrorCode.VALIDATION_ERROR;
      detail: string;
    };

/**
 * Crear Jugador (guest) placement + payment forced false unless owner.
 */
export function decideGuestCreate(input: {
  guestName: string;
  acceptWaitlist: boolean;
  requestedHasPayment: boolean;
  actorIsOwner: boolean;
  existingGuestNames: string[];
  eligibility: SubscribeEligibilityInput;
}): GuestPlacementDecision {
  const displayName = formatPlayerDisplayName(input.guestName);
  if (!displayName) {
    return {
      ok: false,
      status: 400,
      code: ErrorCode.VALIDATION_ERROR,
      detail: "El nombre del jugador es obligatorio.",
    };
  }

  const duplicate = input.existingGuestNames.some((n) =>
    playerNamesMatch(n, displayName),
  );
  if (duplicate) {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.VALIDATION_ERROR,
      detail: "Ya existe un invitado con ese nombre en la convocatoria.",
    };
  }

  const eligibility = getSubscribeEligibility(input.eligibility);
  let isWaitList = false;
  if (eligibility.canJoinRoster) {
    isWaitList = false;
  } else if (eligibility.canJoinWaitlist) {
    if (!input.acceptWaitlist) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.WAITLIST_CONFIRM_REQUIRED,
        detail:
          "La nómina está llena. Confirma si quieres entrar a la lista de espera.",
      };
    }
    isWaitList = true;
  } else {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.CALLUP_FULL,
      detail: "La convocatoria está llena.",
    };
  }

  return {
    ok: true,
    isWaitList,
    hasPayment: input.actorIsOwner ? input.requestedHasPayment : false,
    displayName,
    notifyChannel: true,
    event: "subscribe",
  };
}

export type PromoteDecision =
  | {
      ok: true;
      fields: ReturnType<typeof promoteSuccessFields>;
      notifyChannel: true;
      event: "promote";
    }
  | {
      ok: false;
      status: 409;
      code:
        | typeof ErrorCode.SPOT_TAKEN_FIFO
        | typeof ErrorCode.CALLUP_FULL
        | typeof ErrorCode.CALLUP_READ_ONLY;
      detail: string;
    };

/**
 * Promote waitlist → roster. Last-spot self-promote uses FIFO by createdAt.
 */
export function decidePromote(input: {
  mode: "owner" | "self";
  playerId: string;
  rosterCount: number;
  spotsQuantity: number;
  /** Waitlisted players used for last-spot FIFO (typically those with userId for self-race). */
  fifoCandidates: PromoteCandidate[];
}): PromoteDecision {
  const freeSpots = input.spotsQuantity - input.rosterCount;
  if (freeSpots <= 0) {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.CALLUP_FULL,
      detail: "No hay plazas libres en la nómina.",
    };
  }

  if (input.mode === "self" && freeSpots === 1 && input.fifoCandidates.length > 0) {
    const race = resolvePromoteRace(input.fifoCandidates, input.playerId);
    if (!race.ok) {
      return {
        ok: false,
        status: 409,
        code: ErrorCode.SPOT_TAKEN_FIFO,
        detail: "La plaza fue tomada por otro jugador en lista de espera.",
      };
    }
  }

  return {
    ok: true,
    fields: promoteSuccessFields(),
    notifyChannel: true,
    event: "promote",
  };
}

/**
 * Post-commit check: roster exceeded spots → race loser (first commit wins).
 */
export function decideAfterRosterInsert(rosterCount: number, spotsQuantity: number):
  | { ok: true }
  | {
      ok: false;
      status: 409;
      code: typeof ErrorCode.SPOT_TAKEN_FIFO;
      detail: string;
    } {
  if (rosterCount > spotsQuantity) {
    return {
      ok: false,
      status: 409,
      code: ErrorCode.SPOT_TAKEN_FIFO,
      detail: "La última plaza de nómina ya fue tomada.",
    };
  }
  return { ok: true };
}

export function mapPlayerRowToDto(row: PlayerRow): PlayerDto {
  return toPlayerDto(row);
}

export { normalizePlayerName, playerNamesMatch };
