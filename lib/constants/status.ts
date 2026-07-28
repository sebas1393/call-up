import type { CallupStatus } from "@/lib/constants/callup";

/**
 * Callup status constants and Spanish labels (US-004).
 */
export const CallupStatusValue = {
  Open: "Open",
  Full: "Full",
  Closed: "Closed",
  cancelled: "cancelled",
} as const satisfies Record<CallupStatus, CallupStatus>;

export const CALLUP_STATUS_LABELS_ES: Record<CallupStatus, string> = {
  Open: "Abierta",
  Full: "Llena",
  Closed: "Cerrada",
  cancelled: "Cancelada",
};

/** Business timezone for pilot (spec). Instant comparisons use UTC; display uses this TZ. */
export const BUSINESS_TIMEZONE = "America/Bogota";
