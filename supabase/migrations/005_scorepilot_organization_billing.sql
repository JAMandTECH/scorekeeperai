-- Extend organizations for ScorePilot subscription/billing and legacy app settings.

alter table public.scorepilot_organizations
  add column if not exists tournament_name text,
  add column if not exists contact_email text,
  add column if not exists contact_phone text,
  add column if not exists address text,
  add column if not exists status text not null default 'active',
  add column if not exists subscription_tier text not null default 'free',
  add column if not exists subscription_status text not null default 'trial',
  add column if not exists trial_end_date timestamptz,
  add column if not exists selected_sport text,
  add column if not exists paypal_subscription_id text,
  add column if not exists theme jsonb not null default '{"primary_color":"#3b82f6","secondary_color":"#f97316","accent_color":"#8b5cf6"}'::jsonb;

alter table public.scorepilot_organizations
  drop constraint if exists scorepilot_organizations_status_check,
  drop constraint if exists scorepilot_organizations_subscription_tier_check,
  drop constraint if exists scorepilot_organizations_subscription_status_check,
  drop constraint if exists scorepilot_organizations_selected_sport_check;

alter table public.scorepilot_organizations
  add constraint scorepilot_organizations_status_check check (status in ('active','inactive')),
  add constraint scorepilot_organizations_subscription_tier_check check (subscription_tier in ('free','basic','premium')),
  add constraint scorepilot_organizations_subscription_status_check check (subscription_status in ('trial','active','expired','cancelled')),
  add constraint scorepilot_organizations_selected_sport_check check (selected_sport is null or selected_sport in ('basketball','volleyball'));

create index if not exists idx_scorepilot_org_paypal_subscription on public.scorepilot_organizations(paypal_subscription_id);
