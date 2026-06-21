# Auth route protection plan

## Current strategy (Step 19)

Curavon uses **layered protection** without over-building routing:

1. **Client-side `AppAuthGate`** — primary UX gate for unauthenticated users (all modes)
2. **Middleware on `/app/*`** — Supabase mode only; redirects unauthenticated users to `/`
3. **RLS** — database enforcement for user-owned rows

## Route map

| Path | Access | Notes |
|------|--------|-------|
| `/` | Public | Renders mobile shell; auth flow when needed |
| `/app` | Protected (Supabase mode) | Same shell; `proxy.ts` requires Supabase session |
| `/api/health` | Public | Safe status JSON only |
| `/api/auth/session` | Public | Safe session probe; no secrets |
| Future `/privacy`, `/terms` | Public | Marketing/legal outside app shell |

## Why proxy is lightweight

- Curavon remains **app-first**; internal navigation is not URL-based yet
- `local_demo` must not redirect (no Supabase cookies)
- Avoid redirect loops between `/` and `/app`
- Root `/` stays available for onboarding and local demo

## Middleware rules

- Only runs when `NEXT_PUBLIC_AUTH_MODE=supabase` and public Supabase env exists
- Matcher: `/app/:path*` — excludes static assets and API routes
- Missing Supabase env → proxy no-op → `local_demo` behavior
- Unauthenticated on `/app` → redirect to `/` (client AuthGate handles sign-in)

## Deferred (future steps)

- Protect additional routes (`/app/settings`, etc.) when URL routing expands
- Server-side session requirement for sensitive API routes
- Marketing site split from app subdomain/path
- Optional proxy refresh token rotation tuning

## local_demo

No proxy enforcement. Device-local auth and storage unchanged.
