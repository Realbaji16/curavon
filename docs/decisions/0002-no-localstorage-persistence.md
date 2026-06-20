# ADR 0002: No localStorage persistence for app data

**Status:** Accepted  
**Date:** 2026-06-18  
**Scope:** Curavon / Healthy.Ai runtime persistence (Fix 12)

## Context

Fixes 7–11 migrated health, product, telemetry, and lifecycle state to Supabase through `getDataAdapter()`. Legacy modules still existed for local export, backup, sync queues, and browser key-value helpers. Those paths risked silent regression to device-local persistence.

## Decision

1. **Supabase is the only persistence layer for Curavon app data** (health records, preferences, telemetry, export/deletion requests, activity insights, etc.).
2. **`localStorage` and `sessionStorage` are banned in app runtime code** for product persistence. Direct browser storage API usage and imports of legacy storage modules fail CI enforcement tests.
3. **Session-scoped in-memory caches** are allowed for derived UI state (health snapshot recompute cache, follow-up/guide caches, meta-system working sets, daily steps for the current session) when data is also loaded from or written to Supabase.
4. **App shell flags** (onboarding seen, consent, setup) live in in-memory `appShellState` for the active session; authenticated profile and preferences persist through Supabase.
5. **Supabase Auth** may use its own browser session storage internally. That is outside Curavon source control and is explicitly allowed.
6. **Tests** may mock `localStorage`/`sessionStorage` in `src/__tests__` only.

## Banned in runtime

- `localStorage.getItem` / `setItem` / `removeItem`
- `sessionStorage.getItem` / `setItem` / `removeItem`
- Imports of removed modules: `storageKeys`, `healthStorage`, `localDataAdapter`, sync queue/state/logger, local backup/export/delete helpers

## Consequences

- Deleted legacy localStorage adapters and lifecycle modules.
- Added `src/__tests__/noDirectLocalStorage.test.ts` enforcement (zero allowlist).
- New pure helpers: `healthUtils.ts`, `appShellState.ts`, `types/guideResult.ts`.
- Meta-system and snapshot caches are session-only; pattern analysis uses in-memory meta store plus health context injection.

## References

- ADR 0001: Supabase as backend authority
- `src/lib/data/getDataAdapter.ts`
- `src/__tests__/noDirectLocalStorage.test.ts`
