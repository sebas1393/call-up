/**
 * Database clients and repositories (explicit column selects).
 *
 * Session/RLS client: {@link createSupabaseServerClient} from `./supabase-server`.
 * Service role (server-only): import `./supabase-service` directly — do not re-export here.
 */
export { createSupabaseServerClient } from "@/lib/db/supabase-server";
export {
  getSupabasePublicEnv,
  type SupabasePublicEnv,
} from "@/lib/db/env";
