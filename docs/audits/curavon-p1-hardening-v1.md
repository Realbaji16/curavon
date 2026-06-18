# Curavon P1 Hardening Pass v1

Date: 2026-06-18  
Scope: P1 fixes after P0 Hardening Pass v1

---

## P1 Issue 1 — Ask urgent continuation

**Status:** Fixed

**Files:** `src/screens/AskCuravon.tsx`

**Old behavior:** Safety screen offered "I understand" which routed to normal Ask result with plan action.

**New behavior:**
- Urgent red flags checked before AI orchestrator or Plan Engine
- Safety mode is terminal: Prepare summary, Return to Today, Edit concern / start over
- No plan generation, no follow-up scheduling on urgent path

---

## P1 Issue 2 — Guides urgent continuation

**Status:** Fixed

**Files:** `src/screens/CareCircle.tsx`

**Old behavior:** Safety modal acknowledgment could proceed to flow result and plan generation.

**New behavior:**
- Urgent detection sets `flowUrgentTerminal` and blocks normal result
- `saveFlowToDoctorSummary` skips plan/follow-up when urgent
- New `flowSafetyTerminal` view with doctor prep, return, restart options
- No normal self-care result card after urgent path

---

## P1 Issue 3 — Dual auth state

**Status:** Fixed (bridged)

**Files:** `src/context/AppContext.tsx`, `src/lib/auth/authProvider.tsx`

**Old behavior:** AppContext and CuravonAuthProvider both maintained auth independently.

**New behavior:**
- `CuravonAuthProvider` is canonical
- AppContext `authDemoUser` syncs from auth provider session via `useEffect`
- Legacy fields marked with compatibility comments
- Sign-out still clears session only; health data preserved

---

## P1 Issue 4 — Dual Sensitive Mode

**Status:** Fixed (canonical + mirror)

**Files:** `src/context/HealthContext.tsx`, `src/App.tsx`, `src/screens/Home.tsx`, `src/components/ScreenHeader.tsx`

**Old behavior:** AppContext and health profile both held independent sensitive mode values.

**New behavior:**
- Health Profile `sensitiveMode` is canonical (Settings toggle writes profile)
- AppContext mirrors profile for legacy shell CSS class
- UI blur reads health profile first

---

## P1 Issue 5 — Legacy chat safety

**Status:** Isolated

**Files:** `src/context/AppContext.tsx`

**Old behavior:** Duplicate `HIGH_RISK_KEYWORDS` list in chat path.

**New behavior:**
- Chat path uses shared `detectUrgentConcern` from `healthSafety.ts`
- Marked as legacy chat compatibility path

---

## P1 Issue 6 — Legacy direct AI path

**Status:** Isolated

**Files:** `src/lib/ai/orchestratorAI.ts`

**Old behavior:** Deprecated file with weak comment; bypasses orchestrator/governance.

**New behavior:**
- Strong `@deprecated` header
- No active imports from UI (verified)

---

## P1 Issue 7 — Follow-up creation centralization

**Status:** Fixed

**Files:** `src/lib/followUp/followUpScheduler.ts`, `src/context/HealthContext.tsx`, `src/screens/AskCuravon.tsx`, `src/screens/CareCircle.tsx`

**Old behavior:** Three duplicated `saveFollowUp` call sites with inline record building.

**New behavior:**
- Single `scheduleFollowUpForAction()` helper
- Skips urgent/escalate, dedupes by actionId + day
- All three entry points use scheduler

---

## P1 Issue 8 — Export/delete key coverage

**Status:** Fixed

**Files:** `src/lib/data/storageKeys.ts`, `src/lib/data/dataDeletion.ts`, `src/lib/data/dataExport.ts`

**Old behavior:** Delete missed telemetry/sync/debug keys; export incomplete.

**New behavior:**
- Key groups documented: health data, telemetry, recovery metadata, session
- `DELETE_HEALTH_DATA_KEYS` clears health + health-derived telemetry + recovery metadata
- Export includes `dailySteps` and `aiUsageLog` (metadata only, no raw prompts)
- Export excludes decision traces, orchestrator logs, sync internals

---

## P1 Issue 9 — Local-first auth copy

**Status:** Fixed

**Files:** `src/screens/AuthFlow.tsx`

**Old behavior:** "synced to you" cloud-like wording.

**New behavior:** Local device storage wording; export/delete mention in Profile.

---

## Build Status

```
npm run build — PASS (2026-06-18)
```

---

## Remaining P2 / later

- Bundle size warning (>500kb)
- In-memory AI cache persistence
- Consent versioning
- Full legacy chat path removal
- Code-split tab screens
