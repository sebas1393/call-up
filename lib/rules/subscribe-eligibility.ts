import type { CallupStatus } from "@/lib/constants/callup";
import { CallupStatusValue } from "@/lib/constants/status";

/** Inputs for subscribe eligibility (US-004 / §3). */
export type SubscribeEligibilityInput = {
  spotsQuantity: number;
  rosterCount: number;
  waitList: boolean;
  waitListThreshold: number;
  waitlistCount: number;
  /** When Closed or cancelled, subscribe is blocked regardless of counts. */
  status: CallupStatus;
};

export type SubscribeEligibility = {
  canJoinRoster: boolean;
  canJoinWaitlist: boolean;
};

/**
 * Computes whether a user may join roster and/or waitlist.
 * Capacity is the source of truth for Open callups; Closed/cancelled always block.
 *
 * @param input - Spots, counts, waitlist flags, and current status
 * @returns Flags for roster vs waitlist join
 */
export function getSubscribeEligibility(
  input: SubscribeEligibilityInput,
): SubscribeEligibility {
  if (
    input.status === CallupStatusValue.Closed ||
    input.status === CallupStatusValue.cancelled
  ) {
    return { canJoinRoster: false, canJoinWaitlist: false };
  }

  const canJoinRoster = input.rosterCount < input.spotsQuantity;
  const canJoinWaitlist =
    !canJoinRoster &&
    input.waitList &&
    input.waitlistCount < input.waitListThreshold;

  return { canJoinRoster, canJoinWaitlist };
}

/**
 * True if the caller may subscribe (roster or waitlist).
 */
export function canSubscribe(input: SubscribeEligibilityInput): boolean {
  const { canJoinRoster, canJoinWaitlist } = getSubscribeEligibility(input);
  return canJoinRoster || canJoinWaitlist;
}

/**
 * True when there is no remaining roster or waitlist capacity.
 */
export function hasNoSubscribeCapacity(
  input: Omit<SubscribeEligibilityInput, "status">,
): boolean {
  const rosterFull = input.rosterCount >= input.spotsQuantity;
  const waitlistUnavailable =
    !input.waitList || input.waitlistCount >= input.waitListThreshold;
  return rosterFull && waitlistUnavailable;
}
