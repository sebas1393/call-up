"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser Supabase client (anon key + cookies). Used for Realtime `postgres_changes`.
 * Do not import from Server Components.
 */
export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return createBrowserClient(url, anonKey);
}
