-- Migration 014: Restore missing INSERT/UPDATE/DELETE policies on study_sets
--
-- Problem: Migration 013 dropped the original "Users can do everything on own study_sets"
-- ALL policy (which covered SELECT, INSERT, UPDATE, DELETE) and only re-created
-- SELECT policies. This left users unable to create, update, or delete their
-- own study sets — breaking the app after login.

-- INSERT: allow users to create study sets they own
CREATE POLICY "owner_insert_study_sets"
  ON public.study_sets FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: allow users to update their own study sets
CREATE POLICY "owner_update_study_sets"
  ON public.study_sets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: allow users to delete their own study sets
CREATE POLICY "owner_delete_study_sets"
  ON public.study_sets FOR DELETE
  USING (user_id = auth.uid());
