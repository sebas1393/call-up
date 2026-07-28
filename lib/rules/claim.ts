import { playerNamesMatch } from "@/lib/rules/player-name";

/** Minimal player row shape for claim detection. */
export type ClaimCandidate = {
  id: string;
  name: string;
  userId: string | null;
};

export type ClaimResult =
  | { kind: "claim"; playerId: string }
  | { kind: "create" };

/**
 * Detects whether a subscribe should **claim** an existing guest row
 * (same normalized name, `userId` null) or create a new row.
 *
 * Claim does **not** change roster occupancy and must not emit channel notify.
 *
 * @param subscriberName - Logged-in user's display name
 * @param existingPlayers - Current players on the callup
 * @returns Claim target id, or `create` when no guest match
 */
export function resolveClaim(
  subscriberName: string,
  existingPlayers: ClaimCandidate[],
): ClaimResult {
  const guest = existingPlayers.find(
    (p) => p.userId === null && playerNamesMatch(p.name, subscriberName),
  );

  if (guest) {
    return { kind: "claim", playerId: guest.id };
  }

  return { kind: "create" };
}
