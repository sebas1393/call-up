/**
 * Anon must read courts nested in public callup responses (spec §10.9).
 * Without this, `courts!inner` on GET /callers/{userName}/callups returns zero rows for anon.
 */
CREATE POLICY courts_select_public_via_callup
  ON public.courts FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1
      FROM public.callups cu
      WHERE cu.court_id = courts.id
        AND public.callup_is_visible(cu.caller)
    )
  );
