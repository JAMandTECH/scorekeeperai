-- ScorePilot AI independent persistence layer.
-- This migration is intentionally stored in GitHub first; do not apply to the inactive Supabase project yet.

create extension if not exists pgcrypto;

create table if not exists public.scorepilot_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text,
  role_id text,
  organization_id uuid,
  active_organization_id uuid,
  is_super_admin boolean not null default false,
  is_scorekeeper boolean not null default false,
  permissions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scorepilot_entities (
  id text primary key default gen_random_uuid()::text,
  entity_type text not null,
  organization_id uuid,
  created_by text,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_scorepilot_entities_type on public.scorepilot_entities(entity_type);
create index if not exists idx_scorepilot_entities_org on public.scorepilot_entities(organization_id);
create index if not exists idx_scorepilot_entities_type_org on public.scorepilot_entities(entity_type, organization_id);
create index if not exists idx_scorepilot_entities_data_gin on public.scorepilot_entities using gin(data);

create or replace function public.scorepilot_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists scorepilot_entities_updated_at on public.scorepilot_entities;
create trigger scorepilot_entities_updated_at
before update on public.scorepilot_entities
for each row execute function public.scorepilot_touch_updated_at();

drop trigger if exists scorepilot_profiles_updated_at on public.scorepilot_profiles;
create trigger scorepilot_profiles_updated_at
before update on public.scorepilot_profiles
for each row execute function public.scorepilot_touch_updated_at();

alter table public.scorepilot_profiles enable row level security;
alter table public.scorepilot_entities enable row level security;

-- A signed-in user can read their own profile.
drop policy if exists scorepilot_profile_select_own on public.scorepilot_profiles;
create policy scorepilot_profile_select_own on public.scorepilot_profiles
for select to authenticated using (id = auth.uid());

-- Entity access is organization-aware. Service-role Edge Functions can bypass these policies.
drop policy if exists scorepilot_entities_select on public.scorepilot_entities;
create policy scorepilot_entities_select on public.scorepilot_entities
for select to authenticated using (
  organization_id is null
  or organization_id::text = coalesce((select organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
  or organization_id::text = coalesce((select active_organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
);

drop policy if exists scorepilot_entities_insert on public.scorepilot_entities;
create policy scorepilot_entities_insert on public.scorepilot_entities
for insert to authenticated with check (
  organization_id is null
  or organization_id::text = coalesce((select organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
  or organization_id::text = coalesce((select active_organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
);

drop policy if exists scorepilot_entities_update on public.scorepilot_entities;
create policy scorepilot_entities_update on public.scorepilot_entities
for update to authenticated using (
  organization_id is null
  or organization_id::text = coalesce((select organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
  or organization_id::text = coalesce((select active_organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
) with check (
  organization_id is null
  or organization_id::text = coalesce((select organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
  or organization_id::text = coalesce((select active_organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
);

drop policy if exists scorepilot_entities_delete on public.scorepilot_entities;
create policy scorepilot_entities_delete on public.scorepilot_entities
for delete to authenticated using (
  organization_id is null
  or organization_id::text = coalesce((select organization_id::text from public.scorepilot_profiles where id = auth.uid()), '')
);

-- Keep the first migration deliberately generic so legacy Base44 records can be
-- imported without losing fields. Entity-specific relational tables/RPCs can be
-- added later for high-volume reporting and standings calculations.
