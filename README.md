# ScorePilot AI

Independent version of ScorekeeperAI, migrated away from Base44 toward Supabase.

## Branch safety

`scorepilot-ai-independent` is the independent implementation branch. The original `main` branch remains preserved and is not overwritten by this migration.

## Architecture

- React + Vite frontend
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Supabase Realtime
- Supabase Edge Functions
- No Base44 SDK or Base44 Vite plugin in the application runtime

## Independent implementation

The branch contains the independent application/data foundation and the major live-scoring backend paths:

- Supabase-native authentication and profile bootstrap
- Supabase relational schema for organizations, memberships, teams, players, divisions, games, player-game stats, season stats and notifications
- Organization-aware Row Level Security
- Realtime support for live game/stat updates
- Basketball standings and volleyball set-based standings
- Game score updates and player-stat upserts
- Player-game leaderboards and season assist leaders
- Player-stat aggregation after completed games
- Public live-game scoreboard through a dedicated safe Edge Function
- Supabase Storage helpers
- Edge Function dispatcher for privileged server operations
- AI function integration point for Gemini-compatible providers
- Independence guard in CI to prevent accidental Base44 runtime dependencies

The old `base44/` directory is retained only as a migration/reference source. The browser application does not use the Base44 SDK.

## Environment

Create `.env` from `.env.example` and provide:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Never place a Supabase service-role/secret key in browser environment variables.

## Supabase deployment

The SQL migrations are committed under `supabase/migrations/` in dependency order. The intended Supabase project is currently inactive, so these migrations have been deliberately kept in GitHub and have not been executed against that project.

When the project is restored/activated, apply migrations `001` through `007`, deploy the Edge Functions under `supabase/functions/`, configure the required provider secrets, then run the application CI and live scoring smoke tests.

## Validation

GitHub Actions runs:

1. dependency installation
2. Base44 independence verification
3. TypeScript typecheck
4. production Vite build

The latest branch CI is used as the final code-level validation gate before production deployment.
