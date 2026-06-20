# Next.js migration notes (Step 17)

Curavon migrated from **Vite + React** to **Next.js App Router** while keeping the same product behavior and local-first data layer.

## What changed

- **Dev/build:** `npm run dev` → Next.js (`http://localhost:3000`)
- **Entry:** `app/page.tsx` → `CuravonClientApp` (client shell)
- **Global CSS:** `app/globals.css` imports `src/styles/index.css`
- **Health check:** `GET /api/health` → `{ ok: true, app: "curavon", framework: "next" }`

## What did not change (yet)

- Internal tab navigation (Today / Ask / Guides / Profile) — still in-app, not URL routes
- `localStorage` data layer and local demo auth
- Safety, follow-up, doctor summary, full flow, activity insights behavior
- Vitest unit tests (still run via Vite/Vitest, not Next test runner)

## Environment variables

Browser-exposed vars use **`NEXT_PUBLIC_`** prefix in Next.js:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_AUTH_MODE` | `local_demo` (default) or `supabase` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (optional) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable/anon key only |
| `NEXT_PUBLIC_OPENAI_API_KEY` | Optional governed AI key |

Legacy `VITE_*` names are supported as **fallback during migration** in `src/lib/env/publicEnv.ts` only.

Copy `.env.example` → `.env.local` for local secrets. **Never commit `.env.local`.**

## Supabase (next step)

- `src/lib/supabase/supabaseClient.ts` exposes `hasSupabaseConfig()` and `getSupabaseClient()` (returns `null` until wired)
- `src/lib/auth/authConfig.ts` falls back to `local_demo` if `supabase` is requested but env is missing
- **Do not** use `service_role` keys in frontend env
- Schema, RLS, and full Supabase auth/data wiring come in a later step

## Future server routes

Next.js enables (later):

- Protected routes / middleware
- Server-side Supabase utilities (service role on server only)
- Secure AI proxy routes
- Export/delete jobs
- Webhooks / payments
- Marketing/legal pages

## Legacy Vite cleanup (Step 17b)

Removed inactive Vite app entry files:

- `index.html`, `src/main.tsx`, `src/App.tsx`, `vite.config.ts`, `src/index.css`
- `tsconfig.app.json`, `tsconfig.node.json`
- Deprecated `src/screens/FullFlow.tsx` (replaced by `FullFlowOverlay`)

**Kept for tests:** `vite` + `vitest.config.ts` (Vitest still uses Vite as the test runner).

Use Next.js scripts only: `dev`, `build`, `start`.
