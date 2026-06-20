# Step 14 — Follow-Up Acceptance Lifecycle Audit

Date: 2026-06-18  
Scope: Schedule follow-ups only when the user accepts an action into Today — not on Ask preview generation.

---

## 1. Old follow-up scheduling paths (before fix)

| Location | When | Preview or accepted? | Urgent blocked? |
|----------|------|----------------------|-----------------|
| `AskCuravon.tsx` `finishIntake` | After Ask plan generated | **Preview** (bug) | Yes if plan urgent |
| `HealthContext` `applyNextActionFromPlan` | Today load, check-in, follow-up regen | Accepted | Yes |
| `HealthContext` `setNextActionFromSource` | Add to Today (Ask) | Accepted | Yes |
| `CareCircle.tsx` `saveFlowToDoctorSummary` | Guide completion | Accepted (guide ritual) | Yes |
| Activity Insights / Full Flow | N/A | Never scheduled | N/A |

**Bug:** Ask called `scheduleFollowUpForAction` immediately after generating `askFinalAction`, before the user tapped “Mark as Today's next action”.

---

## 2. Accepted vs preview action model

**AcceptedActionSource** (`src/types/actionLifecycle.ts`):

- `today` — Today-generated next action
- `ask_promoted` — Ask “Add to Today”
- `guide_completed` — Guide flow completion
- `checkin_plan` — Check-in plan acceptance
- `followup_adjusted` — Follow-up outcome generates new action
- `manual_refresh` — Manual Today refresh

**PreviewActionSource** (must never schedule):

- `ask_preview`, `doctor_summary_note`, `full_flow_overlay`, `activity_insight`, `fallback_preview`

**Rule:** Suggested action ≠ accepted action. Only accepted sources may call `scheduleFollowUpForAction`.

---

## 3. New behavior

1. **Ask:** Plan generation sets preview only; comment documents preview-only path. Follow-up schedules only via `acceptNextAction` when user promotes to Today.
2. **HealthContext:** `acceptNextAction()` centralizes persist + safe follow-up scheduling with stable `actionId` and dedupe.
3. **Scheduler:** `scheduleFollowUpForAction` requires `acceptanceSource: AcceptedActionSource`; preview sources rejected at runtime.
4. **Doctor Summary save:** Note only — no `nextActionState`, no follow-up.
5. **Guides:** Unchanged user outcome — follow-up on `guide_completed` after normal flow completion.
6. **Full Flow / Activity Insights:** No scheduling (unchanged).

---

## 4. Safety behavior (preserved)

Defense in depth unchanged:

- `scheduleFollowUpForAction` skips `urgent` / `escalate`
- `saveFollowUp` rejects urgent records at storage layer
- Ask urgent terminal path never generates plan follow-up
- Guide urgent terminal skips casual follow-up path

---

## 5. Duplicate prevention

- Same-day dedupe by `actionId` + pending status (existing)
- Ask promoted uses stable `ask-v2-{id}` actionId
- `isAcceptingAction` button guard on Ask Add to Today
- `acceptNextAction` uses date-scoped fallback id when no explicit id

---

## 6. Files changed

**Created:**

- `docs/audits/follow-up-acceptance-lifecycle-step-14.md`
- `src/types/actionLifecycle.ts`
- `src/__tests__/followUpAcceptance.test.ts`

**Changed:**

- `src/lib/followUp/followUpScheduler.ts` — acceptance source contract + preview guard
- `src/context/HealthContext.tsx` — `acceptNextAction`, centralized scheduling
- `src/screens/AskCuravon.tsx` — remove preview scheduling; promote via `acceptNextAction`
- `src/screens/CareCircle.tsx` — `guide_completed` acceptance source
- `src/__tests__/followUpEngine.test.ts` — updated scheduler API

---

## 7. Test coverage

| Test | File |
|------|------|
| Ask preview does not schedule | `followUpAcceptance.test.ts` |
| Ask promoted schedules one | `followUpAcceptance.test.ts` |
| Double promote dedupes | `followUpAcceptance.test.ts` |
| Doctor summary path skips | `followUpAcceptance.test.ts` |
| Urgent/escalate skipped | `followUpAcceptance.test.ts`, `followUpEngine.test.ts` |
| Guide completed schedules | `followUpAcceptance.test.ts` |
| Activity insight preview skips | `followUpAcceptance.test.ts` |
| Plan trigger → acceptance source mapping | `followUpAcceptance.test.ts` |

---

## 8. Build status

| Command | Status |
|---------|--------|
| `npm run test` | **80/80 passed** (9 files) |
| `npm run build` | **Pass** |
| `npm run lint` | **Pass** (0 errors) |

---

## 9. Remaining carryovers

- Guide completion auto-saves to Doctor Summary without explicit “Add to Today” — treated as guide acceptance ritual; could add explicit promote button later.
- `markActionAdjusted` does not schedule a new follow-up for the adjusted action (existing behavior).
- Export does not include follow-up acceptance audit trail (not required).
