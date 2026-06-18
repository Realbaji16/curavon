# Curavon Safety Audit v1

Audit date: 2026-06-18  
Mode: audit-only (no detection changes)

## Shared Red-Flag Utility

- **Status:** complete
- **Files:** `src/utils/healthSafety.ts`
- **What works:** centralized `detectUrgentConcern`, `findUrgentMatches`, `hasUrgentHealthLanguage`; calm copy constants; self-harm vs general urgent branching.
- **Priority:** —

## Red-Flag Term Coverage (documented, not changed)

| Term | Covered in `URGENT_PATTERNS` | Notes |
|------|------------------------------|-------|
| chest pain | yes | label `chest pain` |
| trouble breathing | yes | includes `difficulty breathing` |
| cannot breathe | yes | `can't breathe`, `cannot breathe`, variants |
| fainting | yes | |
| severe sudden pain | yes | |
| worst headache | yes | |
| face drooping | yes | |
| sudden weakness | yes | |
| heavy bleeding | yes | |
| suicidal thoughts | yes | label `suicidal` + self-harm terms |
| self-harm language | yes | `harm myself`, `hurt myself`, `kill myself`, etc. |
| stroke | yes | extra pattern present |

Guide flows also use multi-select urgent options (e.g. chest pain, trouble breathing) that feed into `detectUrgentConcern` on flattened answers.

## Path-by-Path Audit

### Today check-in safety path
- **Status:** mostly complete
- **Files:** `src/components/TodayCheckIn.tsx`, `src/context/DoctorSummaryContext.tsx`
- **What works:** `detectUrgentConcern` on symptoms/notes text; urgent modal; red-flag log via `logRedFlag`.
- **Incomplete:** urgent path stops step advance but user can still complete check-in after acknowledging (by design in modal flow).
- **Direct AI calls:** none.
- **Priority:** P2

### Ask safety path
- **Status:** mostly complete
- **Files:** `src/screens/AskCuravon.tsx`, `src/utils/askIntakeRules.ts`
- **What works:** structured red-flag step; urgent branch to safety screen; self-harm copy; red-flag logging; plan engine skipped for urgent flags in normal result path.
- **Incomplete:** Ask still calls orchestrator before red-flag branch resolves in `finishIntake` (orchestrator receives urgent safetyLevel when flags present — blocked downstream).
- **Fragile:** user can tap "I understand" on safety screen and view result mode after urgent event.
- **Priority:** P1

### Guides safety path
- **Status:** mostly complete
- **Files:** `src/screens/CareCircle.tsx`
- **What works:** runner urgent detection; mood safety yes/no maps to self-harm detection; safety modal; red-flag logging; meta-system flow behavior logging.
- **Incomplete:** after safety acknowledgment, flow can proceed to result.
- **Priority:** P1

### Follow-up "worse" safety path
- **Status:** mostly complete
- **Files:** `src/lib/followUp/followUpGuards.ts`, `src/lib/followUp/followUpEngine.ts`, `src/context/HealthContext.tsx`
- **What works:** `detectFollowUpSafetyEscalation` uses shared utility; worse + urgent note triggers escalation; opens urgent safety sheet; can save to doctor summary.
- **Incomplete:** no AI used on follow-up buttons (correct).
- **Priority:** P2

### Plan Engine safety path
- **Status:** complete
- **Files:** `src/lib/plan/planEngineV2.ts`, `src/lib/plan/planGuards.ts`, `src/lib/plan/planCandidates.ts`
- **What works:** safety override before candidates/AI; `isUrgentFromContext`; medication prep wording only in candidates; AI cannot pick outside candidate list.
- **Priority:** —

### Doctor Summary safety notes
- **Status:** mostly complete
- **Files:** `src/context/DoctorSummaryContext.tsx`, `src/lib/doctorSummary/doctorSummaryGuards.ts`, `src/utils/doctorSummaryItems.ts`
- **What works:** red-flag items logged with guidance copy; AI summary guarded by banned patterns; fallback non-diagnostic footer.
- **Incomplete:** red-flag logs store `userText` (user-facing concern text, not prompts).
- **Priority:** P2

### AI Orchestrator safety blocking
- **Status:** complete
- **Files:** `src/lib/ai/orchestrator/aiOrchestrator.ts`, `src/lib/ai/orchestrator/orchestratorGuards.ts`, `src/lib/ai/governance/aiGovernanceGuards.ts`
- **What works:** safety runs first; urgent level blocks AI; output validation; governance urgent override.
- **Priority:** —

## Required Safety Checks

1. **Red flags run before AI:** yes on orchestrator path; Ask passes urgent level to orchestrator which blocks.
2. **Urgent safety blocks normal self-care:** yes in plan engine override and orchestrator v2 safety override.
3. **Safety copy consistent and calm:** yes (`CALM_URGENT_*`, `SELF_HARM_URGENT_*`).
4. **Red flag logs brief and user-facing:** yes (source, matched concern, guidance, user text snippet).
5. **No diagnosis certainty:** guarded in AI outputs; rule-based copy avoids diagnosis.
6. **No medication start/stop/dose advice:** blocked in AI guards and plan/summary guard patterns.
7. **No emergency reassurance:** banned patterns include "no need to worry", "safe to wait", etc.
8. **No casual follow-up after urgent safety event:** mostly — `followUpStorage.ts` skips urgent/escalate; HealthContext skips escalate category.
9. **Safety fallback if data missing:** empty snapshot/check-ins fall back to empty snapshot and safe orchestrator fallback.
10. **Safety utility centralized:** yes; legacy `AppContext` chat keywords remain dead/legacy.

## Legacy / Duplicate Safety

- **Status:** legacy/dead
- **Files:** `src/context/AppContext.tsx` (`HIGH_RISK_KEYWORDS`, `addChatMessage`, `showSafetyEscalation`)
- **Risk:** not wired to active Ask/Today/Guides paths but still in codebase.
- **Priority:** P1

## Safety Audit Summary

Safety is **mostly unified** on the shared utility with strong AI blocking. Main gaps are **legacy chat safety path**, **post-urgent UX allowing result continuation in Ask/Guides**, and **red-flag user text persisted in logs** (expected for clinician prep, but sensitive).
