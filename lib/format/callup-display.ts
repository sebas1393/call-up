import {
  BUSINESS_TIMEZONE,
  CALLUP_STATUS_LABELS_ES,
} from "@/lib/constants/status";
import type { CallupStatus } from "@/lib/constants/callup";

/**
 * Formats match instant for Colombia UI (America/Bogota).
 * Example: "22 de julio 8:00 p. m."
 */
export function formatMatchAtEs(iso: string): string {
  const date = new Date(iso);
  const formatted = new Intl.DateTimeFormat("es-CO", {
    timeZone: BUSINESS_TIMEZONE,
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
  return formatted;
}

export function statusLabelEs(status: CallupStatus): string {
  return CALLUP_STATUS_LABELS_ES[status] ?? status;
}

export function statusPillClass(status: CallupStatus): string {
  switch (status) {
    case "Open":
      return "bg-[var(--kortumo-teal)]/15 text-[var(--kortumo-teal)]";
    case "Full":
      return "bg-[var(--kortumo-red)]/15 text-[var(--kortumo-red)]";
    case "Closed":
      return "bg-[var(--kortumo-navy)]/10 text-[var(--kortumo-navy)]/70";
    case "cancelled":
      return "bg-zinc-200 text-zinc-600";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
}

export function canMutateCallup(status: CallupStatus): boolean {
  return status === "Open" || status === "Full";
}
