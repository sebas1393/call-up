/**
 * Guest / display name normalization for uniqueness and claim matching.
 * Spec: trim, collapse inner spaces, case-insensitive compare; **no** accent folding.
 */

/**
 * Normalizes a player name for comparison: trim, collapse whitespace, lowercase.
 * Does not fold accents (`José` stays distinct from `Jose`).
 *
 * @param name - Raw display name
 * @returns Normalized comparison key
 */
export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * True if two names match under guest uniqueness / claim rules.
 */
export function playerNamesMatch(a: string, b: string): boolean {
  return normalizePlayerName(a) === normalizePlayerName(b);
}
