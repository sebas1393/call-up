/**
 * Callup-related limits and defaults (no magic numbers in feature code).
 */
export const SPOTS_QUANTITY_MIN = 1;
export const SPOTS_QUANTITY_MAX = 30;

export const DEFAULT_SPOTS_BY_COURT_TYPE = {
  F5: 10,
  F6: 12,
} as const;

export const COURT_TYPES = ["F5", "F6"] as const;
export type CourtType = (typeof COURT_TYPES)[number];

export const CALLUP_STATUSES = ["Open", "Full", "Closed", "cancelled"] as const;
export type CallupStatus = (typeof CALLUP_STATUSES)[number];

export const USERNAME_MIN_LENGTH = 5;
export const USERNAME_MAX_LENGTH = 10;
export const USERNAME_PATTERN = /^[a-z0-9-]+$/;

export const PHONE_LENGTH = 10;
export const PHONE_PATTERN = /^[0-9]{10}$/;

export const PAYMENT_KEY_MAX_LENGTH = 50;
/** Letters, digits, and special characters commonly allowed in email addresses; no whitespace. */
export const PAYMENT_KEY_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~@-]+$/;

export const COURT_NAME_MAX_LENGTH = 100;
export const COURT_ADDRESS_MAX_LENGTH = 100;
export const COURT_SEARCH_MIN_LENGTH = 3;

export const CALLUPS_PAGE_SIZE_DEFAULT = 10;
