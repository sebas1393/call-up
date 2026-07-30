import "server-only";

import type { CallupStatus } from "@/lib/constants/callup";
import { createSupabaseServiceClient } from "@/lib/db/supabase-service";
import {
  resolveRecipientUserIds,
  shouldEmitChannelNotify,
  type ChannelNotifyEvent,
} from "@/lib/notify/recipients";
import { sendWebPushNotification } from "@/lib/notify/send-web-push";

export type FanOutInput = {
  event: ChannelNotifyEvent;
  callupOwnerId: string;
  callerUserName: string;
  callupId: string | null;
  statusAfter: CallupStatus;
  filledCapacity?: boolean;
  title: string;
  body: string;
  /** Override path; default `/{callerUserName}`. */
  url?: string;
};

/**
 * Web Push fan-out (spec §11.3): load followers via service_role, send, drop 410/404.
 * Safe to await; never throws to callers.
 */
export async function fanOutChannelNotify(input: FanOutInput): Promise<void> {
  try {
    if (
      !shouldEmitChannelNotify({
        event: input.event,
        statusAfter: input.statusAfter,
        filledCapacity: input.filledCapacity,
      })
    ) {
      return;
    }

    const service = createSupabaseServiceClient();

    const { data: follows, error: followError } = await service
      .from("player_subscriptions")
      .select("player_user_id")
      .eq("caller_user_id", input.callupOwnerId);

    if (followError) {
      console.error("fan-out: load followers failed", followError);
      return;
    }

    const followerUserIds = (follows ?? []).map(
      (r) => r.player_user_id as string,
    );
    const recipientIds = resolveRecipientUserIds({
      event: input.event,
      followerUserIds,
      callupOwnerId: input.callupOwnerId,
    });

    if (recipientIds.length === 0) return;

    const { data: subs, error: subError } = await service
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .in("user_id", recipientIds);

    if (subError) {
      console.error("fan-out: load push_subscriptions failed", subError);
      return;
    }
    if (!subs?.length) return;

    const url = input.url ?? `/${input.callerUserName}`;

    await Promise.all(
      subs.map(async (sub) => {
        const result = await sendWebPushNotification(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          {
            title: input.title,
            body: input.body,
            url,
            event: input.event,
            callupId: input.callupId,
            callerUserName: input.callerUserName,
          },
        );
        if (!result.ok && result.gone) {
          await service
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", sub.endpoint);
        }
      }),
    );
  } catch (err) {
    console.error("fan-out: unexpected error", err);
  }
}

/**
 * Loads caller `user_name` for notify URLs. Returns null if missing.
 */
export async function loadCallerUserName(
  callerUserId: string,
): Promise<string | null> {
  try {
    const service = createSupabaseServiceClient();
    const { data } = await service
      .from("users")
      .select("user_name")
      .eq("id", callerUserId)
      .maybeSingle();
    return data?.user_name ?? null;
  } catch {
    return null;
  }
}
