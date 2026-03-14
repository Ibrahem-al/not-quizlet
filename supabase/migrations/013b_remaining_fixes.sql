-- 013b: Run this after 013 failed at get_public_sets().
-- Everything before this (cleanup, indexes, policies) already applied.

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
