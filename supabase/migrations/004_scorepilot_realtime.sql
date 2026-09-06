-- Enable Supabase Realtime for the core live-scoring tables.
-- This migration is stored in GitHub and should be applied only when the
-- target Supabase project is restored/active.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scorepilot_games'
  ) then
    alter publication supabase_realtime add table public.scorepilot_games;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scorepilot_player_game_stats'
  ) then
    alter publication supabase_realtime add table public.scorepilot_player_game_stats;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'scorepilot_notifications'
  ) then
    alter publication supabase_realtime add table public.scorepilot_notifications;
  end if;
end $$;
