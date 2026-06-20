# Server route boundaries

Future Curavon server routes must stay on the **server side** of the Next.js boundary. Browser clients use publishable key + RLS only.

## Planned routes (not implemented in Step 19)

| Route | Purpose |
|-------|---------|
| `app/api/export/route.ts` | User-initiated export job; authenticated; audit metadata only |
| `app/api/delete-health-data/route.ts` | User-initiated delete; authenticated; confirm + audit |
| `app/api/ai/route.ts` | Governed AI proxy; no raw prompts/responses stored |
| `app/api/migrate-local-to-supabase/route.ts` | Explicit opt-in migration; user auth required |
| `app/api/webhooks/stripe/route.ts` | Future billing webhooks |
| `app/api/admin/*` | Future restricted admin operations |

## Rules

1. **Never** expose `service_role` to client bundles or `NEXT_PUBLIC_*` env
2. **service_role** (if ever used) only inside server route handlers or edge functions — not middleware client paths
3. **User auth required** for health/export/delete/migration operations
4. **RLS remains primary** protection for direct Supabase table access from clients
5. **No raw AI prompts** stored in DB or logs
6. **No raw model responses** stored
7. **No hidden reasoning** stored
8. Audit logs should avoid sensitive raw health text — use counts, ids, timestamps, action types

## Step 19 implemented routes

| Route | Behavior |
|-------|----------|
| `GET /api/health` | `ok`, `app`, `framework`, `supabaseConfigured`, `authMode` |
| `GET /api/auth/session` | `authenticated`, `authMode`, optional `userId` |

## Client vs server

| Layer | Supabase client | Key |
|-------|-----------------|-----|
| Browser / client components | `browserClient.ts` | Publishable |
| Route handlers / server components | `serverClient.ts` | Publishable + cookies |
| Future admin/export jobs | Server-only modules | service_role only if strictly necessary |

## Data operations

Step 19 does **not** move health CRUD server-side. `localStorage` remains primary until a later data-layer step.
