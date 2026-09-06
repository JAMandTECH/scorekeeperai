-- ScorePilot AI RLS hardening.
-- Prevent recursive membership-policy evaluation while keeping authorization
-- scoped to the authenticated user's organization membership.

create schema if not exists scorepilot_private;

create or replace function scorepilot_private.is_org_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.scorepilot_memberships m
    where m.organization_id = org_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function scorepilot_private.is_org_member(uuid) from public;
grant execute on function scorepilot_private.is_org_member(uuid) to authenticated;

-- Replace policies that previously called the public invoker helper. The
-- SECURITY DEFINER helper reads memberships without re-entering membership RLS.
drop policy if exists scorepilot_org_select on public.scorepilot_organizations;
create policy scorepilot_org_select on public.scorepilot_organizations
for select to authenticated
using (scorepilot_private.is_org_member(id));

drop policy if exists scorepilot_membership_select on public.scorepilot_memberships;
create policy scorepilot_membership_select on public.scorepilot_memberships
for select to authenticated
using (
  user_id = (select auth.uid())
  or scorepilot_private.is_org_member(organization_id)
);

drop policy if exists scorepilot_team_select on public.scorepilot_teams;
create policy scorepilot_team_select on public.scorepilot_teams
for select to authenticated
using (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_team_write on public.scorepilot_teams;
create policy scorepilot_team_write on public.scorepilot_teams
for all to authenticated
using (scorepilot_private.is_org_member(organization_id))
with check (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_player_select on public.scorepilot_players;
create policy scorepilot_player_select on public.scorepilot_players
for select to authenticated
using (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_player_write on public.scorepilot_players;
create policy scorepilot_player_write on public.scorepilot_players
for all to authenticated
using (scorepilot_private.is_org_member(organization_id))
with check (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_division_select on public.scorepilot_divisions;
create policy scorepilot_division_select on public.scorepilot_divisions
for select to authenticated
using (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_division_write on public.scorepilot_divisions;
create policy scorepilot_division_write on public.scorepilot_divisions
for all to authenticated
using (scorepilot_private.is_org_member(organization_id))
with check (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_game_select on public.scorepilot_games;
create policy scorepilot_game_select on public.scorepilot_games
for select to authenticated
using (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_game_write on public.scorepilot_games;
create policy scorepilot_game_write on public.scorepilot_games
for all to authenticated
using (scorepilot_private.is_org_member(organization_id))
with check (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_game_stats_select on public.scorepilot_player_game_stats;
create policy scorepilot_game_stats_select on public.scorepilot_player_game_stats
for select to authenticated
using (
  exists (
    select 1
    from public.scorepilot_games g
    where g.id = game_id
      and scorepilot_private.is_org_member(g.organization_id)
  )
);

drop policy if exists scorepilot_game_stats_write on public.scorepilot_player_game_stats;
create policy scorepilot_game_stats_write on public.scorepilot_player_game_stats
for all to authenticated
using (
  exists (
    select 1
    from public.scorepilot_games g
    where g.id = game_id
      and scorepilot_private.is_org_member(g.organization_id)
  )
)
with check (
  exists (
    select 1
    from public.scorepilot_games g
    where g.id = game_id
      and scorepilot_private.is_org_member(g.organization_id)
  )
);

drop policy if exists scorepilot_season_stats_select on public.scorepilot_player_season_stats;
create policy scorepilot_season_stats_select on public.scorepilot_player_season_stats
for select to authenticated
using (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_season_stats_write on public.scorepilot_player_season_stats;
create policy scorepilot_season_stats_write on public.scorepilot_player_season_stats
for all to authenticated
using (scorepilot_private.is_org_member(organization_id))
with check (scorepilot_private.is_org_member(organization_id));

drop policy if exists scorepilot_notification_select on public.scorepilot_notifications;
create policy scorepilot_notification_select on public.scorepilot_notifications
for select to authenticated
using (
  user_id = (select auth.uid())
  or (organization_id is not null and scorepilot_private.is_org_member(organization_id))
);
