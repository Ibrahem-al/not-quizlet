-- Migration: Fix sharing pipeline bugs
-- 1. Allow users to self-insert sharing_permissions when accepting share links
-- 2. Allow users to see permissions shared with their email
-- 3. Add RPC for looking up user emails (for SharedWithMe page)

-- ============================================
-- 1. NEW RLS POLICIES
-- ============================================

-- Policy: Users can accept share links (create permission for themselves)
-- This allows a user who clicks a valid share link to create their own
-- sharing_permissions entry, enabling persistent access to the shared item.
create policy "Users can accept share links for themselves"
  on public.sharing_permissions for insert
  with check (
    shared_with_user_id = auth.uid()
    and exists (
      select 1 from public.share_links sl
      where sl.item_type = sharing_permissions.item_type
        and sl.item_id = sharing_permissions.item_id
        and sl.is_active = true
        and (sl.expires_at is null or sl.expires_at > now())
        and (sl.max_uses is null or sl.access_count < sl.max_uses)
    )
  );

-- Policy: Users can view permissions shared with their email address
-- This enables email-based invites to appear in the recipient's "Shared with Me" page
-- even before the email is resolved to a user_id.
create policy "Users can view permissions shared with their email"
  on public.sharing_permissions for select
  using (
    shared_with_email = (select email from auth.users where id = auth.uid())
  );

-- ============================================
-- 2. NEW RPC FUNCTIONS
-- ============================================

-- Function: Look up user emails by their IDs
-- Used by the SharedWithMe page to display who shared an item.
-- Uses SECURITY DEFINER to access auth.users which is not directly queryable.
create or replace function public.get_user_emails(user_ids uuid[])
returns table (user_id uuid, email text) as $$
begin
  return query
  select u.id, u.email::text
  from auth.users u
  where u.id = any(user_ids);
end;
$$ language plpgsql security definer;
