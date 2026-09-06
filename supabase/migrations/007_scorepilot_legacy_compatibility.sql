-- ScorePilot AI legacy compatibility and application write policies.
-- Apply after 001-006 when the Supabase project is active.

alter table public.scorepilot_player_season_stats
  add column if not exists counted_game_ids text[] not null default '{}',
  add column if not exists last_aggregated_at timestamptz,
  add column if not exists total_points integer generated always as (points) stored,
  add column if not exists total_rebounds integer generated always as (rebounds) stored,
  add column if not exists total_assists integer generated always as (assists) stored,
  add column if not exists total_steals integer generated always as (steals) stored,
  add column if not exists total_blocks integer generated always as (blocks) stored,
  add column if not exists total_three_pointers integer generated always as (three_pointers) stored,
  add column if not exists total_aces integer generated always as (aces) stored,
  add column if not exists total_attacks integer generated always as (attacks) stored;

create unique index if not exists uq_scorepilot_season_stats_legacy
  on public.scorepilot_player_season_stats (organization_id, coalesce(season, ''), player_id, sport);

-- Organization lifecycle.
drop policy if exists scorepilot_org_insert on public.scorepilot_organizations;
create policy scorepilot_org_insert on public.scorepilot_organizations
for insert to authenticated
with check (true);

drop policy if exists scorepilot_org_update on public.scorepilot_organizations;
create policy scorepilot_org_update on public.scorepilot_organizations
for update to authenticated
using (scorepilot_private.is_org_member(id))
with check (scorepilot_private.is_org_member(id));

drop policy if exists scorepilot_org_delete on public.scorepilot_organizations;
create policy scorepilot_org_delete on public.scorepilot_organizations
for delete to authenticated
using (scorepilot_private.is_org_member(id));

-- Membership bootstrap and administration. The membership table's read policy is
-- already protected by the SECURITY DEFINER helper installed by migration 006.
drop policy if exists scorepilot_membership_insert on public.scorepilot_memberships;
create policy scorepilot_membership_insert on public.scorepilot_memberships
for insert to authenticated
with check (
  user_id = (select auth.uid())
  or scorepilot_private.is_org_member(organization_id)
);

drop policy if exists scorepilot_membership_update on public.scorepilot_memberships;
create policy scorepilot_membership_update on public.scorepilot_memberships
for update to authenticated
using (
  user_id = (select auth.uid())
  or scorepilot_private.is_org_member(organization_id)
)
with check (
  user_id = (select auth.uid())
  or scorepilot_private.is_org_member(organization_id)
);

drop policy if exists scorepilot_membership_delete on public.scorepilot_memberships;
create policy scorepilot_membership_delete on public.scorepilot_memberships
for delete to authenticated
using (
  user_id = (select auth.uid())
  or scorepilot_private.is_org_member(organization_id)
);

-- Allow an authenticated owner/member to acknowledge or create notifications.
drop policy if exists scorepilot_notification_write on public.scorepilot_notifications;
create policy scorepilot_notification_write on public.scorepilot_notifications
for all to authenticated
using (
  user_id = (select auth.uid())
  or (organization_id is not null and scorepilot_private.is_org_member(organization_id))
)
with check (
  user_id = (select auth.uid())
  or (organization_id is not null and scorepilot_private.is_org_member(organization_id))
);

-- Existing auth bootstrap remains defined by migration 003_scorepilot_auth_bootstrap.
-- This migration intentionally does not relax profile authorization fields.
