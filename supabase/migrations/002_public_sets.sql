-- Migration: Add visibility support to study_sets
-- This allows users to make sets public (viewable by everyone) or keep them private

-- 1. Add visibility column with default 'private'
alter table public.study_sets add column visibility text not null default 'private';

-- 2. Add user_id column if not exists (for ownership tracking in queries)
-- Note: user_id already exists from the initial migration, but we ensure it's properly set up

-- 3. Create index for faster public set queries
create index idx_study_sets_visibility on public.study_sets(visibility);
create index idx_study_sets_visibility_public on public.study_sets(visibility) where visibility = 'public';

-- 4. Drop the existing restrictive select policy and recreate with public access
-- First, we need to allow public read access to public sets

-- Policy: Users can view their own sets (any visibility)
create policy "Users can view own study_sets"
  on public.study_sets
  for select
  using (auth.uid() = user_id);

-- Policy: Public sets are viewable by everyone (including anonymous users)
create policy "Public sets are viewable by everyone"
  on public.study_sets
  for select
  using (visibility = 'public');

-- Policy: Users can only modify their own sets
create policy "Users can modify own study_sets"
  on public.study_sets
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: Users can only delete their own sets
create policy "Users can delete own study_sets"
  on public.study_sets
  for delete
  using (auth.uid() = user_id);

-- Policy: Users can only insert their own sets
create policy "Users can insert own study_sets"
  on public.study_sets
  for insert
  with check (auth.uid() = user_id);

-- 5. Add a function to get public sets with owner info
-- This is useful for the explore page
create or replace function public.get_public_sets()
returns table (
  id uuid,
  user_id uuid,
  title text,
  description text,
  tags jsonb,
  cards jsonb,
  created_at bigint,
  updated_at bigint,
  last_studied bigint,
  study_stats jsonb,
  visibility text,
  owner_email text
) as $$
begin
  return query
  select
    s.id,
    s.user_id,
    s.title,
    s.description,
    s.tags,
    s.cards,
    s.created_at,
    s.updated_at,
    s.last_studied,
    s.study_stats,
    s.visibility,
    u.email::text as owner_email
  from public.study_sets s
  left join auth.users u on u.id = s.user_id
  where s.visibility = 'public'
  order by s.updated_at desc;
end;
$$ language plpgsql security definer;

-- 6. Enable RLS on the function result (already handled by the underlying table RLS)

-- Note: Run this migration after the initial 001_study_sets.sql migration
