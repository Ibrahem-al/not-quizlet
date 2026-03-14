-- Migration 012: Allow anonymous access to sets via share link token
--
-- Instead of adding RLS policies (which caused performance issues in 010),
-- use a SECURITY DEFINER function that validates the token and returns set data.
-- This is safe because:
--   1. No RLS changes — zero risk of performance degradation
--   2. The function validates the token before returning data
--   3. It increments the access count for analytics

CREATE OR REPLACE FUNCTION public.get_set_by_share_token(p_token text)
RETURNS jsonb AS $$
DECLARE
  v_link RECORD;
  v_set RECORD;
BEGIN
  -- Validate the share link
  SELECT sl.item_type, sl.item_id, sl.permission_level
  INTO v_link
  FROM public.share_links sl
  WHERE sl.token = p_token
    AND sl.is_active = true
    AND (sl.expires_at IS NULL OR sl.expires_at > now())
    AND (sl.max_uses IS NULL OR sl.access_count < sl.max_uses);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Only support sets (not folders) for anonymous access
  IF v_link.item_type != 'set' THEN
    RETURN NULL;
  END IF;

  -- Fetch the set
  SELECT * INTO v_set
  FROM public.study_sets
  WHERE id = v_link.item_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Increment access count
  UPDATE public.share_links
  SET access_count = access_count + 1
  WHERE token = p_token;

  -- Return set data as JSON
  RETURN jsonb_build_object(
    'id', v_set.id,
    'user_id', v_set.user_id,
    'title', v_set.title,
    'description', v_set.description,
    'tags', v_set.tags,
    'cards', v_set.cards,
    'created_at', v_set.created_at,
    'updated_at', v_set.updated_at,
    'last_studied', v_set.last_studied,
    'study_stats', v_set.study_stats,
    'visibility', v_set.visibility,
    'sharing_mode', v_set.sharing_mode,
    'folder_id', v_set.folder_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
