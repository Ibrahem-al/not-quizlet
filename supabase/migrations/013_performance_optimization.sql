-- Migration 013: Database Performance Optimization
--
-- Problem: Supabase project exhausting CPU (~90%) and RAM (~50%) with only a few users.
--
-- Root causes identified:
--
--   1. study_sets has 4 overlapping SELECT RLS policies. PostgreSQL OR-combines them,
--      forcing evaluation of expensive nested EXISTS subqueries (up to 3 levels deep)
--      on every row for every SELECT — even simple owner-only queries pay the cost.
--
--   2. sharing_permissions has 3 overlapping SELECT policies evaluated per row.
--
--   3. Expired live game sessions (4-hour TTL) are never automatically cleaned up.
--      Their participants and answers accumulate indefinitely, bloating table sizes
--      and making RLS EXISTS checks scan more rows.
--
--   4. Stale failed_login_attempts and password_reset_requests grow unbounded
--      between per-event cleanup (which only fires on new login failures / resets).
--
--   5. Auto-save upserts the entire study_set (including full cards JSONB) every
--      1-2 seconds during editing. Each upsert evaluates RLS policies and creates
--      dead tuples requiring auto-vacuum. This is the #1 CPU driver.
--      (Fix: app-level change — increase debounce, skip unchanged sets.)
--
-- Fixes in this migration:
--   A. Consolidate study_sets SELECT policies: 4 → 2
--   B. Consolidate sharing_permissions SELECT policies: 3 → 1
--   C. Delete all expired/stale data immediately
--   D. Add partial index for active share links (RLS hot path)
--   E. Create reusable cleanup_stale_data() function
--   F. Set up pg_cron for hourly cleanup (if extension is available)
--   G. ANALYZE all tables to refresh query planner statistics


-- ============================================================
-- A. IMMEDIATE DATA CLEANUP
-- ============================================================
-- Expired live game sessions cascade-delete participants + answers via FK.

DELETE FROM public.live_game_sessions WHERE expires_at < now();

-- Stale security audit data
DELETE FROM public.failed_login_attempts WHERE attempted_at < (now() - interval '1 hour');
DELETE FROM public.password_reset_requests WHERE requested_at < (now() - interval '24 hours');


-- ============================================================
-- B. PARTIAL INDEX FOR ACTIVE SHARE LINKS
-- ============================================================
-- The "active share link" RLS check runs on every non-owner study_sets SELECT.
-- A partial index lets PostgreSQL skip inactive/revoked links entirely.

CREATE INDEX IF NOT EXISTS idx_share_links_active_lookup
  ON public.share_links(item_type, item_id)
  WHERE is_active = true;


-- ============================================================
-- C. CONSOLIDATE study_sets SELECT POLICIES (4 → 2)
-- ============================================================
--
-- BEFORE: 4 SELECT policies, OR-combined per row:
--   1. "Users can view own study_sets"            → user_id = auth.uid()
--   2. "Public sets are viewable by everyone"      → visibility = 'public'
--   3. "Users can view sets shared with them"      → 3-level nested EXISTS
--   4. "Users can view sets with active share links" → EXISTS into share_links
--
-- AFTER: 2 SELECT policies:
--   1. "owner_select_study_sets"  → user_id = auth.uid()
--      Fast path covering ~90% of queries. Uses user_id index, O(log n).
--   2. "shared_select_study_sets" → all non-owner access in one policy.
--      Single OR tree lets the planner optimize holistically. Includes a
--      folder_id IS NOT NULL guard to skip the expensive folder subquery
--      for sets that aren't in any folder.

-- Drop all existing SELECT policies (safe; INSERT/UPDATE/DELETE untouched)
DROP POLICY IF EXISTS "Users can view own study_sets" ON public.study_sets;
DROP POLICY IF EXISTS "Public sets are viewable by everyone" ON public.study_sets;
DROP POLICY IF EXISTS "Users can view sets shared with them" ON public.study_sets;
DROP POLICY IF EXISTS "Users can view sets with active share links" ON public.study_sets;
-- Also drop any leftover policies from earlier/rolled-back migrations
DROP POLICY IF EXISTS "Users can view sets shared with their email" ON public.study_sets;
DROP POLICY IF EXISTS "Users can do everything on own study_sets" ON public.study_sets;

-- Policy 1: Owner access (simple, indexed — short-circuits for most queries)
CREATE POLICY "owner_select_study_sets"
  ON public.study_sets FOR SELECT
  USING (user_id = auth.uid());

-- Policy 2: Non-owner access (public, shared, link-shared, folder-shared)
CREATE POLICY "shared_select_study_sets"
  ON public.study_sets FOR SELECT
  USING (
    -- Public via legacy visibility column or sharing_mode
    visibility = 'public'
    OR sharing_mode IN ('public', 'link')

    -- Direct sharing permission (by user_id or email)
    OR EXISTS (
      SELECT 1 FROM public.sharing_permissions sp
      WHERE sp.item_type = 'set'
        AND sp.item_id = study_sets.id
        AND (
          sp.shared_with_user_id = auth.uid()
          OR sp.shared_with_email = (auth.jwt() ->> 'email')
        )
        AND (sp.expires_at IS NULL OR sp.expires_at > now())
    )

    -- Active share link exists for this set
    OR EXISTS (
      SELECT 1 FROM public.share_links sl
      WHERE sl.item_type = 'set'
        AND sl.item_id = study_sets.id
        AND sl.is_active = true
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
        AND (sl.max_uses IS NULL OR sl.access_count < sl.max_uses)
    )

    -- Folder-level sharing (guarded: only runs when set is in a folder)
    OR (
      folder_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.folders f
        WHERE f.id = study_sets.folder_id
          AND (
            f.sharing_mode IN ('public', 'link')
            OR EXISTS (
              SELECT 1 FROM public.sharing_permissions sp
              WHERE sp.item_type = 'folder'
                AND sp.item_id = f.id
                AND sp.shared_with_user_id = auth.uid()
                AND (sp.expires_at IS NULL OR sp.expires_at > now())
            )
          )
      )
    )
  );


-- ============================================================
-- D. CONSOLIDATE sharing_permissions SELECT POLICIES (3 → 1)
-- ============================================================

DROP POLICY IF EXISTS "Users can view permissions they created" ON public.sharing_permissions;
DROP POLICY IF EXISTS "Users can view permissions shared with them" ON public.sharing_permissions;
DROP POLICY IF EXISTS "Users can view permissions shared with their email" ON public.sharing_permissions;
-- Drop rolled-back policy from migration 010 (011 should have removed it, but be safe)
DROP POLICY IF EXISTS "Users can view permissions for accessible items" ON public.sharing_permissions;

CREATE POLICY "select_sharing_permissions"
  ON public.sharing_permissions FOR SELECT
  USING (
    shared_by_user_id = auth.uid()
    OR shared_with_user_id = auth.uid()
    OR shared_with_email = (auth.jwt() ->> 'email')
  );


-- ============================================================
-- E. REUSABLE CLEANUP FUNCTION
-- ============================================================
-- Call periodically via pg_cron, a Supabase Edge Function cron,
-- or from the app (e.g., supabase.rpc('cleanup_stale_data') on login).

CREATE OR REPLACE FUNCTION public.cleanup_stale_data()
RETURNS jsonb AS $$
DECLARE
  v_sessions int;
  v_logins int;
  v_resets int;
BEGIN
  -- Expired live game sessions (FK cascade deletes participants + answers)
  DELETE FROM public.live_game_sessions WHERE expires_at < now();
  GET DIAGNOSTICS v_sessions = ROW_COUNT;

  -- Failed login attempts older than 1 hour
  DELETE FROM public.failed_login_attempts
  WHERE attempted_at < (now() - interval '1 hour');
  GET DIAGNOSTICS v_logins = ROW_COUNT;

  -- Password reset requests older than 24 hours
  DELETE FROM public.password_reset_requests
  WHERE requested_at < (now() - interval '24 hours');
  GET DIAGNOSTICS v_resets = ROW_COUNT;

  RETURN jsonb_build_object(
    'expired_sessions', v_sessions,
    'old_login_attempts', v_logins,
    'old_reset_requests', v_resets
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- F. AUTOMATIC CLEANUP VIA pg_cron (if available)
-- ============================================================
-- pg_cron is available on Supabase Pro plans. On free tier this
-- block silently does nothing — call cleanup_stale_data() from
-- app code instead (e.g., on auth state change or via Edge Function cron).

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any existing job with this name
    PERFORM cron.unschedule('cleanup_stale_data');
    -- Schedule hourly cleanup
    PERFORM cron.schedule(
      'cleanup_stale_data',
      '0 * * * *',
      'SELECT public.cleanup_stale_data()'
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron not available or insufficient permissions — skip silently
  NULL;
END $$;


-- ============================================================
-- G. LIGHTWEIGHT get_public_sets() — omit full cards JSONB
-- ============================================================
-- The original get_public_sets() (migration 002) returns the entire cards
-- JSONB array, which can be megabytes per set if cards contain base64 images.
-- The public browse page only needs metadata + card count.

DROP FUNCTION IF EXISTS public.get_public_sets();
CREATE FUNCTION public.get_public_sets()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  title text,
  description text,
  tags jsonb,
  card_count int,
  created_at bigint,
  updated_at bigint,
  last_studied bigint,
  study_stats jsonb,
  visibility text,
  sharing_mode text,
  folder_id uuid,
  owner_email text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.title,
    s.description,
    s.tags,
    jsonb_array_length(s.cards)::int AS card_count,
    s.created_at,
    s.updated_at,
    s.last_studied,
    s.study_stats,
    s.visibility,
    s.sharing_mode::text,
    s.folder_id,
    u.email::text AS owner_email
  FROM public.study_sets s
  LEFT JOIN auth.users u ON u.id = s.user_id
  WHERE s.visibility = 'public' OR s.sharing_mode = 'public'
  ORDER BY s.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- H. REFRESH QUERY PLANNER STATISTICS
-- ============================================================
-- After data cleanup and index changes, update planner stats so
-- PostgreSQL chooses optimal query plans.

ANALYZE public.study_sets;
ANALYZE public.sharing_permissions;
ANALYZE public.share_links;
ANALYZE public.folders;
ANALYZE public.folder_items;
ANALYZE public.live_game_sessions;
ANALYZE public.live_game_participants;
ANALYZE public.live_game_answers;
ANALYZE public.failed_login_attempts;
ANALYZE public.password_reset_requests;
