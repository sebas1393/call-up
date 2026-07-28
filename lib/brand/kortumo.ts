/**
 * Kortumo brand tokens — sourced from `Brandbook-KORTUMO.pdf` (repo root).
 * Product UI uses **Kortumo** (K mark), not the working title "Call Up".
 */

export const KORTUMO_COLORS = {
  /** Soft court blue — accents / links */
  blueSoft: "#6699ff",
  /** Deep navy — primary surfaces, headers */
  navy: "#003366",
  /** Regulation red — CTAs / alerts */
  red: "#cc3333",
  /** Teal — secondary / success accents */
  teal: "#339999",
  /** White */
  white: "#ffffff",
} as const;

/**
 * Typography from brandbook.
 * Aharoni Bold / Myriad Pro / Open Sauce may require licensed files.
 * Web-safe stand-ins until assets are provided: Montserrat + Open Sans (Google Fonts).
 */
export const KORTUMO_FONTS = {
  display: "Aharoni Bold", // titles — fallback: Montserrat
  body: "Open Sans", // body
  subtitle: "Montserrat Light", // supporting lines
  ui: "Myriad Pro", // UI chrome — fallback: Open Sans
} as const;

export const KORTUMO_TAGLINES = [
  "Rápido y seguro",
  "Confiable",
  "Pensado para ti",
] as const;

export const KORTUMO_PRODUCT_NAME = "Kortumo";
export const KORTUMO_PRODUCT_SUBTITLE = "Convocatorias deportivas";
