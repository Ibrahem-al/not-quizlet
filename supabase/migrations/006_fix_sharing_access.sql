-- Migration 006: Fix sharing access and missing RLS policies
--
-- This migration is idempotent (safe to run even if 005 was already applied).
-- It fixes three classes of bugs:
--   1. "Set not found" after accepting a share link — add a SELECT policy that
--      lets any authenticated user read a set when an active share link exists.
--   2. "Failed to update permissions" — the sharing_permissions table had no
--      UPDATE policy, so updateUserPermission() always failed silently.
--   3. Includes 005 fixes in case that migration was never applied.

-- ============================================================
-- 1. INCLUDE 005 FIXES (idempotent via DROP IF EXISTS)
-- ============================================================

-- Allow authenticated users to self-insert a sharing_permissions row
-- when they accept a valid share link (the link validates item + token).
DROP POLICY IF EXISTS "Users can accept share links for themselves" ON public.sharing_permissions;
CREATE POLICY "Users can accept share links for themselves"
  ON public.sharing_permissions FOR INSERT
  WITH CHECK (
    shared_with_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.share_links sl
      WHERE sl.item_type = sharing_permissions.item_type
        AND sl.item_id   = sharing_permissions.item_id
        AND sl.is_active = true
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
        AND (sl.max_uses  IS NULL OR sl.access_count < sl.max_uses)
    )
  );

-- Allow users to see permissions shared with their email address
-- (needed for email-based invites to appear in "Shared with Me").
DROP POLICY IF EXISTS "Users can view permissions shared with their email" ON public.sharing_permissions;
CREATE POLICY "Users can view permissions shared with their email"
  ON public.sharing_permissions FOR SELECT
  USING (
    shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- ============================================================
-- 2. NEW: Allow viewing a set when an active share link exists
-- ============================================================
-- Without this, a recipient who clicks "Anyone with link" can only access
-- the set if the owner already set sharing_mode = 'link' or 'public'.
-- This policy lets the share link itself act as the access grant.
DROP POLICY IF EXISTS "Users can view sets with active share links" ON public.study_sets;
CREATE POLICY "Users can view sets with active share links"
  ON public.study_sets FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.share_links sl
      WHERE sl.item_type    = 'set'
        AND sl.item_id      = study_sets.id
        AND sl.is_active    = true
        AND (sl.expires_at  IS NULL OR sl.expires_at > now())
        AND (sl.max_uses    IS NULL OR sl.access_count < sl.max_uses)
    )
  );

-- ============================================================
-- 3. ADD MISSING UPDATE POLICY FOR sharing_permissions
-- ============================================================
-- The original migrations only had SELECT, INSERT, DELETE for this table.
-- Without an UPDATE policy, updateUserPermission() (changing viewer→editor)
-- always fails with an RLS error.
DROP POLICY IF EXISTS "Users can update permissions they created" ON public.sharing_permissions;
CREATE POLICY "Users can update permissions they created"
  ON public.sharing_permissions FOR UPDATE
  USING (shared_by_user_id = auth.uid())
  WITH CHECK (shared_by_user_id = auth.uid());

-- ============================================================
-- 4. RPC FUNCTIONS (CREATE OR REPLACE = idempotent)
-- ============================================================

-- Look up user emails by ID array (used by SharedWithMe page).
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE (user_id uuid, email text) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
