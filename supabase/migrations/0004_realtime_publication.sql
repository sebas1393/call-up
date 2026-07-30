/**
 * Enable Supabase Realtime for live callup UIs (spec §11).
 * Without publication membership, `postgres_changes` never fires — UIs only update on refresh.
 *
 * Idempotent: safe if tables were already added in the dashboard.
 */
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'callups'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.callups;
  END IF;
END $$;
