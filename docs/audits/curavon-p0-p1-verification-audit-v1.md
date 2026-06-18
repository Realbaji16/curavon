# Curavon P0/P1 Verification Audit v1

Audit date: 2026-06-18  
Mode: verification-only (no code changes)  
Build: `npm run build` — **PASS**

---

## Overall Readiness Verdict

**Ready for Launch Readiness Pass**

No launch-readiness blockers found. P0 and P1 hardening fixes are applied and stable in code inspection and build. Remaining items are non-blocking P2 carryovers (legacy files, duplicate Flow/Guides tabs, insight-card legacy reader).

---

## P0 Verification

### 1. Single Next Best Action path

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `HealthContext.applyNextActionFromPlan()` → `generateCuravonNextAction()` → `planEngineV2.ts`; `Home.tsx` hero reads `nextActionState` only (no `runCuravonOrchestratorV2` preview); `AskCuravon.tsx` and `CareCircle.tsx` call adapter; `nextActionAdapter.ts` sync/fallback chain |
| **Notes** | `buildNextBestActionPlan()` still runs on Home for **supporting insight cards only** (commented legacy read path). Not used for hero action generation. |
| **Remaining risk** | Low — legacy engine files remain in repo but inactive for primary action |
| **Launch blocker** | no |

### 2. Memory Snapshot coverage

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `buildHealthSnapshot()` in `healthSnapshot.ts` reads: profile, check-ins, ask history, next action, doctor items, red flags, follow-ups (`FOLLOW_UPS_KEY`), guide results (`loadGuideResults()`); outputs `profileContext`, `followUpSignals`, `guideActivity`; `loadHealthSnapshot()` merges with safe defaults |
| **Notes** | Pattern language only; no diagnosis fields; `safeRead` used throughout |
| **Remaining risk** | Low — stored snapshot may lag until refresh after events |
| **Launch blocker** | no |

### 3. Flow tab → real Guides

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `App.tsx` `screens.flow` → `<CareCircleScreen />`; `FullFlowScreen` not imported/routed; `FullFlow.tsx` marked deprecated |
| **Notes** | Flow and Guides tabs both render `CareCircleScreen` (duplicate entry points, same experience) |
| **Remaining risk** | Low UX duplication, not functional |
| **Launch blocker** | no |

---

## P1 Verification

### 4. Ask urgent path terminal

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `AskCuravon.finishIntake`: `hasUrgentRedFlags` checked **before** `runAIOrchestrator`; early `return` with `setMode('safety')`; no `generateCuravonNextAction` or `scheduleFollowUpForAction` on urgent branch; safety UI: Prepare summary / Return to Today / Edit concern (no result mode button) |
| **Notes** | Minimal ask history entry saved on urgent (no AI refinement) |
| **Remaining risk** | None identified |
| **Launch blocker** | no |

### 5. Guides urgent path terminal

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `CareCircle.tsx`: `flowUrgentTerminal` state; `goRunnerNext` / `proceedRunner` block on urgent; `saveFlowToDoctorSummary` returns early if urgent; `flowSafetyTerminal` view mode; `flowResult` gated with `!flowUrgentTerminal`; safety modal does not advance to result |
| **Notes** | Terminal options: doctor prep, return to Guides/Today, restart flow |
| **Remaining risk** | None identified |
| **Launch blocker** | no |

### 6. CuravonAuthProvider canonical auth

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `AppContext` imports `useCuravonAuth`; `useEffect` syncs `authDemoUser` from provider `user`; `AuthFlow` uses `signIn`/`signUp` from provider; `Settings` calls `signOut()` + `signOutDemo()`; `localAuthAdapter` writes session keys |
| **Notes** | App shell gating still reads mirrored `authDemoUser` (synced from provider), not `isAuthenticated` directly |
| **Remaining risk** | Low — bridge is functional; edge race on first load unlikely |
| **Launch blocker** | no |

### 7. Health Profile canonical Sensitive Mode

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `Settings.tsx` toggles `updateHealthProfile({ sensitiveMode })`; `HealthContext` syncs profile → AppContext mirror; `Home.tsx`, `App.tsx`, `SensitiveBlur` read `healthProfile.sensitiveMode` |
| **Notes** | AppContext `setSensitiveMode` documented as legacy mirror only |
| **Remaining risk** | Low |
| **Launch blocker** | no |

### 8. Legacy chat safety isolated

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `AppContext.addChatMessage` uses `detectUrgentConcern(text)`; `HIGH_RISK_KEYWORDS` removed; legacy comment present |
| **Notes** | Chat path not wired to active Ask/Today/Guides flows |
| **Remaining risk** | Dead code surface if re-wired |
| **Launch blocker** | no |

### 9. orchestratorAI.ts isolated

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `@deprecated` header in `orchestratorAI.ts`; repo grep shows **no imports** from screens/contexts |
| **Notes** | File retained for compatibility |
| **Remaining risk** | Accidental future import |
| **Launch blocker** | no |

### 10. Follow-up centralization

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `followUpScheduler.ts` `scheduleFollowUpForAction()`; used by `HealthContext.createFollowUpForAction`, `AskCuravon`, `CareCircle`; dedupe + urgent skip in scheduler and `followUpStorage.saveFollowUp` |
| **Notes** | Direct `saveFollowUp` only called from scheduler/storage layer |
| **Remaining risk** | None |
| **Launch blocker** | no |

### 11. Export/delete key coverage

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `storageKeys.ts`: `CORE_HEALTH_DATA_KEYS`, `HEALTH_DERIVED_TELEMETRY_KEYS`, `RECOVERY_METADATA_KEYS`, `DELETE_HEALTH_DATA_KEYS`, `EXPORT_HEALTH_DATA_KEYS`; `dataDeletion.ts` uses `DELETE_HEALTH_DATA_KEYS`; `dataExport.ts` uses `EXPORT_HEALTH_DATA_KEYS` (excludes traces, orchestrator logs, sync internals) |
| **Notes** | `authDemoUsers` credential store not in health delete (account deletion scope) |
| **Remaining risk** | Low — document account vs health delete boundaries in launch pass |
| **Launch blocker** | no |

### 12. Local-first auth copy

| Field | Value |
|-------|-------|
| **Status** | **pass** |
| **Evidence** | `AuthFlow.tsx`: "stored on this device"; export/delete mention; no "synced"/"cloud"/"across devices" in user-facing auth copy |
| **Notes** | CSS/cloud background naming unrelated to product claims |
| **Remaining risk** | None |
| **Launch blocker** | no |

---

## Detailed Section Results

### Part 2 — Next Best Action

| Check | Status |
|-------|--------|
| Home reads persisted `nextActionState` only | pass |
| HealthContext writes via `applyNextActionFromPlan()` | pass |
| Ask uses `generateCuravonNextAction()` | pass |
| Guides uses `generateCuravonNextAction()` | pass |
| Legacy engines not active for primary action | pass |
| One primary action hero card | pass |
| API key fallback via adapter/plan sync path | pass |

### Part 3 — Memory Snapshot

| Source | Present |
|--------|---------|
| health profile | yes |
| daily check-ins | yes |
| Ask history | yes |
| next action state | yes |
| follow-ups | yes |
| red flag logs | yes |
| doctor summary items | yes |
| guide results | yes |
| Non-diagnostic / safe fallback | pass |

### Part 4 — Flow / Guides

| Check | Status |
|-------|--------|
| No FullFlowScreen routing | pass |
| Flow → CareCircleScreen | pass |
| Guided flows + mind + basics content | pass |
| In-tab runner | pass |
| Guide result record saved | pass (`saveGuideResult`) |

### Part 5 — Urgent Safety

| Path | Status |
|------|--------|
| Ask terminal safety | pass |
| Guides terminal safety | pass |

### Part 6 — Auth / Sensitive Mode

| Check | Status |
|-------|--------|
| Auth canonical + mirror | pass |
| Sign out preserves health data | pass (session keys only cleared) |
| Missing session → auth shell | pass |
| Sensitive mode canonical + persist | pass |

### Part 7 — Legacy Paths

| Check | Status |
|-------|--------|
| Chat uses shared safety utility | pass |
| No duplicate HIGH_RISK_KEYWORDS | pass |
| orchestratorAI deprecated, no UI imports | pass |
| Legacy NBA files commented, not primary | pass |

### Part 8 — Follow-up

| Check | Status |
|-------|--------|
| Scheduler exists and used by 3 callers | pass |
| Dedupe + urgent skip | pass |

### Part 9 — Data Export / Delete

| Check | Status |
|-------|--------|
| Grouped keys defined | pass |
| Delete clears health + telemetry | pass |
| Export user records + safe AI metadata | pass |
| Export excludes secrets/prompts/responses | pass |
| Sign out preserves health | pass |

### Part 10 — Local-first Copy

| Check | Status |
|-------|--------|
| No sync/cloud claims in AuthFlow | pass |

### Part 11 — Build

| Check | Result |
|-------|--------|
| TypeScript | pass |
| Vite | pass |
| Bundle warning | yes (>500kb, non-blocking) |

---

## Launch Readiness Blockers

**None.**

---

## Non-blocking P2 Carryovers

- Bundle size / code-split tab screens
- AI cache persistence across reload
- Consent versioning
- Remove legacy chat path and `FullFlow.tsx` artifact
- Adapter collection key migration (user-scoped storage)
- Loading states on async plan refinement
- Consolidate Flow + Guides tabs (duplicate CareCircle entry)
- Remove `buildNextBestActionPlan` insight legacy reader when insight cards migrate to snapshot

---

## Recommended Next Pass

**Launch Readiness Pass v1** — focus on:

1. Manual end-to-end test script execution (auth, Today, Ask, Guides, urgent paths, export/delete, reload)
2. Copy/consent polish and empty-state review
3. Performance (code-splitting for bundle warning)
4. Pre-launch checklist: data controls UX, doctor summary, error boundaries
5. Document account delete vs health delete vs sign-out for testers
