/**
 * Approved Problem Details `code` values from spec.md §9.
 * Use these instead of magic strings in API handlers and services.
 */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CALLUP_FULL: "CALLUP_FULL",
  WAITLIST_CONFIRM_REQUIRED: "WAITLIST_CONFIRM_REQUIRED",
  WAITLIST_FULL: "WAITLIST_FULL",
  SPOT_TAKEN_FIFO: "SPOT_TAKEN_FIFO",
  CALLUP_READ_ONLY: "CALLUP_READ_ONLY",
  USERNAME_TAKEN: "USERNAME_TAKEN",
  USERNAME_IMMUTABLE: "USERNAME_IMMUTABLE",
  NOT_COURT_OWNER: "NOT_COURT_OWNER",
  SPOTS_BELOW_ROSTER: "SPOTS_BELOW_ROSTER",
} as const;

/** Union of approved API error codes. */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
