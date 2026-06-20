# ADR 0001: Supabase as the only production backend authority

**Status:** Accepted  
**Date:** 2026-06-18  
**Scope:** Private pilot hardening (not public launch)

## Context

Curavon / Healthy.Ai is a health action management product. The prototype stored authenticated health data in browser `localStorage` and allowed optional client-side AI calls. That is unsafe for a private pilot where real user health data may be collected.

## Decision

1. **Supabase is the only production backend authority** for authenticated users and health data.
2. **`localStorage` is allowed only in development fake demo mode** (`local_demo` auth). It must not store authenticated health data in pilot or production builds.
3. **Local demo auth is disabled outside development** (`APP_ENV` / `NEXT_PUBLIC_APP_ENV` must be `development` or `test`).
4. **AI provider keys are server-only** (`OPENAI_API_KEY`, `AI_ENABLED`, `AI_PROVIDER`). No `NEXT_PUBLIC_*` AI keys. Browser code must not call OpenAI/Gemini directly.
5. **Care Circle remains** but must be permissioned and safe by default (follow-up ADRs / fixes).
6. **No raw sensitive health data** in analytics or monitoring logs.

## Consequences

- Production and staging builds require Supabase public config and Supabase auth.
- Development can still use `local_demo` for UI iteration without Supabase.
- AI features require server-side routes or tool calls; client bundles always see AI as disabled.
- Data migration from local storage to Supabase is a separate phased effort (fixes 7+).

## References

- `.env.example` — environment contract
- `docs/backend/supabase-schema-v1.sql` — MVP schema
- `docs/backend/supabase-rls-v1.sql` — RLS policies
- `src/lib/auth/authConfig.ts` — auth mode resolution
- `src/lib/server/aiConfig.ts` — server-only AI config
