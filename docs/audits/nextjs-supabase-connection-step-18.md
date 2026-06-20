# Next.js Supabase connection — Step 18 audit

## Summary

Curavon connects to Supabase inside the Next.js App Router shell when `NEXT_PUBLIC_*` env config is present and auth mode is `supabase`. Otherwise the app falls back to `local_demo` without crashing.

## Supabase env contract

| Variable | Required for Supabase | Notes |
|----------|----------------------|-------|
| `NEXT_PUBLIC_AUTH_MODE` | Yes | `local_demo` (default) or `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | When supabase | Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | When supabase | Publishable/anon key only |

- Primary naming: **`NEXT_PUBLIC_*`** (Next.js)
- Legacy `VITE_*` fallback in `publicEnv.ts` for Vitest only
- No `service_role` in browser code
- No keys hardcoded in source
- `.env.local` not committed

## Client / browser Supabase setup

**File:** `src/lib/supabase/supabaseClient.ts`

- `hasSupabaseConfig()` — true when URL + publishable key exist
- `getSupabaseClient()` — lazy singleton browser client; returns `null` if missing config or SSR
- Never logs full key
- Never uses service role

## Auth mode config

**File:** `src/lib/auth/authConfig.ts`

- `getConfiguredAuthMode()` — default `local_demo`
- `supabase` only when env requests it **and** config exists
- Missing config → `console.warn` + `local_demo` fallback

## Auth adapter behavior

| Mode | Adapter |
|------|---------|
| `local_demo` | `localAuthAdapter` (localStorage demo passwords) |
| `supabase` + config | `supabaseAuthAdapter` |
| `supabase` without config | `localAuthAdapter` fallback |

**Supabase auth adapter:** email/password sign up, sign in, sign out, reset password, profile update, delete placeholder (sign out only).

**Provider:** subscribes to `onAuthStateChange` in Supabase mode.

## Schema / RLS docs

- `docs/backend/supabase-schema-v1.sql` — 18 tables + `set_updated_at()` triggers
- `docs/backend/supabase-rls-v1.sql` — RLS enabled; own-row policies only

## Data adapter foundation

**File:** `src/lib/data/supabaseDataAdapter.ts`

Helpers: `getSupabaseUserId`, `requireSupabaseUserId`, `readSinglePayload`, `upsertSinglePayload`, `insertEventPayload`, soft/hard delete.

Initial feature functions for health profile, check-ins, next action, doctor summary items, red flags, activity insights.

**Not wired to UI** — localStorage remains primary for app screens.

## Local → Supabase migration scaffold

**File:** `src/lib/data/localToSupabaseMigration.ts`

- Preview / migrate / status helpers
- No automatic migration
- No local data deletion

## local_demo fallback

- Default when env missing or incomplete
- All existing safety, export, delete, follow-up, red-flag paths unchanged
- Health data still in `localStorage` until future data-layer wiring

## Settings storage mode copy

Profile shows storage mode and note that local demo data is not auto-moved.

## AuthFlow compatibility

- Supabase sign up / sign in / sign out
- Email confirmation copy when session not returned after sign up
- No UI redesign

## Tests / build status

See final Step 18 response for `npm run test`, `npm run build`, `npm run lint`.

**Test file:** `src/__tests__/supabaseConnection.test.ts` — no live Supabase calls.

## Remaining Supabase carryovers

- Wire HealthContext / data layer to Supabase when authenticated
- Migration UI in Settings
- Profile row sync on sign up (trigger or app hook)
- Server-side routes for secure AI proxy and account deletion
- Remove legacy `VITE_*` fallback when Vitest env is migrated

## Manual dashboard steps still required

1. Run schema + RLS SQL in Supabase SQL Editor
2. Enable email/password auth
3. Add `http://localhost:3000` to auth redirect URLs
4. Create `.env.local` with publishable key (never commit)
5. Restart dev server and test auth manually
