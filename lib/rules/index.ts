/**
 * Pure domain rules (eligibility, status, name-match).
 */
export {
  canSubscribe,
  getSubscribeEligibility,
  hasNoSubscribeCapacity,
  type SubscribeEligibility,
  type SubscribeEligibilityInput,
} from "@/lib/rules/subscribe-eligibility";
export {
  BUSINESS_TIMEZONE,
  isMatchInPast,
  revalidateCallupStatus,
  statusFromCapacity,
  type CapacityCounts,
  type RevalidateStatusInput,
  type RevalidateStatusResult,
} from "@/lib/rules/callup-status";
export {
  normalizePlayerName,
  playerNamesMatch,
} from "@/lib/rules/player-name";
export {
  resolveClaim,
  type ClaimCandidate,
  type ClaimResult,
} from "@/lib/rules/claim";
export {
  promoteSuccessFields,
  resolvePromoteRace,
  type PromoteCandidate,
  type PromoteRaceResult,
  type PromoteSuccessFields,
} from "@/lib/rules/promote";
