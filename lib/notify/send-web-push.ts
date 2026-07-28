import "server-only";

import webpush from "web-push";

type PushKeys = { endpoint: string; p256dh: string; auth: string };

let vapidConfigured = false;

function ensureVapid(): boolean {
  if (vapidConfigured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:call-up@localhost";
  if (!publicKey || !privateKey) {
    return false;
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

/**
 * Sends one Web Push payload (spec §11.5 JSON). Server-only; uses VAPID private key.
 * Returns false when VAPID is not configured or send fails.
 */
export async function sendWebPushNotification(
  subscription: PushKeys,
  payload: {
    title: string;
    body: string;
    url?: string;
    event?: string;
    callupId?: string | null;
    callerUserName?: string | null;
  },
): Promise<boolean> {
  if (!ensureVapid()) {
    console.warn("Web Push skipped: VAPID keys not configured");
    return false;
  }

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url ?? "/",
        event: payload.event,
        callupId: payload.callupId ?? null,
        callerUserName: payload.callerUserName ?? null,
      }),
    );
    return true;
  } catch (err) {
    console.error("Web Push send failed", err);
    return false;
  }
}
