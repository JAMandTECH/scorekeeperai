-- ScorePilot AI relational schema
-- Stored in GitHub first. Apply only after the target Supabase project is restored/active
-- and the migration has been reviewed.

create extension if not exists pgcrypto;

create table if not exists public.scorepilot_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  logo_url text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scorepilot_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scorepilot_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.scorepilot_teams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scorepilot_organizations(id) on delete cascade,
  name text not null,
  sport text not null check (sport in ('basketball','volleyball')),
  division text,
  coach_name text,
  coach_contact text,
  logo_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  wins integer not null default 0,
  losses integer not null default 0,
  submitted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scorepilot_players (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scorepilot_organizations(id) on delete cascade,
  team_id uuid references public.scorepilot_teams(id) on delete set null,
  name text not null,
  jersey_number text,
  email text,
  phone text,
  position text,
  photo_url text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scorepilot_divisions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scorepilot_organizations(id) on delete cascade,
  name text not null,
  sport text not null check (sport in ('basketball','volleyball')),
  season text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, sport, name, season)
);

create table if not exists public.scorepilot_games (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scorepilot_organizations(id) on delete cascade,
  division_id uuid references public.scorepilot_divisions(id) on delete set null,
  home_team_id uuid not null references public.scorepilot_teams(id) on delete restrict,
  away_team_id uuid not null references public.scorepilot_teams(id) on delete restrict,
  sport text not null check (sport in ('basketball','volleyball')),
  game_date timestamptz not null,
  court_number text,
  duration_hours numeric not null default 1.5,
  location text,
  status text not null default 'scheduled' check (status in ('scheduled','in_progress','completed')),
  archived boolean not null default false,
  game_type text not null default 'regular_season',
  assigned_scorekeeper_emails text[] not null default '{}',
  overall_scorekeeper_email text,
  home_statistician_email text,
  away_statistician_email text,
  recurring_series_id text,
  week_number integer,
  division text,
  home_score integer not null default 0,
  away_score integer not null default 0,
  quarter_scores jsonb not null default '[]'::jsonb,
  current_quarter integer not null default 1,
  overtime_count integer not null default 0,
  home_timeouts integer not null default 5,
  away_timeouts integer not null default 5,
  home_team_fouls integer not null default 0,
  away_team_fouls integer not null default 0,
  penalty_limit_per_quarter integer not null default 5,
  player_foul_limit integer not null default 5,
  stream_url text,
  notes text,
  is_default boolean not null default false,
  defaulted_team_id uuid references public.scorepilot_teams(id) on delete set null,
  winning_team_id uuid references public.scorepilot_teams(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table if not exists public.scorepilot_player_game_stats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.scorepilot_games(id) on delete cascade,
  player_id uuid not null references public.scorepilot_players(id) on delete cascade,
  team_id uuid not null references public.scorepilot_teams(id) on delete restrict,
  quarter integer not null check (quarter >= 1),
  points integer not null default 0,
  rebounds integer not null default 0,
  assists integer not null default 0,
  steals integer not null default 0,
  blocks integer not null default 0,
  fouls integer not null default 0,
  three_pointers integer not null default 0,
  field_goals_made integer not null default 0,
  field_goals_attempted integer not null default 0,
  free_throws_made integer not null default 0,
  free_throws_attempted integer not null default 0,
  aces integer not null default 0,
  attacks integer not null default 0,
  rally_errors integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (game_id, player_id, quarter)
);

create table if not exists public.scorepilot_player_season_stats (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.scorepilot_organizations(id) on delete cascade,
  season text,
  player_id uuid not null references public.scorepilot_players(id) on delete cascade,
  team_id uuid references public.scorepilot_teams(id) on delete set null,
  sport text not null check (sport in ('basketball','volleyball')),
  games_played integer not null default 0,
  points integer not null default 0,
  rebounds integer not null default 0,
  assists integer not null default 0,
  steals integer not null default 0,
  blocks integer not null default 0,
  fouls integer not null default 0,
  three_pointers integer not null default 0,
  field_goals_made integer not null default 0,
  field_goals_attempted integer not null default 0,
  free_throws_made integer not null default 0,
  free_throws_attempted integer not null default 0,
  aces integer not null default 0,
  attacks integer not null default 0,
  rally_errors integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, season, player_id, sport)
);

create table if not exists public.scorepilot_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.scorepilot_organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text,
  title text,
  message text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_scorepilot_memberships_user on public.scorepilot_memberships(user_id);
create index if not exists idx_scorepilot_teams_org on public.scorepilot_teams(organization_id);
create index if not exists idx_scorepilot_players_org on public.scorepilot_players(organization_id);
create index if not exists idx_scorepilot_players_team on public.scorepilot_players(team_id);
create index if not exists idx_scorepilot_games_org_date on public.scorepilot_games(organization_id, game_date desc);
create index if not exists idx_scorepilot_games_status on public.scorepilot_games(status);
create index if not exists idx_scorepilot_games_home on public.scorepilot_games(home_team_id);
create index if not exists idx_scorepilot_games_away on public.scorepilot_games(away_team_id);
create index if not exists idx_scorepilot_game_stats_game on public.scorepilot_player_game_stats(game_id);
create index if not exists idx_scorepilot_game_stats_player on public.scorepilot_player_game_stats(player_id);
create index if not exists idx_scorepilot_season_stats_org on public.scorepilot_player_season_stats(organization_id);
create index if not exists idx_scorepilot_notifications_user on public.scorepilot_notifications(user_id, created_at desc);

create or replace function public.scorepilot_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_scorepilot_org_updated on public.scorepilot_organizations;
create trigger trg_scorepilot_org_updated before update on public.scorepilot_organizations for each row execute function public.scorepilot_touch_updated_at();
drop trigger if exists trg_scorepilot_membership_updated on public.scorepilot_memberships;
create trigger trg_scorepilot_membership_updated before update on public.scorepilot_memberships for each row execute function public.scorepilot_touch_updated_at();
drop trigger if exists trg_scorepilot_team_updated on public.scorepilot_teams;
create trigger trg_scorepilot_team_updated before update on public.scorepilot_teams for each row execute function public.scorepilot_touch_updated_at();
drop trigger if exists trg_scorepilot_player_updated on public.scorepilot_players;
create trigger trg_scorepilot_player_updated before update on public.scorepilot_players for each row execute function public.scorepilot_touch_updated_at();
drop trigger if exists trg_scorepilot_division_updated on public.scorepilot_divisions;
create trigger trg_scorepilot_division_updated before update on public.scorepilot_divisions for each row execute function public.scorepilot_touch_updated_at();
drop trigger if exists trg_scorepilot_game_updated on public.scorepilot_games;
create trigger trg_scorepilot_game_updated before update on public.scorepilot_games for each row execute function public.scorepilot_touch_updated_at();
drop trigger if exists trg_scorepilot_game_stats_updated on public.scorepilot_player_game_stats;
create trigger trg_scorepilot_game_stats_updated before update on public.scorepilot_player_game_stats for each row execute function public.scorepilot_touch_updated_at();
drop trigger if exists trg_scorepilot_season_stats_updated on public.scorepilot_player_season_stats;
create trigger trg_scorepilot_season_stats_updated before update on public.scorepilot_player_season_stats for each row execute function public.scorepilot_touch_updated_at();

alter table public.scorepilot_organizations enable row level security;
alter table public.scorepilot_memberships enable row level security;
alter table public.scorepilot_teams enable row level security;
alter table public.scorepilot_players enable row level security;
alter table public.scorepilot_divisions enable row level security;
alter table public.scorepilot_games enable row level security;
alter table public.scorepilot_player_game_stats enable row level security;
alter table public.scorepilot_player_season_stats enable row level security;
alter table public.scorepilot_notifications enable row level security;

create or replace function public.scorepilot_is_org_member(org uuid)
returns boolean
language sql
stable
security invoker
as $$
  select exists (
    select 1 from public.scorepilot_memberships m
    where m.organization_id = org and m.user_id = (select auth.uid())
  );
$$;

-- Policies are scoped to authenticated users and organization membership.
drop policy if exists scorepilot_org_select on public.scorepilot_organizations;
create policy scorepilot_org_select on public.scorepilot_organizations for select to authenticated using (public.scorepilot_is_org_member(id));
drop policy if exists scorepilot_membership_select on public.scorepilot_memberships;
create policy scorepilot_membership_select on public.scorepilot_memberships for select to authenticated using (user_id = (select auth.uid()) or public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_team_select on public.scorepilot_teams;
create policy scorepilot_team_select on public.scorepilot_teams for select to authenticated using (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_team_write on public.scorepilot_teams;
create policy scorepilot_team_write on public.scorepilot_teams for all to authenticated using (public.scorepilot_is_org_member(organization_id)) with check (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_player_select on public.scorepilot_players;
create policy scorepilot_player_select on public.scorepilot_players for select to authenticated using (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_player_write on public.scorepilot_players;
create policy scorepilot_player_write on public.scorepilot_players for all to authenticated using (public.scorepilot_is_org_member(organization_id)) with check (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_division_select on public.scorepilot_divisions;
create policy scorepilot_division_select on public.scorepilot_divisions for select to authenticated using (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_division_write on public.scorepilot_divisions;
create policy scorepilot_division_write on public.scorepilot_divisions for all to authenticated using (public.scorepilot_is_org_member(organization_id)) with check (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_game_select on public.scorepilot_games;
create policy scorepilot_game_select on public.scorepilot_games for select to authenticated using (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_game_write on public.scorepilot_games;
create policy scorepilot_game_write on public.scorepilot_games for all to authenticated using (public.scorepilot_is_org_member(organization_id)) with check (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_game_stats_select on public.scorepilot_player_game_stats;
create policy scorepilot_game_stats_select on public.scorepilot_player_game_stats for select to authenticated using (exists (select 1 from public.scorepilot_games g where g.id = game_id and public.scorepilot_is_org_member(g.organization_id)));
drop policy if exists scorepilot_game_stats_write on public.scorepilot_player_game_stats;
create policy scorepilot_game_stats_write on public.scorepilot_player_game_stats for all to authenticated using (exists (select 1 from public.scorepilot_games g where g.id = game_id and public.scorepilot_is_org_member(g.organization_id))) with check (exists (select 1 from public.scorepilot_games g where g.id = game_id and public.scorepilot_is_org_member(g.organization_id)));
drop policy if exists scorepilot_season_stats_select on public.scorepilot_player_season_stats;
create policy scorepilot_season_stats_select on public.scorepilot_player_season_stats for select to authenticated using (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_season_stats_write on public.scorepilot_player_season_stats;
create policy scorepilot_season_stats_write on public.scorepilot_player_season_stats for all to authenticated using (public.scorepilot_is_org_member(organization_id)) with check (public.scorepilot_is_org_member(organization_id));
drop policy if exists scorepilot_notification_select on public.scorepilot_notifications;
create policy scorepilot_notification_select on public.scorepilot_notifications for select to authenticated using (user_id = (select auth.uid()) or (organization_id is not null and public.scorepilot_is_org_member(organization_id)));
