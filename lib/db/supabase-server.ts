import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabasePublicEnv } from "@/lib/db/env";

/**
 * Creates a Supabase client bound to the current user session (anon key + JWT cookies).
 * Use in Route Handlers, Server Actions, and Server Components. RLS applies.
 *
 * @returns Promise of a cookie-aware Supabase server client
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component where cookies are read-only;
          // middleware / Route Handlers refresh the session when needed.
        }
      },
    },
  });
}
