import type { CallupStatus } from "@/lib/constants/callup";
import { BUSINESS_TIMEZONE, CallupStatusValue } from "@/lib/constants/status";
import { hasNoSubscribeCapacity } from "@/lib/rules/subscribe-eligibility";

export type CapacityCounts = {
  spotsQuantity: number;
  rosterCount: number;
  waitList: boolean;
  waitListThreshold: number;
  waitlistCount: number;
};

export type RevalidateStatusInput = {
  currentStatus: CallupStatus;
  matchAt: Date | string;
  /** Instant to compare against matchAt (defaults to now). */
  now?: Date | string;
  capacity: CapacityCounts;
};

export type RevalidateStatusResult = {
  status: CallupStatus;
  changed: boolean;
};

/**
 * True if matchAt is strictly before now (absolute instant; Bogota for display only).
 */
export function isMatchInPast(
  matchAt: Date | string,
  now: Date | string = new Date(),
): boolean {
  const match = matchAt instanceof Date ? matchAt : new Date(matchAt);
  const current = now instanceof Date ? now : new Date(now);
  return match.getTime() < current.getTime();
}

/**
 * Derives Open vs Full from capacity when the match is still in the future.
 * Does not consider cancelled or past-date Closed.
 */
export function statusFromCapacity(capacity: CapacityCounts): "Open" | "Full" {
  return hasNoSubscribeCapacity(capacity)
    ? CallupStatusValue.Full
    : CallupStatusValue.Open;
}

/**
 * Thread-safe revalidation rules (spec US-004 / API revalidate-status).
 * - `cancelled` is sticky (never overwritten).
 * - Past matchAt → `Closed` (no reopen).
 * - Else no capacity → `Full`; else → `Open`.
 *
 * @param input - Current status, matchAt, optional now, capacity counts
 * @returns Next status and whether it changed
 */
export function revalidateCallupStatus(
  input: RevalidateStatusInput,
): RevalidateStatusResult {
  const { currentStatus, capacity } = input;
  const now = input.now ?? new Date();

  if (currentStatus === CallupStatusValue.cancelled) {
    return { status: CallupStatusValue.cancelled, changed: false };
  }

  let next: CallupStatus;
  if (isMatchInPast(input.matchAt, now)) {
    next = CallupStatusValue.Closed;
  } else {
    next = statusFromCapacity(capacity);
  }

  return { status: next, changed: next !== currentStatus };
}

export { BUSINESS_TIMEZONE };
