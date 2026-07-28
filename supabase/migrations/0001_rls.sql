-- Call Up RLS policies
-- DRAFT — do not apply until human approval (see docs/schema-approval.md).
-- Source: spec.md §10. service_role bypasses RLS (server-only fan-out / revalidate).

-- ---------------------------------------------------------------------------
-- Enable RLS on all app tables
-- ---------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callup_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caller_courts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.callups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Helper: callup visible if own OR caller has a public channel
-- (no global callup catalog; API still scopes by username / id)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.callup_is_visible(p_caller uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p_caller = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.callup_channels c
      WHERE c.caller_user_id = p_caller
    );
$$;

REVOKE ALL ON FUNCTION public.callup_is_visible(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.callup_is_visible(uuid) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- users: own row only (no list-users / anon denied)
-- ---------------------------------------------------------------------------
CREATE POLICY users_select_own
  ON public.users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY users_insert_own
  ON public.users FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY users_update_own
  ON public.users FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- No DELETE policy for users in MVP

-- ---------------------------------------------------------------------------
-- callup_channels: public read for /{userName}; owner write
-- ---------------------------------------------------------------------------
CREATE POLICY callup_channels_select_all
  ON public.callup_channels FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY callup_channels_insert_own
  ON public.callup_channels FOR INSERT
  TO authenticated
  WITH CHECK (caller_user_id = auth.uid());

CREATE POLICY callup_channels_update_own
  ON public.callup_channels FOR UPDATE
  TO authenticated
  USING (caller_user_id = auth.uid())
  WITH CHECK (caller_user_id = auth.uid());

CREATE POLICY callup_channels_delete_own
  ON public.callup_channels FOR DELETE
  TO authenticated
  USING (caller_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- player_subscriptions (follow)
-- ---------------------------------------------------------------------------
CREATE POLICY player_subscriptions_select
  ON public.player_subscriptions FOR SELECT
  TO authenticated
  USING (
    player_user_id = auth.uid()
    OR caller_user_id = auth.uid()
  );

CREATE POLICY player_subscriptions_insert_own
  ON public.player_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    player_user_id = auth.uid()
    AND player_user_id <> caller_user_id
  );

CREATE POLICY player_subscriptions_delete_own
  ON public.player_subscriptions FOR DELETE
  TO authenticated
  USING (player_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- push_subscriptions: own rows only (fan-out via service_role)
-- ---------------------------------------------------------------------------
CREATE POLICY push_subscriptions_select_own
  ON public.push_subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY push_subscriptions_insert_own
  ON public.push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_update_own
  ON public.push_subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY push_subscriptions_delete_own
  ON public.push_subscriptions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- callups: own OR public channel caller; insert/update owner only
-- ---------------------------------------------------------------------------
CREATE POLICY callups_select_scoped
  ON public.callups FOR SELECT
  TO anon, authenticated
  USING (public.callup_is_visible(caller));

CREATE POLICY callups_insert_own
  ON public.callups FOR INSERT
  TO authenticated
  WITH CHECK (caller = auth.uid());

CREATE POLICY callups_update_own
  ON public.callups FOR UPDATE
  TO authenticated
  USING (caller = auth.uid())
  WITH CHECK (caller = auth.uid());

-- No hard DELETE — cancel is status update

-- ---------------------------------------------------------------------------
-- players: same visibility as parent callup
-- ---------------------------------------------------------------------------
CREATE POLICY players_select_scoped
  ON public.players FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.callups cu
      WHERE cu.id = players.callup_id
        AND public.callup_is_visible(cu.caller)
    )
  );

CREATE POLICY players_insert_authenticated
  ON public.players FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.callups cu
      WHERE cu.id = callup_id
        AND public.callup_is_visible(cu.caller)
    )
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY players_update_owner_or_self
  ON public.players FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.callups cu
      WHERE cu.id = players.callup_id
        AND (
          cu.caller = auth.uid()
          OR players.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.callups cu
      WHERE cu.id = players.callup_id
        AND (
          cu.caller = auth.uid()
          OR players.user_id = auth.uid()
        )
    )
  );

CREATE POLICY players_delete_owner_or_self
  ON public.players FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.callups cu
      WHERE cu.id = players.callup_id
        AND (
          cu.caller = auth.uid()
          OR players.user_id = auth.uid()
        )
    )
  );

-- ---------------------------------------------------------------------------
-- courts / caller_courts
-- ---------------------------------------------------------------------------
CREATE POLICY courts_select_authenticated
  ON public.courts FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY courts_insert_own
  ON public.courts FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY courts_update_owner
  ON public.courts FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY caller_courts_select_own
  ON public.caller_courts FOR SELECT
  TO authenticated
  USING (caller_user_id = auth.uid());

CREATE POLICY caller_courts_insert_own
  ON public.caller_courts FOR INSERT
  TO authenticated
  WITH CHECK (caller_user_id = auth.uid());

CREATE POLICY caller_courts_delete_own
  ON public.caller_courts FOR DELETE
  TO authenticated
  USING (caller_user_id = auth.uid());
