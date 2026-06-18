# Curavon System Audit v1

Audit date: 2026-06-18  
Mode: audit-only pass (no hardening changes)  
Build check: **PASS** (2026-06-18, `npm run build`)

## Overall Status

Curavon is **mostly complete** as a local-first integrated app, with strong safety and guarded AI controls.  
Primary blockers before real testing are around **legacy paths, memory coverage gaps, and product-flow consistency**.

## System-by-System Audit

### 1) Auth / onboarding
- **Status:** mostly complete
- **Files involved:** `src/App.tsx`, `src/screens/AuthFlow.tsx`, `src/lib/auth/authProvider.tsx`, `src/lib/auth/localAuthAdapter.ts`, `src/context/AppContext.tsx`
- **What works:** local demo auth, onboarding gate, sign-in/up, sign-out, profile setup handoff.
- **Incomplete:** dual auth/session concepts (`AppContext` + `CuravonAuthProvider`) remain.
- **Duplicated logic:** onboarding/session persistence duplicated in app context and auth layer.
- **Direct localStorage usage:** yes (adapter + app context helper methods).
- **Direct AI calls:** none.
- **Missing fallback behavior:** low.
- **Build/runtime risks:** state drift between app-level `authDemoUser` and auth provider session.
- **Priority:** P1

### 2) Consent and setup flow
- **Status:** complete
- **Files involved:** `src/screens/AuthFlow.tsx`, `src/context/AppContext.tsx`
- **What works:** explicit consent stage, setup required before app shell access.
- **Incomplete:** no granular consent versioning.
- **Duplicated logic:** minimal.
- **Direct localStorage usage:** via app context helper.
- **Direct AI calls:** none.
- **Missing fallback behavior:** none critical.
- **Build/runtime risks:** low.
- **Priority:** P2

### 3) Health profile
- **Status:** mostly complete
- **Files involved:** `src/context/HealthContext.tsx`, `src/screens/Settings.tsx`, `src/utils/healthStorage.ts`
- **What works:** CRUD for profile fields; persistence; summary integration.
- **Incomplete:** profile data not fully used by memory snapshot builder.
- **Duplicated logic:** profile initialization occurs in both auth setup and health provider bootstrap.
- **Direct localStorage usage:** centralized helper + app-context helper.
- **Direct AI calls:** none.
- **Missing fallback behavior:** safe defaults present.
- **Build/runtime risks:** profile shape divergence risk if setup writes drift from health defaults.
- **Priority:** P1

### 4) Sensitive Mode
- **Status:** mostly complete
- **Files involved:** `src/context/HealthContext.tsx`, `src/context/AppContext.tsx`, `src/components/ScreenHeader.tsx`, `src/screens/Settings.tsx`
- **What works:** health profile source persists; UI blur behavior in key surfaces.
- **Incomplete:** app context keeps separate `sensitiveMode` state mirror.
- **Duplicated logic:** mirrored state in two contexts.
- **Direct localStorage usage:** through profile persistence.
- **Direct AI calls:** none.
- **Missing fallback behavior:** low.
- **Build/runtime risks:** state desync edge cases.
- **Priority:** P1

### 5) Today check-in
- **Status:** mostly complete
- **Files involved:** `src/components/TodayCheckIn.tsx`, `src/context/HealthContext.tsx`, `src/screens/Home.tsx`
- **What works:** check-in flow, urgent detection, save, next-action refresh, summary item save.
- **Incomplete:** one-time flow complexity can produce action/follow-up churn on repeated refreshes.
- **Duplicated logic:** action determination split between orchestrator v2 and legacy plan preview in home.
- **Direct localStorage usage:** indirect via helpers.
- **Direct AI calls:** none from component.
- **Missing fallback behavior:** good fallback from orchestrator and plan sync path.
- **Build/runtime risks:** multiple action derivation paths can diverge.
- **Priority:** P1

### 6) Ask Curavon
- **Status:** mostly complete
- **Files involved:** `src/screens/AskCuravon.tsx`, `src/utils/askIntakeRules.ts`, `src/utils/askIntakeStorage.ts`
- **What works:** guided intake, safety branch, orchestrated AI enhancement, plan action, follow-up creation, summary save.
- **Incomplete:** uses local `history` snapshot when planning; can lag latest entry in same cycle.
- **Duplicated logic:** safety split between intake flags and shared detector by design.
- **Direct localStorage usage:** via storage helpers.
- **Direct AI calls:** through orchestrator (correct).
- **Missing fallback behavior:** orchestrator fallback present.
- **Build/runtime risks:** async ordering and stale state windows.
- **Priority:** P1

### 7) Guides / guided flows / learning section
- **Status:** mostly complete
- **Files involved:** `src/screens/CareCircle.tsx`
- **What works:** in-tab guide browsing, flow runners, safety checks, doctor summary save, plan action generation, follow-up creation.
- **Incomplete:** large monolithic screen with dense control flow; hard to reason/test.
- **Duplicated logic:** some flow safety logic duplicated per runner state handling.
- **Direct localStorage usage:** indirect.
- **Direct AI calls:** through plan engine -> orchestrator.
- **Missing fallback behavior:** basic fallback present via plan engine.
- **Build/runtime risks:** high complexity + many local states.
- **Priority:** P1

### 8) Safety / red-flag system
- **Status:** mostly complete
- **Files involved:** `src/utils/healthSafety.ts`, `src/components/TodayCheckIn.tsx`, `src/screens/AskCuravon.tsx`, `src/screens/CareCircle.tsx`, `src/lib/plan/planEngineV2.ts`, `src/lib/ai/orchestrator/orchestratorGuards.ts`
- **What works:** centralized urgent detection utility used broadly; calm urgent copy; self-harm copy.
- **Incomplete:** legacy chat safety path remains in `AppContext`.
- **Duplicated logic:** legacy keyword checks in app context.
- **Direct localStorage usage:** red-flag logs via summary storage.
- **Direct AI calls:** safety checks occur before orchestrator and inside orchestrator guards.
- **Missing fallback behavior:** present.
- **Build/runtime risks:** legacy route confusion.
- **Priority:** P1

### 9) Next Best Action / Plan Engine
- **Status:** partial
- **Files involved:** `src/lib/plan/planEngineV2.ts`, `src/utils/orchestratorV2.ts`, `src/utils/actionEngineV2.ts`, `src/utils/nextBestActionEngine.ts`, `src/screens/Home.tsx`, `src/context/HealthContext.tsx`
- **What works:** plan v2 path with safe candidates + guarded reasoning + fallback.
- **Incomplete:** multiple competing engines/paths still active (legacy plan + orchestrator sync + old engine utilities).
- **Duplicated logic:** major duplication across old and new paths.
- **Direct localStorage usage:** indirect.
- **Direct AI calls:** via orchestrator in async plan path.
- **Missing fallback behavior:** yes, fallback exists in each engine.
- **Build/runtime risks:** contradictory recommendation source risk.
- **Priority:** P0

### 10) AI Kernel
- **Status:** complete
- **Files involved:** `src/lib/ai/aiKernel.ts`, `src/lib/ai/aiClient.ts`, `src/lib/ai/aiCache.ts`, `src/lib/ai/aiGuards.ts`
- **What works:** cache-first, call limits, urgent bypass, output validation, safe fallback.
- **Incomplete:** in-memory cache only (not persisted).
- **Duplicated logic:** some rate/budget checks also in governance.
- **Direct localStorage usage:** none in kernel itself.
- **Direct AI calls:** internal only.
- **Missing fallback behavior:** no.
- **Build/runtime risks:** low.
- **Priority:** P2

### 11) AI Orchestrator
- **Status:** mostly complete
- **Files involved:** `src/lib/ai/orchestrator/aiOrchestrator.ts`, `orchestratorGuards.ts`, `orchestratorState.ts`, `orchestratorLogger.ts`
- **What works:** central route, safety blocks, cache, governance + budget gate, output validation, decision trace hooks.
- **Incomplete:** runtime state cache + storage-based observability are split (not unified).
- **Duplicated logic:** orchestrator has own session counters and governance has separate counters.
- **Direct localStorage usage:** logs persist via helper.
- **Direct AI calls:** kernel only.
- **Missing fallback behavior:** present.
- **Build/runtime risks:** policy/counter divergence edge cases.
- **Priority:** P1

### 12) AI Governance
- **Status:** mostly complete
- **Files involved:** `src/lib/ai/governance/aiPolicy.ts`, `aiBudget.ts`, `aiPolicyState.ts`, `aiGovernanceGuards.ts`
- **What works:** allowlist task gating, source auth checks, compressed context requirement, API key fallback.
- **Incomplete:** budget estimation uses task-string proxy, not true prompt/token estimate.
- **Duplicated logic:** limits checked in both orchestrator guards and governance.
- **Direct localStorage usage:** state persisted via safe helpers.
- **Direct AI calls:** none.
- **Missing fallback behavior:** present (policy blocks to fallback).
- **Build/runtime risks:** low-medium.
- **Priority:** P1

### 13) AI Observability
- **Status:** mostly complete
- **Files involved:** `src/lib/ai/governance/aiDecisionTrace.ts`, `aiObservability.ts`, `aiObservabilityStorage.ts`
- **What works:** structured decision traces, summary aggregates, usage estimates.
- **Incomplete:** no retention policy beyond fixed list trim; no user-facing diagnostics panel.
- **Duplicated logic:** separate AI usage logs also written by plan/summary modules.
- **Direct localStorage usage:** yes (sanitized metadata).
- **Direct AI calls:** none.
- **Missing fallback behavior:** safe defaults from storage readers.
- **Build/runtime risks:** potential redundant logging growth.
- **Priority:** P2

### 14) Memory Snapshot
- **Status:** partial
- **Files involved:** `src/utils/healthSnapshot.ts`, `src/context/HealthContext.tsx`, `src/utils/askIntakeStorage.ts`
- **What works:** snapshot trend/risk/engagement aggregate with safe default snapshot.
- **Incomplete:** missing sources expected by architecture (health profile, follow-ups, guide results).
- **Duplicated logic:** legacy memory reader in `nextBestActionMemory.ts`.
- **Direct localStorage usage:** centralized via safeRead in snapshot builder.
- **Direct AI calls:** none.
- **Missing fallback behavior:** good fallback.
- **Build/runtime risks:** incomplete memory can bias recommendations.
- **Priority:** P0

### 15) Follow-Up Intelligence
- **Status:** mostly complete
- **Files involved:** `src/lib/followUp/*`, `src/context/HealthContext.tsx`, `src/screens/Home.tsx`, `src/screens/AskCuravon.tsx`, `src/screens/CareCircle.tsx`
- **What works:** creation from Today/Ask/Guides, dedupe, due logic, outcome evaluation, escalation path, summary save.
- **Incomplete:** no centralized ownership of follow-up creation (3 entry points).
- **Duplicated logic:** parallel creation in Ask/Guides/HealthContext.
- **Direct localStorage usage:** storage helper.
- **Direct AI calls:** none in primary outcome buttons.
- **Missing fallback behavior:** safe behavior if due queue empty.
- **Build/runtime risks:** duplicate/fragmented follow-up lifecycle over time.
- **Priority:** P1

### 16) Doctor Summary
- **Status:** mostly complete
- **Files involved:** `src/context/DoctorSummaryContext.tsx`, `src/lib/doctorSummary/*`, `src/components/DoctorSummaryHub.tsx`, `src/utils/doctorSummaryStorage.ts`
- **What works:** multi-source item aggregation, draft save/copy/download, AI summary on explicit action, fallback summary path.
- **Incomplete:** source coverage for next-action reasoning metadata is partial/implicit.
- **Duplicated logic:** add-from-source helpers and direct item creation coexist.
- **Direct localStorage usage:** storage helpers.
- **Direct AI calls:** via orchestrator only.
- **Missing fallback behavior:** present.
- **Build/runtime risks:** low-medium.
- **Priority:** P1

### 17) Local Data Adapter
- **Status:** mostly complete
- **Files involved:** `src/lib/data/localDataAdapter.ts`, `src/lib/data/dataAdapter.ts`, `src/lib/data/dataTypes.ts`
- **What works:** user-scoped collection model, legacy fallback reads, export per user, clear user data.
- **Incomplete:** many feature paths still bypass adapter and use top-level keys directly.
- **Duplicated logic:** adapter layer + direct storage layer coexist.
- **Direct localStorage usage:** yes (intentional in local adapter).
- **Direct AI calls:** none.
- **Missing fallback behavior:** solid parse fallback.
- **Build/runtime risks:** eventual inconsistency between adapter collections and legacy keys.
- **Priority:** P1

### 18) Data export/delete/backup/restore
- **Status:** mostly complete
- **Files involved:** `src/lib/data/dataExport.ts`, `dataDeletion.ts`, `dataBackup.ts`, `dataRestore.ts`, `src/screens/Settings.tsx`
- **What works:** export JSON, delete health data, account-delete split, backup/restore validate/merge/replace.
- **Incomplete:** delete-all-health clears core keys, but non-core telemetry/meta keys remain by design.
- **Duplicated logic:** export exists in health context and backup modules.
- **Direct localStorage usage:** yes (safe helper + health checks).
- **Direct AI calls:** none in data operations.
- **Missing fallback behavior:** validation and safe parse present.
- **Build/runtime risks:** key coverage drift over time.
- **Priority:** P1

### 19) Sync contract placeholder
- **Status:** partial
- **Files involved:** `src/lib/sync/syncContract.ts`, `syncQueue.ts`, `syncState.ts`, `syncLogger.ts`, `syncGuards.ts`
- **What works:** queueing contract, simulated processing, retries/conflicts, guardrails.
- **Incomplete:** no actual backend sync implementation (expected).
- **Duplicated logic:** none major.
- **Direct localStorage usage:** yes for queue/state/log.
- **Direct AI calls:** none.
- **Missing fallback behavior:** N/A (placeholder).
- **Build/runtime risks:** simulated success can mask real integration assumptions.
- **Priority:** P2

### 20) App navigation and state flow
- **Status:** partial
- **Files involved:** `src/App.tsx`, `src/components/TabBar.tsx`, `src/screens/FullFlow.tsx`, `src/screens/Home.tsx`, `src/screens/CareCircle.tsx`
- **What works:** tab routing + shell transitions.
- **Incomplete:** `flow` tab points to static `FullFlow` placeholder not unified with active Guides/Plan runtime.
- **Duplicated logic:** two parallel “flow” concepts (legacy full-flow screen + Guides flow runners).
- **Direct localStorage usage:** none direct.
- **Direct AI calls:** none.
- **Missing fallback behavior:** N/A.
- **Build/runtime risks:** user confusion and inaccurate product behavior during testing.
- **Priority:** P0

## Primary Production-Blocking Risks (P0)

1. Multiple next-action paths can produce inconsistent behavior (`planEngineV2`, `orchestratorV2`, `nextBestActionEngine`, home preview path).
2. Memory snapshot source coverage is incomplete versus intended architecture (follow-ups/guide results/profile not fully included).
3. Navigation includes legacy static `FullFlow` tab path that diverges from actual guides/flow runtime.

## Build Status

- `npm run build`: **PASS**
- TypeScript: no errors
- Vite: built successfully (bundle size warning only, non-blocking)

## Related Audit Documents

- `curavon-ai-audit-v1.md`
- `curavon-safety-audit-v1.md`
- `curavon-data-audit-v1.md`
- `curavon-product-flow-audit-v1.md`
- `curavon-hardening-backlog-v1.md`
