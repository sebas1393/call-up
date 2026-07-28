"use client";

import { useEffect } from "react";

import { registerServiceWorker } from "@/lib/pwa/register-sw";

/**
 * Registers `/sw.js` on mount without blocking render (Task 16).
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    void registerServiceWorker();
  }, []);

  return null;
}
