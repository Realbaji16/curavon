# Curavon First User Testing Plan v1

**Stage:** Controlled alpha usability testing  
**Status:** Ready to schedule after Launch Readiness Pass v1  
**Not for:** Public medical launch, clinical validation, or emergency use

---

## Overview

Curavon is ready for **controlled testing**, not public medical launch. The goal is to find confusion, safety perception issues, usefulness gaps, and product friction before wider rollout.

| Parameter | Value |
|-----------|-------|
| Tester count | 3–7 first testers |
| Session length | 20–35 minutes |
| Facilitator | 1 person observes; minimal coaching |
| Environment | Same build as `npm run build`; local device or browser |

---

## Primary Goals

1. Confirm users understand **what Curavon does** (one safer next step, organization — not diagnosis).
2. Confirm users **do not think Curavon diagnoses**.
3. Test whether the **Next Best Action** on Today feels useful and clear.
4. Test whether **safety messages** feel clear and calm — not scary or dismissive.
5. Test whether **Ask, Guides, Today, Follow-up, and Doctor Summary** connect logically.
6. Identify **confusing wording or navigation**.
7. Confirm **local data controls** (export, delete, sign out) are understandable.

---

## What Not to Test Yet

- Clinical effectiveness or outcomes
- Emergency handling as a real-world service
- Production auth or account recovery
- Backend sync or cross-device data
- Long-term retention or habit formation
- Payment willingness at scale
- Legal/compliance sign-off

---

## Session Flow (Suggested)

| Phase | Time | Activity |
|-------|------|----------|
| Intro | 3–5 min | Consent script (`tester-consent-script-v1.md`) |
| Warm task | 5 min | Open app, skim Today, optional check-in |
| Core tasks | 15–20 min | Follow `docs/launch/real-user-test-script-v1.md` subset (Tests 1–6) |
| Debrief | 5–10 min | Feedback questions (`feedback-collection-plan-v1.md`) |

Use **fictional scenarios** from `demo-data-plan-v1.md` unless the tester prefers their own general examples.

---

## Roles

| Role | Responsibility |
|------|----------------|
| **Facilitator** | Consent, task prompts, observe, record quotes, no health advice |
| **Observer (optional)** | Notes confusion, safety reactions, navigation hesitations |
| **Tester** | Think aloud; honest feedback; may stop anytime |

---

## Artifacts to Use

| Doc | Purpose |
|-----|---------|
| `tester-instructions-v1.md` | Share with tester before/during session |
| `tester-consent-script-v1.md` | Facilitator read-aloud + checkboxes |
| `test-session-checklist-v1.md` | Before/during/after session |
| `feedback-tracker-template-v1.md` | Log issues and quotes |
| `demo-data-plan-v1.md` | Safe fictional scenarios |
| `tester-safety-boundaries-v1.md` | Facilitator rules |
| `issue-triage-rules-v1.md` | Fix priority after sessions |
| `docs/launch/real-user-test-script-v1.md` | Detailed task steps |
| `docs/launch/product-demo-flow-v1.md` | Optional demo reference |

---

## Success Criteria (Alpha)

- No P0 issues open after first 3 sessions (or all P0s fixed before next tester)
- ≥80% of testers can describe Curavon as “helps organize / one next step — not a doctor”
- Urgent safety path recognized as different from normal flow
- Export and delete controls found without heavy prompting

---

## Final Pre-Test Checklist

Before the **first** tester:

- [ ] `npm run build` passes
- [ ] P0/P1 verification passed (`docs/audits/curavon-p0-p1-verification-audit-v1.md`)
- [ ] Launch checklist reviewed (`docs/launch/launch-readiness-checklist-v1.md`)
- [ ] Safety/privacy placeholder visible in Profile
- [ ] Real-user test script ready (`docs/launch/real-user-test-script-v1.md`)
- [ ] Feedback tracker ready (`feedback-tracker-template-v1.md`)
- [ ] Demo scenarios ready (`demo-data-plan-v1.md`)
- [ ] Tester consent script read (`tester-consent-script-v1.md`)
- [ ] Export/delete tested once on facilitator device
- [ ] Fresh account or cleared health data prepared (Profile → delete all health data)
- [ ] Facilitator read `tester-safety-boundaries-v1.md`

---

## After First Round (3–7 Sessions)

1. Triage all issues using `issue-triage-rules-v1.md`
2. Fix P0 before any new tester; fix P1 before expanding group
3. Update launch checklist and hardening backlog
4. Decide: second round, pause, or widen audience
