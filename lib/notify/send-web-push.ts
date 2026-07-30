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

export type SendWebPushResult =
  | { ok: true }
  | { ok: false; gone: boolean; statusCode?: number };

/**
 * Sends one Web Push payload (spec §11.5 JSON). Server-only; uses VAPID private key.
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
): Promise<SendWebPushResult> {
  if (!ensureVapid()) {
    console.warn("Web Push skipped: VAPID keys not configured");
    return { ok: false, gone: false };
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
    return { ok: true };
  } catch (err) {
    const statusCode =
      typeof err === "object" &&
      err !== null &&
      "statusCode" in err &&
      typeof (err as { statusCode: unknown }).statusCode === "number"
        ? (err as { statusCode: number }).statusCode
        : undefined;
    const gone = statusCode === 404 || statusCode === 410;
    console.error("Web Push send failed", statusCode ?? err);
    return { ok: false, gone, statusCode };
  }
}
