import { BUSINESS_TIMEZONE } from "@/lib/constants/status";

/**
 * Formats an instant as `YYYY-MM-DDTHH:mm` for `<input type="datetime-local">`
 * in America/Bogota.
 */
export function isoToBogotaLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

/**
 * Interprets a datetime-local value as America/Bogota (UTC−5, no DST) ISO with offset.
 * Zod `datetime({ offset: true })` expects seconds.
 */
export function bogotaLocalInputToIso(local: string): string {
  const trimmed = local.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    throw new Error("Fecha/hora inválida.");
  }
  return `${trimmed}:00-05:00`;
}

/**
 * Current Bogotá wall-clock as datetime-local value (for `min`).
 */
export function nowBogotaLocalInput(): string {
  return isoToBogotaLocalInput(new Date().toISOString());
}
