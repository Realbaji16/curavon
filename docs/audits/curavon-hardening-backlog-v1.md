# Curavon Hardening Backlog v1

Prioritized from System Audit Pass v1. Audit-only — no fixes applied in this pass.

---

## P0 — Must fix before real testing

### Unify Next Best Action to one primary path
- **Files:** `src/context/HealthContext.tsx`, `src/screens/Home.tsx`, `src/lib/plan/planEngineV2.ts`, `src/utils/orchestratorV2.ts`, `src/utils/nextBestActionEngine.ts`, `src/utils/actionEngineV2.ts`
- **Risk:** Today can show reasoning/title from orchestrator preview while persisted `nextActionState` came from a different engine; contradictory actions during testing.
- **Recommended fix:** Designate Plan Engine v2 + orchestrator v2 as sole writer; remove Home `buildNextBestActionPlan` preview path or make it read-only mirror of persisted state.

### Complete Memory Snapshot source coverage
- **Files:** `src/utils/healthSnapshot.ts`, `src/utils/nextBestActionMemory.ts`
- **Risk:** Snapshot ignores health profile, follow-ups, and guide results; recommendations and pattern card may miss active user state.
- **Recommended fix:** Extend `buildHealthSnapshot()` to incorporate follow-ups, profile goals, guide results (or doctor summary guide items), without diagnostic language.

### Resolve Flow tab vs Guides duplication
- **Files:** `src/App.tsx`, `src/screens/FullFlow.tsx`, `src/components/TabBar.tsx`, `src/screens/CareCircle.tsx`
- **Risk:** Users opening "Flow" tab see static placeholder unrelated to live guided flows; breaks product flow testing expectations.
- **Recommended fix:** Redirect Flow tab to Guides runner entry, remove tab, or wire FullFlow to real data.

---

## P1 — Should fix before launch readiness

### Remove or isolate legacy chat safety path
- **Files:** `src/context/AppContext.tsx` (`addChatMessage`, `HIGH_RISK_KEYWORDS`, `showSafetyEscalation`)
- **Risk:** Dead code confusion; duplicate safety semantics if re-wired accidentally.
- **Recommended fix:** Mark legacy block clearly or remove if no UI consumes chat messages.

### Isolate legacy direct AI path (`orchestratorAI.ts`)
- **Files:** `src/lib/ai/orchestratorAI.ts`, `src/lib/ai/guardedAI.ts`
- **Risk:** Bypasses orchestrator/governance if imported by future code.
- **Recommended fix:** Add explicit `@deprecated` export guard or move to `legacy/` folder; ensure no imports from screens/contexts.

### Align delete/export key coverage
- **Files:** `src/lib/data/storageKeys.ts`, `src/lib/data/dataDeletion.ts`, `src/lib/data/dataExport.ts`
- **Risk:** Delete health data may leave AI traces, sync queue, debug logs; export incomplete for backup parity.
- **Recommended fix:** Define `META_TELEMETRY_KEYS` and document intentional retain vs purge policy.

### Dual auth state (AppContext vs CuravonAuthProvider)
- **Files:** `src/context/AppContext.tsx`, `src/lib/auth/authProvider.tsx`, `src/screens/AuthFlow.tsx`, `src/screens/Settings.tsx`
- **Risk:** Session display vs gating can drift after sign-out/sign-in edge cases.
- **Recommended fix:** Single session source of truth with AppContext as thin UI bridge.

### Sensitive Mode single source of truth
- **Files:** `src/context/AppContext.tsx`, `src/context/HealthContext.tsx`, `src/types/health.ts`
- **Risk:** App-level `sensitiveMode` can desync from `healthProfile.sensitiveMode`.
- **Recommended fix:** Read only from health profile; AppContext derives from HealthContext.

### Centralize follow-up creation
- **Files:** `src/context/HealthContext.tsx`, `src/screens/AskCuravon.tsx`, `src/screens/CareCircle.tsx`, `src/lib/followUp/followUpStorage.ts`
- **Risk:** Three entry points with slightly different record shapes/timing.
- **Recommended fix:** Export `createFollowUpForPlanAction()` from follow-up module; call from all entry points.

### Ask urgent path should not proceed to normal result without explicit choice
- **Files:** `src/screens/AskCuravon.tsx`
- **Risk:** User can view normal next-step result after urgent safety screen.
- **Recommended fix:** Keep safety mode terminal or route only to summary/prep actions.

### Guides post-urgent flow continuation
- **Files:** `src/screens/CareCircle.tsx`
- **Risk:** Same as Ask — acknowledgment allows runner completion toward normal plan action.
- **Recommended fix:** Escalate-only result state when urgent detected.

### Legacy storage vs adapter divergence
- **Files:** `src/lib/data/localDataAdapter.ts`, all `*Storage.ts` helpers
- **Risk:** Future user-scoping and sync will miss writes that bypass adapter.
- **Recommended fix:** Migration plan stage: write-through adapter or document legacy-only until v2.

### Unify AI session/budget counters
- **Files:** `src/lib/ai/orchestrator/orchestratorState.ts`, `src/lib/ai/governance/aiBudget.ts`, `src/lib/ai/aiKernel.ts`
- **Risk:** Inconsistent limit enforcement under edge reload/order.
- **Recommended fix:** Single budget authority in governance; orchestrator/kernel read-only check.

### AuthFlow "synced to you" copy vs local-only reality
- **Files:** `src/screens/AuthFlow.tsx`
- **Risk:** User trust mismatch during testing.
- **Recommended fix:** Replace with "stored on this device" wording (copy-only change).

---

## P2 — Later / polish

### FullFlow static placeholder screen
- **Files:** `src/screens/FullFlow.tsx`
- **Risk:** Low if tab removed; otherwise confusing demo artifact.
- **Recommended fix:** Delete or connect to real flow state.

### In-memory AI cache not persisted
- **Files:** `src/lib/ai/aiCache.ts`, `src/lib/ai/orchestrator/orchestratorState.ts`
- **Risk:** Higher AI cost after reload; acceptable for v1.
- **Recommended fix:** Optional session-persisted cache with TTL.

### Bundle size warning (>500kb)
- **Files:** build output
- **Risk:** Performance on low-end devices.
- **Recommended fix:** Code-split tab screens.

### Consent versioning
- **Files:** `src/context/AppContext.tsx`, auth flow
- **Risk:** No re-consent on policy updates.
- **Recommended fix:** Add consent version key when legal docs finalized.

### Sync simulation only
- **Files:** `src/lib/sync/*`
- **Risk:** None until backend selected.
- **Recommended fix:** Implement adapter when backend chosen.

### Plaintext demo passwords in localStorage
- **Files:** `src/lib/auth/localAuthAdapter.ts`
- **Risk:** Acceptable for local demo only.
- **Recommended fix:** Hash or remove password storage when production auth added.

### Meta-system and debug logs retention
- **Files:** `src/utils/metaSystem.ts`, `src/lib/followUp/followUpStorage.ts`
- **Risk:** Local storage growth; no user-facing impact.
- **Recommended fix:** Trim policy in data health check (partially exists).

### Loading states for async plan/check-in refinement
- **Files:** `src/screens/Home.tsx`, `src/context/HealthContext.tsx`
- **Risk:** Brief UI flicker when plan engine updates action after check-in.
- **Recommended fix:** Subtle inline loading on hero card during refinement.
