-- Live game sessions (Kahoot-like feature)
-- Host's browser is the game master; Supabase Realtime is used as message relay.

create table if not exists public.live_game_sessions (
  id                     uuid primary key default gen_random_uuid(),
  game_code              text unique not null,
  host_user_id           uuid not null references auth.users(id) on delete cascade,
  set_id                 uuid not null,
  set_snapshot           jsonb not null default '[]',  -- card array at game start
  status                 text not null default 'lobby'
                           check (status in ('lobby', 'active', 'finished')),
  question_count         int not null default 0,
  current_question_index int not null default 0,
  created_at             timestamptz default now(),
  started_at             timestamptz null,
  finished_at            timestamptz null,
  expires_at             timestamptz not null default (now() + interval '4 hours')
);

create index if not exists idx_live_sessions_game_code on public.live_game_sessions(game_code);
create index if not exists idx_live_sessions_host on public.live_game_sessions(host_user_id);
create index if not exists idx_live_sessions_status on public.live_game_sessions(status);
create index if not exists idx_live_sessions_expires on public.live_game_sessions(expires_at);

create table if not exists public.live_game_participants (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.live_game_sessions(id) on delete cascade,
  nickname     text not null,
  player_token text unique not null,  -- random UUID stored in client sessionStorage
  score        int not null default 0,
  streak       int not null default 0,
  is_host      boolean not null default false,
  joined_at    timestamptz default now()
);

create index if not exists idx_live_participants_session on public.live_game_participants(session_id);
create index if not exists idx_live_participants_token on public.live_game_participants(player_token);

create table if not exists public.live_game_answers (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.live_game_sessions(id) on delete cascade,
  participant_id uuid not null references public.live_game_participants(id) on delete cascade,
  question_index int not null,
  chosen_option  int not null,    -- 0-3 index into the shuffled options array
  is_correct     boolean not null,
  time_taken_ms  int not null,
  points_earned  int not null default 0,
  answered_at    timestamptz default now(),
  unique(session_id, participant_id, question_index)
);

create index if not exists idx_live_answers_session on public.live_game_answers(session_id);
create index if not exists idx_live_answers_participant on public.live_game_answers(participant_id);

-- RLS
alter table public.live_game_sessions enable row level security;
alter table public.live_game_participants enable row level security;
alter table public.live_game_answers enable row level security;

-- Sessions: anyone can read active/lobby sessions (for the join flow)
create policy "Anyone can read active sessions"
  on public.live_game_sessions for select
  using (status in ('lobby', 'active', 'finished') and expires_at > now());

-- Only authenticated host can create sessions
create policy "Host can create sessions"
  on public.live_game_sessions for insert
  with check (host_user_id = auth.uid());

-- Only host can update their session
create policy "Host can update session"
  on public.live_game_sessions for update
  using (host_user_id = auth.uid());

-- Participants: guests can insert (anon key is fine)
create policy "Anyone can join as participant"
  on public.live_game_participants for insert
  with check (true);

create policy "Participants visible within active session"
  on public.live_game_participants for select
  using (
    exists (
      select 1 from public.live_game_sessions s
      where s.id = session_id
        and s.status in ('lobby', 'active', 'finished')
        and s.expires_at > now()
    )
  );

create policy "Participant can update own row"
  on public.live_game_participants for update
  using (true);  -- token-gated in application code; guests are anon

-- Answers: guests can submit
create policy "Anyone can submit answers"
  on public.live_game_answers for insert
  with check (true);

create policy "Answers visible within session"
  on public.live_game_answers for select
  using (
    exists (
      select 1 from public.live_game_sessions s
      where s.id = session_id and s.expires_at > now()
    )
  );

-- Generate a unique 6-digit game code
create or replace function public.generate_game_code()
returns text as $$
declare
  v_code text;
  v_exists boolean;
begin
  loop
    v_code := lpad(floor(random() * 1000000)::int::text, 6, '0');
    select exists(
      select 1 from public.live_game_sessions
      where game_code = v_code
        and status in ('lobby', 'active')
        and expires_at > now()
    ) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$ language plpgsql security definer;

-- Cleanup expired sessions
create or replace function public.cleanup_expired_sessions()
returns void as $$
begin
  delete from public.live_game_sessions where expires_at < now();
end;
$$ language plpgsql security definer;
