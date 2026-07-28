/**
 * Reads required Supabase env vars. Never hardcodes secrets.
 * Public vars may use NEXT_PUBLIC_*; service role must stay server-only.
 */

export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

export type SupabaseServiceEnv = SupabasePublicEnv & {
  serviceRoleKey: string;
};

/**
 * Returns URL + anon key for session/RLS clients.
 *
 * @throws Error when required public env vars are missing
 */
export function getSupabasePublicEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }

  return { url, anonKey };
}

/**
 * Returns public env plus service role key (server-only callers).
 *
 * @throws Error when service role or public env vars are missing
 */
export function getSupabaseServiceEnv(): SupabaseServiceEnv {
  const publicEnv = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return { ...publicEnv, serviceRoleKey };
}
