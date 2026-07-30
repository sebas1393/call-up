/**
 * PWA install helpers (spec §11.8).
 */

const DISMISS_KEY = "kortumo-install-dismissed";

export type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/** Captured early so we do not miss Chromium's one-shot event. */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let bipListenerAttached = false;

/**
 * Attach `beforeinstallprompt` as early as possible (layout SW register).
 */
export function captureBeforeInstallPrompt(): void {
  if (typeof window === "undefined" || bipListenerAttached) return;
  bipListenerAttached = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new Event("kortumo-bip"));
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt(): void {
  deferredPrompt = null;
}

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

/** iPhone/iPad (Safari / WebKit) — no beforeinstallprompt. */
export function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return false;
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const iPadOs =
    navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  return iOS || iPadOs;
}

/** Android Chromium-family (custom install prompt or menu instructions). */
export function isAndroidLike(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isInstallPromptDismissed(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallPrompt(): void {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}
