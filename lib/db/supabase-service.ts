import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getSupabaseServiceEnv } from "@/lib/db/env";

/**
 * Creates a Supabase client with the **service_role** key (bypasses RLS).
 *
 * **Server-only:** this module imports `server-only` so it must not be imported
 * from Client Components or any browser bundle. Import path convention:
 * `@/lib/db/supabase-service` — never re-export from shared client entry points.
 *
 * Allowed uses (spec §10 / §11): revalidate-status lock, Web Push fan-out recipient load.
 *
 * @returns Supabase JS client with service role privileges
 */
export function createSupabaseServiceClient() {
  const { url, serviceRoleKey } = getSupabaseServiceEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
