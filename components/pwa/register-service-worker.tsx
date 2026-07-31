"use client";

import { useEffect } from "react";

import { captureBeforeInstallPrompt } from "@/lib/pwa/install-app";
import { registerServiceWorker } from "@/lib/pwa/register-sw";

/**
 * Registers `/sw.js` on mount without blocking render (Task 16).
 * Also captures `beforeinstallprompt` early (spec §11.8).
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    captureBeforeInstallPrompt();
    void registerServiceWorker();
  }, []);

  return null;
}
