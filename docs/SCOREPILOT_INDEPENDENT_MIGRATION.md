# ScorePilot AI — Independent Migration

## Goal

ScorePilot AI is the independent version of ScorekeeperAI. The original Base44-based branch is preserved unchanged. This branch is the migration target.

## Architecture

- React + Vite frontend
- Supabase Auth for authentication/session management
- Supabase PostgreSQL for application data
- Supabase Storage for generated/uploaded assets
- Supabase Realtime for live scoring updates
- Supabase Edge Functions for privileged/server-side operations and AI integrations

## Current Base44 coupling identified

The source application currently depends on `@base44/sdk`, `@base44/vite-plugin`, a Base44 client module, Base44 authentication context, and Base44-backed server functions. The server function layer includes game updates, scoring/stat persistence, standings, backups, AI chat, and payment/webhook operations.

## Migration rules

1. Never modify the original production/reference branch as part of this migration.
2. Preserve existing page/component behavior wherever practical; replace infrastructure underneath it.
3. Migrate authentication first, then data access, then server functions, then remove Base44 dependencies.
4. Keep the `base44/` implementation temporarily as migration reference until the replacement passes functional checks.
5. Do not apply database migrations to the existing Supabase project until the schema has been reviewed and the project is active/ready.

## Planned data domains

The Base44 application exposes domains including organizations, users/roles, teams, players, divisions, games, player game/season statistics, tournaments/brackets, notifications, social posts/comments/likes, posters/templates, backups/schedules, and organization join/admin requests.

## Sports logic

The application includes both basketball and volleyball scoring. Volleyball standings/recalculation logic must be retained when migrating game and standings functionality.

## Immediate implementation sequence

- Add Supabase client/config layer.
- Replace Base44 authentication context with Supabase Auth while preserving the existing `useAuth()` interface where possible.
- Add typed database/data-access modules.
- Create Supabase schema migration from the discovered Base44 entities.
- Port Base44 functions to Supabase Edge Functions or secure database RPCs.
- Replace frontend Base44 entity/function calls incrementally.
- Remove Base44 packages and Vite plugins only after all references are gone.
- Add build/lint/typecheck CI and document environment variables.
