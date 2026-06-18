# Curavon P0 Hardening Pass v1

Date: 2026-06-18  
Scope: P0 fixes only from System Audit Pass v1

---

## P0 Issue 1 — Multiple Next Best Action paths

**Status:** Fixed

**Files changed:**
- `src/lib/plan/nextActionAdapter.ts` (new)
- `src/context/HealthContext.tsx`
- `src/screens/Home.tsx`
- `src/screens/AskCuravon.tsx`
- `src/screens/CareCircle.tsx`
- `src/utils/nextBestActionEngine.ts` (legacy comment)
- `src/utils/actionEngineV2.ts` (legacy comment)
- `src/utils/orchestratorV2.ts` (legacy comment)

**Old behavior:**
- Today hero could show orchestrator preview (`runCuravonOrchestratorV2`) while persisted state came from plan engine or orchestrator separately.
- Check-in triggered orchestrator sync write, then async plan engine refinement (two writers).
- Ask and Guides called `generateNextBestPlanAction` directly with duplicated mapping logic.

**New behavior:**
- Single adapter `generateCuravonNextAction()` wraps Plan Engine v2 (+ sync fallback).
- HealthContext writes next action only through `applyNextActionFromPlan()`.
- Home reads persisted `nextActionState` only (no parallel orchestrator preview).
- Ask and Guides route through the same adapter.

**Remaining legacy paths:**
- `nextBestActionEngine.buildNextBestActionPlan()` — supporting insights on Today only (marked legacy).
- `orchestratorV2.runCuravonOrchestratorV2()` — meta/logging wrapper; not used for Today display.
- `actionEngineV2.ts` — unused by active UI.

---

## P0 Issue 2 — Memory Snapshot incomplete

**Status:** Fixed

**Files changed:**
- `src/types/healthSnapshot.ts`
- `src/utils/healthSnapshot.ts`
- `src/utils/nextBestActionMemory.ts`
- `src/types/nextBestAction.ts`
- `src/utils/guideResultStorage.ts` (new)

**Old behavior:**
- Snapshot read check-ins, ask history, next action, doctor summary items, red flags only.
- Missing profile, follow-ups, guide results.

**New behavior:**
- Snapshot includes profile context, follow-up signals, guide activity, safety summary, recent blockers.
- Focus areas normalized to snake_case set (`routine_stabilization`, `stress_support`, etc.).
- `readCuravonMemorySnapshot()` includes follow-ups and guide results.
- Guide completions save lightweight `GuideResultRecord` for memory.

**Remaining legacy paths:**
- `nextBestActionEngine` still builds separate personalization signals for insight cards (not primary snapshot).

---

## P0 Issue 3 — Flow tab placeholder vs Guides

**Status:** Fixed

**Files changed:**
- `src/App.tsx`
- `src/screens/FullFlow.tsx` (deprecated comment)

**Old behavior:**
- Flow tab rendered static `FullFlowScreen` placeholder with fake data.
- Real guided flows only under Guides tab.

**New behavior:**
- Flow tab renders `CareCircleScreen` (same guided-flow experience as Guides).
- `FullFlowScreen` retained with deprecation note; no longer routed.

---

## Safety Confirmation (Part 8)

| Check | Status | Notes |
|-------|--------|-------|
| Red flag Ask — safety shown, no normal self-care | Preserved | Urgent branch still sets `mode: 'safety'` before plan call |
| Guide red flag — safety path | Preserved | Urgent modal still shown; no change to worsen path |
| Plan Engine urgent — escalate, no AI | Preserved | `planEngineV2` safety override unchanged |
| Medication — prep wording only | Preserved | Plan candidates/guards unchanged |
| Ask/Guides post-urgent continuation | Unchanged (P1 carryover) | Not worsened in this pass |

---

## Manual Checks

| Check | Result |
|-------|--------|
| Today loads one primary next action | Pass — single `nextActionState` hero |
| Ask normal concern → one final action | Pass — via adapter |
| Ask red flag → no normal self-care action | Pass — safety mode branch |
| Guide result → one final action | Pass — via adapter |
| Follow-up completion updates memory | Pass — snapshot reads follow-up outcomes |
| Snapshot includes profile/follow-up/guide | Pass — extended builder |
| Flow tab no dead placeholder | Pass — routes to CareCircle |
| Missing API key fallback | Pass — plan engine fallback unchanged |
| Build passes | Pass |

---

## Build Status

```
npm run build — PASS (2026-06-18)
TypeScript: no errors
Vite: built successfully (bundle size warning only)
```

---

## P1/P2 Carryovers (not in scope)

- Ask/Guides post-urgent result continuation
- Dual auth state / sensitive mode
- Legacy chat safety in AppContext
- Delete/export key alignment for telemetry keys
- Centralize follow-up creation entry points
- Isolate `orchestratorAI.ts` legacy AI path
