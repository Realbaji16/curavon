# Curavon Step 8 — Lint Cleanup + React 19 Hygiene

**Date:** 2026-06-18  
**Goal:** Fix lint issues and React 19 hygiene problems without changing product behavior.

---

## Initial lint inventory (21 problems: 18 errors, 3 warnings)

| File | Line | Rule | Issue | Severity |
|------|------|------|-------|----------|
| `src/components/CloudBackground.tsx` | 15 | `react-refresh/only-export-components` | `moodForTab` exported with component | error |
| `src/components/DoctorSummary.tsx` | 32 | `@typescript-eslint/no-unused-vars` | `_onClose` unused | error |
| `src/components/TodayCheckIn.tsx` | 58 | `react-hooks/set-state-in-effect` | reset draft/step on `showCheckIn` close | error |
| `src/context/AppContext.tsx` | 202 | `react-hooks/set-state-in-effect` | auth mirror sync in effect | error |
| `src/context/AppContext.tsx` | 242 | `@typescript-eslint/no-unused-vars` | `_user` in `setAuthDemoUser` | error |
| `src/context/AppContext.tsx` | 360 | `react-refresh/only-export-components` | `useApp` exported with provider | error |
| `src/context/DoctorSummaryContext.tsx` | 312 | `react-refresh/only-export-components` | `useDoctorSummary` exported with provider | error |
| `src/context/HealthContext.tsx` | 263 | `react-hooks/purity` | `Date.now()` during render for `dueFollowUp` | error |
| `src/context/HealthContext.tsx` | 399 | `react-hooks/set-state-in-effect` | `setDailySteps` on day rollover in effect | error |
| `src/context/HealthContext.tsx` | 714 | `react-hooks/exhaustive-deps` | unnecessary `createFollowUpForAction` dep | warning |
| `src/context/HealthContext.tsx` | 817 | `react-refresh/only-export-components` | `useHealth` exported with provider | error |
| `src/lib/auth/authGuards.ts` | 8, 12 | `no-extra-boolean-cast` | redundant `Boolean()` | error |
| `src/lib/auth/authProvider.tsx` | 52 | `react-hooks/set-state-in-effect` | `void refresh()` on mount | error |
| `src/lib/auth/authProvider.tsx` | 119 | `react-refresh/only-export-components` | `useCuravonAuth` exported with provider | error |
| `src/lib/data/dataDeletion.ts` | 4 | `@typescript-eslint/no-unused-vars` | `_userId` unused | error |
| `src/lib/followUp/followUpEngine.ts` | 12 | `@typescript-eslint/no-unused-vars` | `_context` unused | error |
| `src/screens/AuthFlow.tsx` | 84 | `react-hooks/set-state-in-effect` | `setStage` syncing auth flags | error |
| `src/screens/CareCircle.tsx` | 675 | `react-hooks/set-state-in-effect` | open flow from `pendingGuideFlowId` | error |
| `src/screens/CareCircle.tsx` | 712 | `react-hooks/exhaustive-deps` | `backToBrowse` not memoized | warning |
| `src/screens/CareCircle.tsx` | 795 | `react-hooks/exhaustive-deps` | `goRunnerBack` not memoized | warning |

---

## Files changed

### New files
- `src/utils/cloudMood.ts` — `moodForTab` + `CloudMood` type (react-refresh split)
- `src/lib/auth/authContext.ts` — shared auth context object
- `src/lib/auth/useCuravonAuth.ts` — auth hook (react-refresh split)
- `src/context/useApp.ts` — app shell hook
- `src/context/useHealth.ts` — health hook
- `src/context/useDoctorSummary.ts` — doctor summary hook

### Modified files
- `src/components/CloudBackground.tsx`
- `src/components/DoctorSummary.tsx`
- `src/components/TodayCheckIn.tsx`
- `src/components/AppAuthGate.tsx`
- `src/components/DoctorSummaryHub.tsx`
- `src/components/DoctorSummaryOverlay.tsx`
- `src/components/HealthActionSheets.tsx`
- `src/components/PhoneChrome.tsx`
- `src/components/ScreenHeader.tsx`
- `src/components/TabBar.tsx`
- `src/components/ThemeToggle.tsx`
- `src/context/AppContext.tsx`
- `src/context/HealthContext.tsx`
- `src/context/DoctorSummaryContext.tsx`
- `src/lib/auth/authGuards.ts`
- `src/lib/auth/authProvider.tsx`
- `src/lib/data/dataDeletion.ts`
- `src/lib/followUp/followUpEngine.ts`
- `src/screens/AuthFlow.tsx`
- `src/screens/AskCuravon.tsx`
- `src/screens/CareCircle.tsx`
- `src/screens/Home.tsx`
- `src/screens/Settings.tsx`
- `src/screens/FullFlow.tsx`
- `src/screens/Onboarding.tsx`
- `src/hooks/useScreenBack.ts`
- `src/App.tsx`
- `src/__tests__/followUpEngine.test.ts`

---

## Fixes applied

### Unused variables / parameters
- **DoctorSummary:** removed unused `onClose` destructure (prop remains optional on interface).
- **AppContext:** `setAuthDemoUser` uses `void user` for legacy no-op compatibility.
- **dataDeletion:** `void userId` with comment (reserved for future per-user scoping).
- **followUpEngine:** removed unused optional `context` parameter; updated caller + tests.
- **authGuards:** replaced redundant `Boolean()` with `!!` / direct boolean checks.

### React purity (`Date.now()` during render)
- **HealthContext:** `dueFollowUp` now uses `followUpNowMs` state (initialized once) + 60s interval refresh inside `useMemo`. Avoids impure `Date.now()` in render while keeping due follow-ups accurate over time.

### `set-state-in-effect`
- **AppContext:** derived `authDemoUser` during render from `useCuravonAuth()` instead of syncing in `useEffect`.
- **TodayCheckIn:** extracted `CheckInWizard` child; unmount on close resets all local state (no reset effect).
- **HealthContext:** removed day-rollover `setDailySteps` effect; `resolvedDailySteps` derived via `useMemo` for reads (writes still normalize date in handlers).
- **AuthFlow:** replaced auth-sync effect with `manualStage ?? authResolvedStage` derivation.
- **CareCircle:** `openFlowDetail` wrapped in `useCallback`; pending guide deep-link effect documented with scoped disable (external navigation request).
- **authProvider:** mount session hydration documented with scoped disable (async localStorage read).

### `react-refresh/only-export-components`
- Split hooks into dedicated files: `useApp`, `useHealth`, `useDoctorSummary`, `useCuravonAuth`.
- Moved `moodForTab` / `CloudMood` to `src/utils/cloudMood.ts`.
- Provider files now export only provider components (+ context objects for hook modules).

### Context hygiene
- **AppContext:** auth mirror derived, not duplicated in effect; provider value overrides `authDemoUser`.
- **HealthContext:** removed unnecessary `createFollowUpForAction` from `submitFollowUpOutcome` deps; removed unused `healthSnapshot` dep.
- **CareCircle:** `backToBrowse` and `goRunnerBack` wrapped in `useCallback` for stable `useScreenBack` deps.

---

## Local eslint disables (documented carryovers)

| File | Rule | Reason |
|------|------|--------|
| `src/lib/auth/authProvider.tsx` | `react-hooks/set-state-in-effect` | One-shot async session hydration from local adapter on mount |
| `src/screens/CareCircle.tsx` | `react-hooks/set-state-in-effect` | Sync `pendingGuideFlowId` from AppContext into Guides local view state |

No global rule disables were added.

---

## Rules intentionally deferred

None. All initial issues resolved.

---

## Build / test / lint status

| Command | Result |
|---------|--------|
| `npm run lint` | **0 errors, 0 warnings** |
| `npm run test` | **45 passed** (5 files) |
| `npm run build` | **Pass** |

---

## Remaining warnings

None after final lint run.

---

## Safety regression status

No safety logic, medical boundary strings, export/delete scopes, or urgent terminal paths were modified. Changes are structural/hygiene only:

- Urgent detection (`detectUrgentConcern`, `healthSafety`) untouched
- Plan engine guards and regeneration policy untouched
- Medication follow-up language guards untouched
- Export/delete key lists untouched

---

## Manual regression checklist

| Check | Status |
|-------|--------|
| App loads | Verify in browser |
| Auth/onboarding | Derived stage logic preserves flow |
| Today one next action | Plan regen policy unchanged |
| Ask normal concern | No Ask screen logic changes |
| Ask urgent terminal safety | Unchanged |
| Guides normal flow | Unchanged |
| Guides urgent terminal | Unchanged |
| Sensitive Mode toggle | Canonical HealthContext path unchanged |
| Export/delete controls | Unchanged |
| Tests pass | 45/45 automated |
