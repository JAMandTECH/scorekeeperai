-- ScorePilot AI hardening. Apply only after Supabase project restoration/activation.

-- Keep legacy aggregate/stat field names available to the migrated UI.
alter table public.scorepilot_player_season_stats
  add column if not exists counted_game_ids text[] not null default '{}',
  add column if not exists last_aggregated_at timestamptz;

alter table public.scorepilot_player_season_stats
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

-- Profile creation for new Supabase users.
create or replace function public.scorepilot_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_org uuid;
  v_active_org uuid;
begin
  v_org := case
    when (v_meta->>'organization_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (v_meta->>'organization_id')::uuid
    else null
  end;
  v_active_org := case
    when (v_meta->>'active_organization_id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then (v_meta->>'active_organization_id')::uuid
    else null
  end;

  insert into public.scorepilot_profiles (
    id, email, display_name, role, role_id, organization_id, active_organization_id,
    is_super_admin, is_scorekeeper, permissions, metadata
  ) values (
    new.id,
    new.email,
    coalesce(v_meta->>'display_name', v_meta->>'full_name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(v_meta->>'role', 'member'),
    v_meta->>'role_id',
    v_org,
    coalesce(v_active_org, v_org),
    coalesce((v_meta->>'is_super_admin')::boolean, false),
    coalesce((v_meta->>'is_scorekeeper')::boolean, false),
    coalesce(v_meta->'permissions', '{}'::jsonb),
    v_meta
  )
  on conflict (id) do update set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_scorepilot on auth.users;
create trigger on_auth_user_created_scorepilot
after insert on auth.users
for each row execute function public.scorepilot_handle_new_user();

-- Users can manage their own profile metadata.
drop policy if exists scorepilot_profile_update_own on public.scorepilot_profiles;
create policy scorepilot_profile_update_own on public.scorepilot_profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Organization creation is intentionally allowed to authenticated users; subsequent
-- writes are membership-scoped.
drop policy if exists scorepilot_org_insert on public.scorepilot_organizations;
create policy scorepilot_org_insert on public.scorepilot_organizations
for insert to authenticated with check (true);

drop policy if exists scorepilot_org_update on public.scorepilot_organizations;
create policy scorepilot_org_update on public.scorepilot_organizations
for update to authenticated using (public.scorepilot_is_org_member(id)) with check (public.scorepilot_is_org_member(id));

drop policy if exists scorepilot_org_delete on public.scorepilot_organizations;
create policy scorepilot_org_delete on public.scorepilot_organizations
for delete to authenticated using (public.scorepilot_is_org_member(id));

-- Membership bootstrap: a user can add themselves to an organization, while an
-- administrator can manage other members after they are inside the organization.
drop policy if exists scorepilot_membership_insert on public.scorepilot_memberships;
create policy scorepilot_membership_insert on public.scorepilot_memberships
for insert to authenticated
with check (
  user_id = (select auth.uid())
  or public.scorepilot_is_org_member(organization_id)
);

drop policy if exists scorepilot_membership_update on public.scorepilot_memberships;
create policy scorepilot_membership_update on public.scorepilot_memberships
for update to authenticated
using (user_id = (select auth.uid()) or public.scorepilot_is_org_member(organization_id))
with check (user_id = (select auth.uid()) or public.scorepilot_is_org_member(organization_id));

drop policy if exists scorepilot_membership_delete on public.scorepilot_memberships;
create policy scorepilot_membership_delete on public.scorepilot_memberships
for delete to authenticated
using (user_id = (select auth.uid()) or public.scorepilot_is_org_member(organization_id));

-- Notifications can be acknowledged by their owner or organization members.
drop policy if exists scorepilot_notification_write on public.scorepilot_notifications;
create policy scorepilot_notification_write on public.scorepilot_notifications
for all to authenticated
using (user_id = (select auth.uid()) or (organization_id is not null and public.scorepilot_is_org_member(organization_id)))
with check (user_id = (select auth.uid()) or (organization_id is not null and public.scorepilot_is_org_member(organization_id)));

-- Realtime publication membership is enabled for live score updates where supported.
do $$
begin
  begin alter publication supabase_realtime add table public.scorepilot_games; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.scorepilot_player_game_stats; exception when duplicate_object then null; end;
end $$;
