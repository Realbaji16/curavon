# Next.js Supabase SSR/auth hardening — Step 19 audit

## Summary

Curavon now separates **browser** Supabase usage (client components, auth adapter, RLS user data) from **server** Supabase utilities (route handlers, cookie-backed session reads). Protected app route foundation added at `/app` with lightweight middleware in Supabase mode only.

## Current Supabase client setup (before)

- Single `supabaseClient.ts` with `createClient` from `@supabase/supabase-js`
- Browser-only singleton; returned `null` on SSR

## New browser/server separation

| Module | Purpose |
|--------|---------|
| `supabaseEnv.ts` | Public URL + publishable key only |
| `supabaseTypes.ts` | Shared API/auth types |
| `browserClient.ts` | `createBrowserClient` (@supabase/ssr) for client code |
| `serverClient.ts` | `createServerClient` + Next cookies for route handlers |
| `supabaseClient.ts` | Compatibility re-exports (deprecated) |

## Protected route strategy

| Route | Role |
|-------|------|
| `/` | Public entry; renders `CuravonClientApp` (unchanged) |
| `/app` | Protected app shell foundation; same client app |
| Future `/privacy`, `/terms` | Public marketing/legal (not implemented) |

Internal tabs (Today / Ask / Guides / Profile) remain in-app.

## Middleware decision

**Implemented:** lightweight `middleware.ts`

- Matcher: `/app/:path*` only
- Active when `NEXT_PUBLIC_AUTH_MODE=supabase` **and** public Supabase env present
- Unauthenticated Supabase users on `/app` → redirect to `/`
- `local_demo` mode: no middleware protection (no redirect loops)
- Static assets excluded via matcher scope

See also: `docs/backend/auth-route-protection-plan.md`

## Auth/session handling

- **Browser:** `supabaseAuthAdapter` + `authProvider` use `getBrowserSupabaseClient()`
- **Server:** `createSupabaseServerClient()` in `app/api/auth/session/route.ts`
- **Health:** `buildHealthApiResponse()` — no secrets
- **Session API:** `authenticated`, `authMode`, optional `userId` only — no email, no keys

## Files changed

- New: `browserClient.ts`, `serverClient.ts`, `supabaseEnv.ts`, `supabaseTypes.ts`
- New: `src/lib/server/apiHealth.ts`, `apiSession.ts`
- New: `app/app/page.tsx`, `app/api/auth/session/route.ts`, `middleware.ts`
- Updated: `supabaseClient.ts` (compat), auth/data imports, health route
- Docs: server boundaries, RLS checklist, auth route plan
- Tests: `supabaseSsrAuth.test.ts`

## Tests/build status

See Step 19 final response for `npm run test`, `build`, `lint`.

## Remaining carryovers

- Wire HealthContext to Supabase when authenticated (still localStorage primary)
- Migration UI + `app/api/migrate-local-to-supabase/route.ts`
- Secure AI proxy `app/api/ai/route.ts`
- Export/delete server jobs with audit logging
- `service_role` only if ever needed — **server routes only**, never client
- Profile row creation trigger on Supabase sign up
- Remove legacy `supabaseClient` compat exports after import migration complete
