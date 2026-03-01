-- Study sets table: one row per set, owned by auth.users.
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor) if not using Supabase CLI.

create table if not exists public.study_sets (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default '',
  description text not null default '',
  tags jsonb not null default '[]',
  cards jsonb not null default '[]',
  created_at bigint not null default 0,
  updated_at bigint not null default 0,
  last_studied bigint not null default 0,
  study_stats jsonb not null default '{"totalSessions":0,"averageAccuracy":0,"streakDays":0}'
);

alter table public.study_sets enable row level security;

create policy "Users can do everything on own study_sets"
  on public.study_sets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists study_sets_user_id_idx on public.study_sets(user_id);
