/**
 * §11 recipient resolution for channel / owner notifications.
 * Claim is intentionally not a channel event (roster occupancy unchanged).
 */

import type { CallupStatus } from "@/lib/constants/callup";

/**
 * Events that may fan out via Realtime toast + Web Push.
 * There is no `claim` event — claim must never notify.
 */
export const CHANNEL_NOTIFY_EVENTS = [
  "new_callup",
  "subscribe",
  "unsubscribe",
  "promote",
  "plaza_libre",
  "payment",
] as const;

export type ChannelNotifyEvent = (typeof CHANNEL_NOTIFY_EVENTS)[number];

export type ResolveRecipientsInput = {
  event: ChannelNotifyEvent;
  /** Followers of the caller's channel (player_subscriptions). */
  followerUserIds: readonly string[];
  /** Callup owner / channel caller. */
  callupOwnerId: string;
};

/**
 * Resolves unique user ids who should receive a notify for the event.
 *
 * - `new_callup` → followers only (owner already knows).
 * - `subscribe` | `unsubscribe` | `promote` | `plaza_libre` → followers + owner.
 * - `payment` → owner only.
 */
export function resolveRecipientUserIds(
  input: ResolveRecipientsInput,
): string[] {
  const followers = [...input.followerUserIds];
  const owner = input.callupOwnerId;

  switch (input.event) {
    case "new_callup":
      return unique(followers.filter((id) => id !== owner));
    case "payment":
      return [owner];
    case "subscribe":
    case "unsubscribe":
    case "promote":
    case "plaza_libre":
      return unique([...followers, owner]);
    default: {
      const _exhaustive: never = input.event;
      return _exhaustive;
    }
  }
}

/**
 * Noise window: channel churn events only while Open (or the join that fills → Full).
 * Payment may still notify the caller on Closed.
 * Never emit channel churn once Full / Closed / cancelled (except payment).
 */
export function shouldEmitChannelNotify(input: {
  event: ChannelNotifyEvent;
  /** Status **after** the mutation (or current for payment). */
  statusAfter: CallupStatus;
  /** True when this mutation created a row that filled capacity (Open→Full). */
  filledCapacity?: boolean;
}): boolean {
  if (input.event === "payment") {
    return input.statusAfter !== "cancelled";
  }

  if (input.statusAfter === "Open") {
    return true;
  }

  // Successful join that transitions into Full still notifies once.
  if (
    input.statusAfter === "Full" &&
    input.filledCapacity === true &&
    (input.event === "subscribe" || input.event === "new_callup")
  ) {
    return true;
  }

  return false;
}

/**
 * Self-follow is forbidden (DB CHECK + API). Owner still gets owner notifies without following.
 */
export function assertNotSelfFollow(
  sessionUserName: string | null,
  targetUserName: string,
):
  | { ok: true }
  | { ok: false; status: 403; code: "FORBIDDEN"; detail: string } {
  if (
    sessionUserName != null &&
    sessionUserName.toLowerCase() === targetUserName.toLowerCase()
  ) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      detail: "No puedes seguir tu propio canal.",
    };
  }
  return { ok: true };
}

function unique(ids: string[]): string[] {
  return [...new Set(ids)];
}
