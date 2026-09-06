# ScorePilot AI

Independent edition of ScorekeeperAI, migrated away from Base44.

## Stack

- React + Vite
- Supabase Auth
- Supabase PostgreSQL
- Supabase Edge Functions
- Supabase Realtime / Storage as migration phases are completed

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (or Supabase publishable key).
3. Install dependencies with `npm install`.
4. Run locally with `npm run dev`.

## Database

The first migration is stored at `supabase/migrations/001_scorepilot_core.sql`. The existing Supabase project is currently inactive, so migrations are intentionally committed here first and are not applied automatically.

## Branch safety

This branch is `scorepilot-ai-independent`. The original ScorekeeperAI version remains on the original branch and is not overwritten.
