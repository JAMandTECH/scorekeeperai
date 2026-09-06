# ScorePilot AI

Independent version of ScorekeeperAI, migrated away from Base44 toward Supabase.

## Current branch

`scorepilot-ai-independent`

The original `main` branch is preserved and is not modified by this migration.

## Architecture

- React + Vite frontend
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage / Realtime as needed
- Supabase Edge Functions
- No Base44 SDK dependency in the frontend

## Migration status

The branch now includes:

- Supabase-native authentication and login flow
- Supabase client and data compatibility layer
- Basketball and volleyball standings logic
- Player-game aggregation and leaderboards
- Supabase Edge Function dispatcher
- Initial JSONB compatibility schema for safe transition
- Relational production schema for organizations, memberships, teams, players, divisions, games, player game stats, season stats, and notifications

The relational migration is stored under `supabase/migrations/002_scorepilot_relational.sql` and has not been applied to the inactive Supabase project yet.

## Environment

Create `.env` from `.env.example` and provide:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not put a Supabase service-role/secret key in the browser environment.

## Next migration stage

1. Restore/activate the intended Supabase project when ready.
2. Apply and verify the relational migrations.
3. Migrate the compatibility layer from `scorepilot_entities` to the relational tables.
4. Port remaining privileged Base44 server functions to Supabase Edge Functions.
5. Run the full frontend build/typecheck and live functional tests.
6. Remove the remaining `base44/` reference implementation after parity is verified.
