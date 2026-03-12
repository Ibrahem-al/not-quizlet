-- Migration 007: Comprehensive Sharing Fix (Fully Idempotent)
--
-- Run this in the Supabase SQL Editor to fix ALL sharing issues.
-- Safe to run even if migrations 004, 005, or 006 were already applied.
-- Uses CREATE IF NOT EXISTS, DROP IF EXISTS, and EXCEPTION handling throughout.

-- ============================================================
-- 1. ENUM TYPES (idempotent via exception handling)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE sharing_mode AS ENUM ('private', 'restricted', 'link', 'public');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE permission_level AS ENUM ('owner', 'editor', 'viewer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE item_type AS ENUM ('set', 'folder');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 2. FOLDERS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  parent_folder_id uuid NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  color text DEFAULT 'blue',
  sharing_mode sharing_mode DEFAULT 'private',
  created_at bigint NOT NULL DEFAULT extract(epoch FROM now())*1000,
  updated_at bigint NOT NULL DEFAULT extract(epoch FROM now())*1000
);

CREATE INDEX IF NOT EXISTS idx_folders_user_id ON public.folders(user_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON public.folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_sharing_mode ON public.folders(sharing_mode);

-- ============================================================
-- 3. FOLDER ITEMS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.folder_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  item_type item_type NOT NULL DEFAULT 'set',
  item_id uuid NOT NULL,
  added_at bigint NOT NULL DEFAULT extract(epoch FROM now())*1000,
  added_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE(folder_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_folder_items_folder_id ON public.folder_items(folder_id);
CREATE INDEX IF NOT EXISTS idx_folder_items_item_id ON public.folder_items(item_id);

-- ============================================================
-- 4. SHARING PERMISSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.sharing_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type item_type NOT NULL,
  item_id uuid NOT NULL,
  shared_with_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email text,
  permission_level permission_level NOT NULL,
  shared_by_user_id uuid NOT NULL REFERENCES auth.users(id),
  shared_at timestamptz DEFAULT now(),
  expires_at timestamptz NULL,
  UNIQUE(item_type, item_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_sharing_permissions_item ON public.sharing_permissions(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_sharing_permissions_user ON public.sharing_permissions(shared_with_user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_permissions_shared_by ON public.sharing_permissions(shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_sharing_permissions_email ON public.sharing_permissions(shared_with_email);

-- ============================================================
-- 5. SHARE LINKS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type item_type NOT NULL,
  item_id uuid NOT NULL,
  token text UNIQUE NOT NULL,
  permission_level permission_level NOT NULL CHECK (permission_level IN ('editor', 'viewer')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NULL,
  access_count int DEFAULT 0,
  max_uses int NULL,
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_share_links_token ON public.share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_item ON public.share_links(item_type, item_id);
CREATE INDEX IF NOT EXISTS idx_share_links_created_by ON public.share_links(created_by);

-- ============================================================
-- 6. UPDATE STUDY_SETS TABLE (add sharing columns)
-- ============================================================

ALTER TABLE public.study_sets
  ADD COLUMN IF NOT EXISTS sharing_mode sharing_mode DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_sets_sharing_mode ON public.study_sets(sharing_mode);
CREATE INDEX IF NOT EXISTS idx_study_sets_folder_id ON public.study_sets(folder_id);

-- ============================================================
-- 7. RPC FUNCTIONS (CREATE OR REPLACE = idempotent)
-- ============================================================

-- Get effective permission for a user on an item
CREATE OR REPLACE FUNCTION public.get_effective_permission(
  p_item_type item_type,
  p_item_id uuid,
  p_user_id uuid
) RETURNS permission_level AS $$
DECLARE
  v_owner_id uuid;
  v_direct_permission permission_level;
  v_folder_permission permission_level;
  v_item_folder_id uuid;
  v_folder_sharing_mode sharing_mode;
BEGIN
  -- Check ownership
  IF p_item_type = 'set' THEN
    SELECT user_id INTO v_owner_id FROM public.study_sets WHERE id = p_item_id;
  ELSIF p_item_type = 'folder' THEN
    SELECT user_id INTO v_owner_id FROM public.folders WHERE id = p_item_id;
  END IF;

  IF v_owner_id = p_user_id THEN
    RETURN 'owner';
  END IF;

  -- Check direct sharing_permissions
  SELECT permission_level INTO v_direct_permission
  FROM public.sharing_permissions
  WHERE item_type = p_item_type
    AND item_id = p_item_id
    AND shared_with_user_id = p_user_id
    AND (expires_at IS NULL OR expires_at > now());

  IF v_direct_permission IS NOT NULL THEN
    RETURN v_direct_permission;
  END IF;

  -- For sets: check folder permissions
  IF p_item_type = 'set' THEN
    SELECT folder_id INTO v_item_folder_id FROM public.study_sets WHERE id = p_item_id;

    IF v_item_folder_id IS NOT NULL THEN
      SELECT permission_level INTO v_folder_permission
      FROM public.sharing_permissions
      WHERE item_type = 'folder'
        AND item_id = v_item_folder_id
        AND shared_with_user_id = p_user_id
        AND (expires_at IS NULL OR expires_at > now());

      IF v_folder_permission IS NOT NULL THEN
        RETURN v_folder_permission;
      END IF;

      SELECT sharing_mode INTO v_folder_sharing_mode
      FROM public.folders WHERE id = v_item_folder_id;

      IF v_folder_sharing_mode = 'public' THEN
        RETURN 'viewer';
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate a share link token
CREATE OR REPLACE FUNCTION public.validate_share_link(
  p_token text
) RETURNS TABLE (
  item_type item_type,
  item_id uuid,
  permission_level permission_level
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sl.item_type,
    sl.item_id,
    sl.permission_level
  FROM public.share_links sl
  WHERE sl.token = p_token
    AND sl.is_active = true
    AND (sl.expires_at IS NULL OR sl.expires_at > now())
    AND (sl.max_uses IS NULL OR sl.access_count < sl.max_uses);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment share link access count
CREATE OR REPLACE FUNCTION public.increment_share_link_access(
  p_token text
) RETURNS void AS $$
BEGIN
  UPDATE public.share_links
  SET access_count = access_count + 1
  WHERE token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get folder contents recursively
CREATE OR REPLACE FUNCTION public.get_folder_recursive_contents(
  p_folder_id uuid
) RETURNS TABLE (
  item_id uuid,
  item_type item_type,
  depth int
) AS $$
BEGIN
  RETURN QUERY
  SELECT fi.item_id, fi.item_type, 1 AS depth
  FROM public.folder_items fi
  WHERE fi.folder_id = p_folder_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cascade folder sharing mode to contained sets
CREATE OR REPLACE FUNCTION public.cascade_folder_permissions(
  p_folder_id uuid,
  p_sharing_mode sharing_mode
) RETURNS void AS $$
BEGIN
  UPDATE public.study_sets ss
  SET sharing_mode = p_sharing_mode
  WHERE ss.folder_id = p_folder_id
    AND NOT EXISTS (
      SELECT 1 FROM public.sharing_permissions sp
      WHERE sp.item_type = 'set' AND sp.item_id = ss.id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Look up user emails by ID array (SECURITY DEFINER to access auth.users)
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE (user_id uuid, email text) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email::text
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update folder updated_at
CREATE OR REPLACE FUNCTION public.update_folder_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = extract(epoch FROM now())*1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cascade folder sharing change to sets
CREATE OR REPLACE FUNCTION public.handle_folder_sharing_change()
RETURNS trigger AS $$
BEGIN
  IF OLD.sharing_mode IS DISTINCT FROM NEW.sharing_mode THEN
    PERFORM public.cascade_folder_permissions(NEW.id, NEW.sharing_mode);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 8. TRIGGERS (idempotent via DROP IF EXISTS)
-- ============================================================

DROP TRIGGER IF EXISTS trigger_update_folder_timestamp ON public.folders;
CREATE TRIGGER trigger_update_folder_timestamp
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_folder_timestamp();

DROP TRIGGER IF EXISTS trigger_folder_sharing_change ON public.folders;
CREATE TRIGGER trigger_folder_sharing_change
  AFTER UPDATE ON public.folders
  FOR EACH ROW
  WHEN (OLD.sharing_mode IS DISTINCT FROM NEW.sharing_mode)
  EXECUTE FUNCTION public.handle_folder_sharing_change();

-- ============================================================
-- 9. ENABLE ROW LEVEL SECURITY (idempotent)
-- ============================================================

ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sharing_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. RLS POLICIES — FOLDERS (idempotent)
-- ============================================================

DROP POLICY IF EXISTS "Users can view own folders" ON public.folders;
CREATE POLICY "Users can view own folders"
  ON public.folders FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view shared folders" ON public.folders;
CREATE POLICY "Users can view shared folders"
  ON public.folders FOR SELECT
  USING (
    sharing_mode IN ('public', 'link')
    OR EXISTS (
      SELECT 1 FROM public.sharing_permissions sp
      WHERE sp.item_type = 'folder'
        AND sp.item_id = folders.id
        AND sp.shared_with_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create folders" ON public.folders;
CREATE POLICY "Users can create folders"
  ON public.folders FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own folders" ON public.folders;
CREATE POLICY "Users can update own folders"
  ON public.folders FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own folders" ON public.folders;
CREATE POLICY "Users can delete own folders"
  ON public.folders FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 11. RLS POLICIES — FOLDER ITEMS (idempotent)
-- ============================================================

DROP POLICY IF EXISTS "Users can view folder items" ON public.folder_items;
CREATE POLICY "Users can view folder items"
  ON public.folder_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.folders f
      WHERE f.id = folder_items.folder_id
        AND (
          f.user_id = auth.uid()
          OR f.sharing_mode IN ('public', 'link')
          OR EXISTS (
            SELECT 1 FROM public.sharing_permissions sp
            WHERE sp.item_type = 'folder'
              AND sp.item_id = f.id
              AND sp.shared_with_user_id = auth.uid()
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can add items to own folders" ON public.folder_items;
CREATE POLICY "Users can add items to own folders"
  ON public.folder_items FOR INSERT
  WITH CHECK (
    added_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.folders f
      WHERE f.id = folder_items.folder_id
        AND f.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can remove items from own folders" ON public.folder_items;
CREATE POLICY "Users can remove items from own folders"
  ON public.folder_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.folders f
      WHERE f.id = folder_items.folder_id
        AND f.user_id = auth.uid()
    )
  );

-- ============================================================
-- 12. RLS POLICIES — SHARING PERMISSIONS (idempotent)
-- ============================================================

DROP POLICY IF EXISTS "Users can view permissions they created" ON public.sharing_permissions;
CREATE POLICY "Users can view permissions they created"
  ON public.sharing_permissions FOR SELECT
  USING (shared_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view permissions shared with them" ON public.sharing_permissions;
CREATE POLICY "Users can view permissions shared with them"
  ON public.sharing_permissions FOR SELECT
  USING (shared_with_user_id = auth.uid());

-- From migration 005: email-based invite visibility
DROP POLICY IF EXISTS "Users can view permissions shared with their email" ON public.sharing_permissions;
CREATE POLICY "Users can view permissions shared with their email"
  ON public.sharing_permissions FOR SELECT
  USING (
    shared_with_email = (auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "Users can create sharing permissions for their items" ON public.sharing_permissions;
CREATE POLICY "Users can create sharing permissions for their items"
  ON public.sharing_permissions FOR INSERT
  WITH CHECK (
    shared_by_user_id = auth.uid()
    AND (
      (item_type = 'set' AND EXISTS (
        SELECT 1 FROM public.study_sets s WHERE s.id = item_id AND s.user_id = auth.uid()
      ))
      OR (item_type = 'folder' AND EXISTS (
        SELECT 1 FROM public.folders f WHERE f.id = item_id AND f.user_id = auth.uid()
      ))
    )
  );

-- From migration 005: allow accepting a share link (self-insert)
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

-- From migration 006: UPDATE policy (was missing — broke updateUserPermission)
DROP POLICY IF EXISTS "Users can update permissions they created" ON public.sharing_permissions;
CREATE POLICY "Users can update permissions they created"
  ON public.sharing_permissions FOR UPDATE
  USING (shared_by_user_id = auth.uid())
  WITH CHECK (shared_by_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own sharing permissions" ON public.sharing_permissions;
CREATE POLICY "Users can delete their own sharing permissions"
  ON public.sharing_permissions FOR DELETE
  USING (shared_by_user_id = auth.uid());

-- ============================================================
-- 13. RLS POLICIES — SHARE LINKS (idempotent)
-- ============================================================

DROP POLICY IF EXISTS "Users can view their share links" ON public.share_links;
CREATE POLICY "Users can view their share links"
  ON public.share_links FOR SELECT
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Anyone can view active share links" ON public.share_links;
CREATE POLICY "Anyone can view active share links"
  ON public.share_links FOR SELECT
  USING (
    is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_uses IS NULL OR access_count < max_uses)
  );

DROP POLICY IF EXISTS "Users can create share links for their items" ON public.share_links;
CREATE POLICY "Users can create share links for their items"
  ON public.share_links FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND (
      (item_type = 'set' AND EXISTS (
        SELECT 1 FROM public.study_sets s WHERE s.id = item_id AND s.user_id = auth.uid()
      ))
      OR (item_type = 'folder' AND EXISTS (
        SELECT 1 FROM public.folders f WHERE f.id = item_id AND f.user_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "Users can update their share links" ON public.share_links;
CREATE POLICY "Users can update their share links"
  ON public.share_links FOR UPDATE
  USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete their share links" ON public.share_links;
CREATE POLICY "Users can delete their share links"
  ON public.share_links FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================
-- 14. RLS POLICIES — STUDY SETS (sharing-related, idempotent)
-- ============================================================

-- Drop old overly-broad policy from migration 001 if it exists
DROP POLICY IF EXISTS "Users can do everything on own study_sets" ON public.study_sets;

-- Policy from migration 004: shared via permissions or public/link mode
DROP POLICY IF EXISTS "Users can view sets shared with them" ON public.study_sets;
CREATE POLICY "Users can view sets shared with them"
  ON public.study_sets FOR SELECT
  USING (
    sharing_mode IN ('public', 'link')
    OR EXISTS (
      SELECT 1 FROM public.sharing_permissions sp
      WHERE sp.item_type = 'set'
        AND sp.item_id = study_sets.id
        AND sp.shared_with_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.folders f
      WHERE f.id = study_sets.folder_id
        AND (
          f.sharing_mode IN ('public', 'link')
          OR EXISTS (
            SELECT 1 FROM public.sharing_permissions sp
            WHERE sp.item_type = 'folder'
              AND sp.item_id = f.id
              AND sp.shared_with_user_id = auth.uid()
          )
        )
    )
  );

-- Policy from migration 006: allow viewing a set when ANY active share link exists
-- (allows recipients to read the set even before they have a sharing_permissions row)
DROP POLICY IF EXISTS "Users can view sets with active share links" ON public.study_sets;
CREATE POLICY "Users can view sets with active share links"
  ON public.study_sets FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.share_links sl
      WHERE sl.item_type   = 'set'
        AND sl.item_id     = study_sets.id
        AND sl.is_active   = true
        AND (sl.expires_at IS NULL OR sl.expires_at > now())
        AND (sl.max_uses   IS NULL OR sl.access_count < sl.max_uses)
    )
  );

-- ============================================================
-- 15. OWNER CRUD POLICIES FOR STUDY_SETS
-- ============================================================
-- Migration 001 created a single "for all" policy; migration 002 added granular
-- policies. We recreate all of them here so 007 is self-contained and safe to
-- run regardless of which earlier migrations were applied.

DROP POLICY IF EXISTS "Users can view own study_sets" ON public.study_sets;
CREATE POLICY "Users can view own study_sets"
  ON public.study_sets FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Public sets are viewable by everyone" ON public.study_sets;
CREATE POLICY "Public sets are viewable by everyone"
  ON public.study_sets FOR SELECT
  USING (visibility = 'public');

DROP POLICY IF EXISTS "Users can insert own study_sets" ON public.study_sets;
CREATE POLICY "Users can insert own study_sets"
  ON public.study_sets FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can modify own study_sets" ON public.study_sets;
CREATE POLICY "Users can modify own study_sets"
  ON public.study_sets FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own study_sets" ON public.study_sets;
CREATE POLICY "Users can delete own study_sets"
  ON public.study_sets FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- 16. MIGRATE EXISTING DATA (safe no-op if already done)
-- ============================================================

UPDATE public.study_sets
SET sharing_mode = CASE
  WHEN visibility = 'public' THEN 'public'::sharing_mode
  ELSE 'private'::sharing_mode
END
WHERE sharing_mode IS NULL;
