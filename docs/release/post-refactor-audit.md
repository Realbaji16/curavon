# Post-refactor audit

## 1. Audit date

**2026-06-18** (initial audit)  
**2026-06-21** (final clean verification re-run)

## 2. Commit SHA audited

`3486e7eb849864d23141e5f6263302e6286420dd`

Working tree includes recent refactors (Ask server routing, soft-delete filtering, plan v3 cache TTL, CareCircle data/runner/view/completion extraction). Re-run this audit after merging or before pilot release if HEAD changes.

## 3. Files / areas inspected

| Area | Primary paths | Test coverage |
|------|---------------|---------------|
| A — Ask server routing | `src/screens/AskCuravon.tsx`, `src/lib/client/aiRoutes.ts`, `app/api/ai/flow-proposal/route.ts`, `src/lib/ai/aiClient.ts` | `askCuravonServerRouting.test.ts`, `aiFlowProposalRoute.test.ts`, `healthFlowLifecycle.test.ts` |
| B — Soft-delete filtering | `src/lib/data/supabaseSoftDelete.ts`, `src/lib/data/supabaseDataAdapter.ts`, `src/lib/data/supabaseDataClient.ts` | `supabaseSoftDeleteFiltering.test.ts` |
| C — CareCircle refactor | `src/screens/guides/*`, `src/data/guides/*`, `src/hooks/guides/*`, `src/lib/guides/*` | `careCircleGuideData.test.ts`, `flowRunnerUtils.test.ts`, `useFlowRunner.test.ts`, `careCircleViews.test.ts`, `flowCompletion.test.ts` |
| D — Plan v3 cache | `src/lib/plan/planEngineV3Cache.ts`, `src/lib/plan/planEngineV3.ts`, `src/lib/plan/nextActionAdapter.ts` | `planEngineV3Cache.test.ts`, `planEngineV3Canonical.test.ts`, `nextActionAdapter.test.ts` |
| E — Release gates | `.github/workflows/ci.yml`, `package.json`, `src/__tests__/pilotGate.test.ts`, privacy/safety suites | `pilotGate.test.ts`, `pilotEnvHardening.test.ts`, `noDirectLocalStorage.test.ts`, `postRefactorAudit.test.ts` |

## 4. Automated verification results

### Initial run (2026-06-18)

Commands run from repo root after audit fixes:

| Command | Result |
|---------|--------|
| `npm ci` | Pass |
| `npm run lint` | Pass |
| `npm test` | Pass (325 tests) |
| `npm run test:safety` | Pass (114 tests) |
| `npm run test:privacy` | Pass (57 tests) |
| `npm run test:pilot-gate` | Pass (23 tests) |
| `npm run build` | Pass |

### Final clean verification (2026-06-21)

Pre-steps: stopped running dev server, `rm -rf .next`, then full gate sequence from repo root.

| Command | Result |
|---------|--------|
| `npm ci` | Pass (after terminating stale `node.exe` locks on Windows) |
| `npm run lint` | Pass |
| `npm test` | Pass (325 tests, 40 files) |
| `npm run test:safety` | Pass (114 tests, 10 files) |
| `npm run test:privacy` | Pass (57 tests, 6 files) |
| `npm run test:pilot-gate` | Pass (23 tests, 3 files) |
| `npm run build` | Pass |

**Previously reported failures (now cleared — stale / environmental, not product regressions):**

| Item | Status |
|------|--------|
| `planEngineV3Cache.test.ts` | Pass (included in `test:safety` and full `npm test`) |
| `settingsDeletionCopy.test.ts` | Pass (included in full `npm test`) |
| Turbopack dev cache write/compaction errors | Cleared by deleting `.next`; `npm run build` pass; `npm run dev` ready + `GET /` → 200 |

**Note:** First `npm test` immediately after `npm ci` hit transient Vitest worker thread timeouts (2 files). Immediate re-run passed all 325 tests with no code changes — treat as local process/resource noise after killing Node processes, not a gate failure.

## 5. Regressions found

| ID | Area | Finding | Severity |
|----|------|---------|----------|
| R1 | E — CI gate test | `pilotGate.test.ts` CI assertion only checked lint/test/build, not `test:pilot-gate`, `test:safety`, or `test:privacy` even though workflow runs them | Low (test gap) |
| — | A–D | No functional regressions detected in automated suites | — |

## 6. Fixes made

1. **`src/__tests__/pilotGate.test.ts`** — Expanded CI workflow assertion to require `test:pilot-gate`, `test:safety`, and `test:privacy` (matches `.github/workflows/ci.yml`).
2. **`src/__tests__/postRefactorAudit.test.ts`** — Added consolidated post-refactor audit gate tests across areas A–E.
3. **`docs/release/post-refactor-audit.md`** — This report.

No product behavior changes were required.

## 7. Area findings (summary)

### A — Ask Curavon server route

- `AskCuravon.tsx` uses `postFlowProposal` / `buildAskFlowProposalFromIntake`; no `runAIOrchestrator`, `generateCuravonNextAction`, or client draft-flow creation.
- Red-flag / concern text is sent to `/api/ai/flow-proposal`; server safety response drives escalation (`422` + `escalation`) and blocks self-care preview on urgent paths.
- Server response is source of truth for draft `flowId`, proposed action preview, escalation copy, risk level, and privacy level mapping (`mapAskPrivacyForServer`).
- Non-success paths (`401`, `503`, generic failure) show toast and **return early** without `activateHealthFlowWithAction`.
- Browser `runAIClient` remains server-only blocked.

### B — Soft-delete filtering

- `applyNotDeleted` defaults to hiding `deleted_at` rows; `includeDeleted` opt-in only.
- Covered tables include `health_flows`, `flow_actions`, `flow_blockers`, `follow_ups`, `doctor_summary_items`, `guide_results`, `ask_history`, `red_flag_logs`, `activity_insights`.
- Adapter/client read paths use `applyNotDeleted` for list/get operations.
- `data_export_requests` / `data_deletion_requests` are **create-only** in adapter (no list reads that could hide pending audit history in UI).

### C — CareCircle refactor

- Six view modes preserved via `CareCircleScreen` router + dedicated view components.
- Urgent path blocks completion via `flowCompletion.ts` + `shouldBlockRunnerCompletion` (no guide result, plan, follow-up, or doctor summary on blocked path).
- Safe completion saves guide result, generates next action, schedules follow-up with `acceptanceSource: 'guide_completed'`, and saves doctor summary item via `addFromFlow`.
- Sensitive completion redacts plan/guide `concernSummary` to flow title when `privacyLevel === 'sensitive'`.
- `pendingGuideFlowId` deep link preserved in controller.
- `CareCircleScreen.tsx` is **358 lines**; views own rendering only; re-export at `src/screens/CareCircle.tsx`.

### D — Plan v3 cache

- TTL constants: `PLAN_V3_CACHE_TTL_MS` (30m), `PLAN_V3_CACHE_SAFETY_TTL_MS` (5m), max 64 entries.
- Expired entries pruned on read/write; urgent current actions block cache reuse; disallowed action text rejected.
- `nextActionAdapter.ts` uses v3 only; no runtime `planEngineV2` import.

### E — Release gates

- CI runs: `npm ci`, lint, full test, pilot-gate, safety, privacy, build.
- No runtime `localStorage` / `sessionStorage` persistence in product paths (`noDirectLocalStorage.test.ts`).
- No `NEXT_PUBLIC_OPENAI` key pattern; server-only `OPENAI_API_KEY`.

## 8. Final verdict

**Pass with manual follow-ups**

Automated gates pass. No blocking regressions found in scoped areas.

### Manual follow-ups (non-blocking)

1. **CareCircle Sensitive Mode UI** — Guides views do not use `SensitiveBlur`/discreet display components; privacy is enforced via locked copy + completion summary redaction. Confirm product expectation for visible blur in guide result/browse.
2. **End-to-end pilot smoke** — Run manual flows: Ask intake → server proposal → accept action; CareCircle urgent runner → safety terminal; CareCircle safe completion → Today/Home follow-up visibility.
3. **Supabase staging** — Confirm soft-delete columns and RLS policies match adapter assumptions with live data (automated tests mock client).

## 9. Next recommended step

Proceed with **manual pilot smoke** on staging using `docs/release/private-pilot-runbook.md`, then tag a pilot candidate once smoke passes. Optional next code cleanup: extract CareCircle runner analytics (`collectFlowBehavior` start/back/skip) into a small helper — not required for release.
