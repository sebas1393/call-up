/**
 * Web Push subscribe helpers (client-only). Uses NEXT_PUBLIC_VAPID_PUBLIC_KEY only.
 */

import { registerServiceWorker } from "@/lib/pwa/register-sw";

/**
 * Decodes a URL-safe base64 VAPID public key to Uint8Array for PushManager.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = globalThis.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export type SubscribePushResult =
  | { ok: true; subscription: PushSubscription }
  | {
      ok: false;
      reason: "unsupported" | "denied" | "missing_vapid" | "error";
      detail: string;
    };

/**
 * Requests notification permission, subscribes with VAPID public key,
 * and POSTs the subscription to `/api/v1/me/push-subscription`.
 *
 * Follow remains valid even if this fails (permission denied / missing key).
 */
export async function subscribePushAndRegister(): Promise<SubscribePushResult> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return {
      ok: false,
      reason: "unsupported",
      detail: "Este navegador no soporta notificaciones.",
    };
  }
  if (!("PushManager" in window)) {
    return {
      ok: false,
      reason: "unsupported",
      detail: "Este navegador no soporta Web Push.",
    };
  }

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublic) {
    return {
      ok: false,
      reason: "missing_vapid",
      detail:
        "Falta la clave pública VAPID. El canal quedó seguido, pero el push en segundo plano no está disponible.",
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return {
      ok: false,
      reason: "denied",
      detail:
        "Seguiste el canal. Activa las notificaciones más tarde para recibir avisos en segundo plano.",
    };
  }

  try {
    await registerServiceWorker();
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublic) as BufferSource,
    });

    const serialized = subscription.toJSON();
    const res = await fetch("/api/v1/me/push-subscription", {
      method: "POST",
      credentials: "include",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: serialized.endpoint,
        keys: {
          p256dh: serialized.keys?.p256dh,
          auth: serialized.keys?.auth,
        },
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        reason: "error",
        detail:
          "Seguiste el canal, pero no se pudo guardar la suscripción push. Intenta de nuevo más tarde.",
      };
    }

    return { ok: true, subscription };
  } catch (err) {
    console.error("Push subscribe failed", err);
    return {
      ok: false,
      reason: "error",
      detail:
        "Seguiste el canal. El push en segundo plano no se pudo activar ahora.",
    };
  }
}
