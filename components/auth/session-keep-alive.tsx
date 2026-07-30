"use client";

import { useEffect } from "react";

import { createSupabaseBrowserClient } from "@/lib/db/supabase-browser";

/**
 * Client-side session refresh so auth cookies stay valid across PWA close/reopen.
 * Complements Next.js proxy `updateSession`.
 */
export function SessionKeepAlive() {
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    void supabase.auth.getSession();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      /* cookie storage updated by @supabase/ssr */
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
