# Curavon Step 12 — Data Restore + Delete Scope Integrity

**Date:** 2026-06-18  
**Goal:** Fix data lifecycle issues so restored/deleted data matches visible UI state.

---

## Restore bug found

**Problem:** `Settings.runRestore()` called `restoreLocalBackup()`, which wrote to `localStorage`, but React context state (`HealthContext`, `DoctorSummaryContext`) was not refreshed. Users saw “Backup restored” while Today, Profile, and Doctor Summary still showed stale in-memory data until a manual browser reload.

**Old behavior:**
1. User selects backup file → preview shown
2. Merge/replace → `restoreLocalBackup()` updates `localStorage`
3. Toast only — no context refresh

**New behavior:**
1. Restore succeeds → `refreshHealthStateFromStorage()` + `refreshFromStorage()`
2. **Merge:** UI updates immediately without reload
3. **Replace:** Toast “Backup restored. Refreshing Curavon…” → `window.location.reload()` after 600ms (full reset safety)

---

## Files changed

| File | Change |
|------|--------|
| `src/context/HealthContext.tsx` | Added `refreshHealthStateFromStorage()`; `clearHealthData` refreshes follow-ups |
| `src/context/DoctorSummaryContext.tsx` | Fixed `toggleItemIncluded` stale closure |
| `src/screens/Settings.tsx` | Post-restore refresh; replace reload; red-flag transparency copy |
| `src/lib/data/storageKeys.ts` | Added `HEALTH_DERIVED_DELETE_PREFIXES` |
| `src/lib/data/dataDeletion.ts` | `deletePrefixedLocalStorageKeys()`; meta prefix cleanup on delete |
| `src/components/DoctorSummaryHub.tsx` | Red-flag persistence transparency copy |
| `src/__tests__/dataLifecycle.test.ts` | Delete prefix + restore helper tests |
| `src/__tests__/dataScope.test.ts` | Meta prefix scope assertion |

---

## Meta keys added to delete scope

Explicit keys already in `DELETE_HEALTH_DATA_KEYS` (telemetry, orchestrator logs, etc.).

**New:** prefix deletion for `curavon_meta_*` via `HEALTH_DERIVED_DELETE_PREFIXES`:

- `curavon_meta_action_outcomes`
- `curavon_meta_safety_events`
- `curavon_meta_flow_behavior`
- `curavon_meta_orchestrator_events`
- `curavon_meta_insights`
- `curavon_meta_improvement_queue`
- Any future keys under the same prefix

**Not deleted** on “delete health data”: auth session keys (`authDemoUser`, `consentComplete`, `setupComplete`, `profileSetup`).

---

## Export / meta decision

**Carryover:** Meta-system insights (`curavon_meta_*`) are **deleted** with health data but **not exported** in user-facing export/backup collections today.

Export continues to include only `EXPORT_HEALTH_DATA_KEYS` — no raw prompts, model responses, or secret keys.

---

## Red-flag Doctor Summary transparency

Added calm copy in:

- **Doctor Summary hub** — explains urgent red flags may save a short safety note for later review
- **Settings → Data & Privacy** — same message; clarifies not diagnosis or emergency monitoring

Red-flag logging and auto-save to Doctor Summary **unchanged**.

---

## `toggleItemIncluded` fix

**Before:** Closed over stale `items` array — rapid toggles could drop updates.

**After:** Reads latest list via `loadDoctorSummaryItems()` before toggle, then persists.

---

## Context refresh contract

### `HealthContext.refreshHealthStateFromStorage()`

Reloads from `localStorage`:
- health profile
- daily check-ins
- daily steps
- next action state
- follow-ups
- health snapshot (recomputed)

Does **not** regenerate a new next action.

### `DoctorSummaryContext.refreshFromStorage()`

Already existed — now called from Settings after restore.

---

## Regression checks

| Check | Expected |
|-------|----------|
| Restore merge | UI reflects restored data without manual refresh |
| Restore replace | Auto reload after toast |
| Delete health data | Clears `curavon_meta_*` keys |
| Delete health data | Auth session keys remain |
| Sign out | Health data remains |
| Red-flag urgent | Safety note still saved; copy explains persistence |
| Doctor Summary toggle | Rapid include/exclude stable |

---

## Build / test / lint status

| Command | Result |
|---------|--------|
| `npm run test` | **55/55 passed** |
| `npm run build` | **Pass** |
| `npm run lint` | **0 errors, 0 warnings** |

---

## Remaining carryovers

1. Meta insights not included in user export (documented above)
2. Replace restore uses full page reload (intentional for clean slate)
3. `AppContext` shell flags not refreshed on restore (backup does not include consent/setup by default)
4. Ask history clear is a separate Settings action (not part of restore refresh)
