# Curavon Automated Smoke Tests — Step 7

**Date:** 2026-06-19  
**Goal:** Add focused offline unit tests for safety-critical, privacy-critical, and AI-boundary logic.

**Tests must run offline.** No live AI or network calls.

---

## Test Runner

| Item | Value |
|------|--------|
| Runner | Vitest 4.x |
| Environment | jsdom (localStorage for follow-up tests) |
| Config | `vitest.config.ts` |
| Location | `src/__tests__/*.test.ts` |

### Scripts

```bash
npm run test           # single run
npm run test:watch     # watch mode
npm run test:coverage  # coverage report
```

Test files are excluded from `tsc -b` app build via `tsconfig.app.json`.

---

## Test Files

| File | Coverage |
|------|----------|
| `healthSafety.test.ts` | `detectUrgentConcern`, self-harm flags, safe text, known substring gaps |
| `planGuards.test.ts` | `containsDisallowedActionText`, `aiMedicalBoundary`, reasoning/synthesis guards |
| `nextActionAdapter.test.ts` | Urgent override, medication prepare path, deterministic fallback |
| `followUpEngine.test.ts` | Outcome decisions, urgent skip, duplicate scheduling |
| `dataScope.test.ts` | Export/delete key scopes, auth separation |
| `testUtils.ts` | localStorage helpers, fake user id |

---

## Safety Cases Covered

- Urgent red-flag phrases (chest pain, breathing, self-harm, etc.)
- Self-harm `selfHarm: true` paths
- Safe non-urgent text negative cases
- Documented limitations: negation false positives, phrasing gaps (`fainted`, `my face is drooping`)
- Plan disallowed language (diagnosis, treatment plan, definitely, harmless)
- AI medical boundary violations
- Urgent next-action safety override (`escalate` / `urgent`, no normal self-care)
- Follow-up escalation on worse + red-flag note
- Urgent/escalate follow-up scheduling skipped

---

## Privacy / Data Cases Covered

- `EXPORT_HEALTH_DATA_KEYS` excludes auth credentials and AI internals
- `DELETE_HEALTH_DATA_KEYS` includes health profile, check-ins, ask history, summaries, follow-ups, telemetry
- Auth session keys separate from health delete scope
- Export payload does not serialize secret-like storage keys

---

## Known Untested Areas (Step 7)

- React component rendering (Settings, Ask, Home)
- E2E browser flows
- Full Plan Engine v3 AI synthesis path (network/orchestrator)
- Auth provider integration
- Sensitive Mode UI blur (visual)
- Navigation / tab routing
- Corrupted localStorage recovery paths
- Sync queue backend placeholder

---

## Build Status

`npm run build` — passed  
`npm run test` — 45 tests passed

---

## Documented Guard Gaps (expected, not fixed in Step 7)

- Substring urgent detector flags negated phrases (`I do not have chest pain`)
- Some medication phrasing (`Stop taking your medication`) not caught by plan regex
- `This does not diagnose` triggers `diagnose` substring in plan patterns
- `fainted` / `my face is drooping` phrasing gaps in urgent patterns
