/**
 * Registers `/sw.js` once (Next.js official PWA pattern).
 * Safe to call from client effects; does not block UI.
 */

let registerPromise: Promise<ServiceWorkerRegistration | null> | null = null;

/**
 * Registers the manual service worker at `/sw.js`.
 * Idempotent within the page lifetime.
 *
 * @returns Registration or null if unsupported / failed
 */
export function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (!("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }
  if (!registerPromise) {
    registerPromise = navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((registration) => registration)
      .catch((err) => {
        console.error("Service worker registration failed", err);
        registerPromise = null;
        return null;
      });
  }
  return registerPromise;
}
