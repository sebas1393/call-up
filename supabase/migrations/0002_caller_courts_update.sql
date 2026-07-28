/**
 * Allow UPDATE on own caller_courts rows (needed if any client uses upsert).
 * Link/create prefer INSERT + ignore 23505; this covers ON CONFLICT UPDATE paths.
 */
CREATE POLICY caller_courts_update_own
  ON public.caller_courts FOR UPDATE
  TO authenticated
  USING (caller_user_id = auth.uid())
  WITH CHECK (caller_user_id = auth.uid());
