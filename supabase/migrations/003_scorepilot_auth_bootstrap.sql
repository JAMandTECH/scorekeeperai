-- ScorePilot AI auth bootstrap
-- Creates a minimal application profile whenever a Supabase Auth user is created.

create or replace function public.scorepilot_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.scorepilot_profiles (id, email, display_name, metadata)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.raw_user_meta_data, '{}'::jsonb)
  )
  on conflict (id) do update
    set email = excluded.email,
        display_name = coalesce(public.scorepilot_profiles.display_name, excluded.display_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_scorepilot on auth.users;
create trigger on_auth_user_created_scorepilot
after insert on auth.users
for each row execute function public.scorepilot_handle_new_user();

-- Allow a signed-in user to update only their own non-authorization profile fields.
drop policy if exists scorepilot_profile_update_own on public.scorepilot_profiles;
create policy scorepilot_profile_update_own on public.scorepilot_profiles
for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Authorization fields such as role, organization_id, is_super_admin and
-- is_scorekeeper are intentionally not client-writable. They are provisioned
-- by trusted administration/Edge Function paths.
