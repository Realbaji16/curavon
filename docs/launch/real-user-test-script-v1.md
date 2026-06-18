# Curavon Real-User Test Script v1

**Duration:** ~45–60 minutes full suite, or run individual tests  
**Build:** Local-first demo v1  
**Prerequisite:** Fresh install or cleared storage optional for TEST 1

---

## TEST 1 — First-time user

| Field | Detail |
|-------|--------|
| **Task** | Open app → onboarding → create account → consent → profile setup → land on Today → complete first check-in |
| **Expected** | Clear what Curavon does; setup not overly long; Today shows greeting, pattern area, one next action or check-in prompt; no diagnosis language |
| **Pass/Fail** | |
| **Notes** | |
| **User confusion** | |
| **Severity** | |

---

## TEST 2 — Ask normal concern

| Field | Detail |
|-------|--------|
| **Task** | Ask tab → start intake → enter headache, stress, or tiredness → complete intake → view result |
| **Expected** | Guided questions; one safe next step; "not a diagnosis" framing; optional follow-up scheduled; no treatment claims |
| **Pass/Fail** | |
| **Notes** | |
| **User confusion** | |
| **Severity** | |

---

## TEST 3 — Safety path (Ask)

| Field | Detail |
|-------|--------|
| **Task** | Ask → intake with urgent red-flag (e.g. chest pain or trouble breathing) → complete intake |
| **Expected** | Safety screen only; Prepare summary / Return to Today / Start over; **no** normal result; **no** casual next-step plan |
| **Pass/Fail** | |
| **Notes** | |
| **User confusion** | |
| **Severity** | |

---

## TEST 4 — Guides

| Field | Detail |
|-------|--------|
| **Task** | Guides (or Flow tab) → pick a guided flow → complete runner → view result |
| **Expected** | In-tab runner; result summary; one next action; follow-up created; guide result saved |
| **Pass/Fail** | |
| **Notes** | |
| **User confusion** | |
| **Severity** | |

---

## TEST 5 — Follow-up

| Field | Detail |
|-------|--------|
| **Task** | On Today, respond to follow-up card: Helped → Blocked → Worse (separate sessions or reset between) |
| **Expected** | Helped acknowledges; blocked adjusts messaging; worse triggers safety-aware response, not casual plan |
| **Pass/Fail** | |
| **Notes** | |
| **User confusion** | |
| **Severity** | |

---

## TEST 6 — Doctor Summary

| Field | Detail |
|-------|--------|
| **Task** | Save Ask result to summary; save guide result; open Doctor Summary → generate summary → copy/export if available |
| **Expected** | Items appear; generated text non-diagnostic; fallback works without API key |
| **Pass/Fail** | |
| **Notes** | |
| **User confusion** | |
| **Severity** | |

---

## TEST 7 — Data controls

| Field | Detail |
|-------|--------|
| **Task** | Profile → export health data → delete health data (confirm) → sign out → reload app |
| **Expected** | Export downloads JSON; delete clears health records; sign out returns to auth; reload after sign-in shows empty or fresh state; health data gone if deleted |
| **Pass/Fail** | |
| **Notes** | |
| **User confusion** | |
| **Severity** | |

---

## TEST 8 — Guides safety path (optional)

| Field | Detail |
|-------|--------|
| **Task** | Start guide → answer urgent warning sign on runner |
| **Expected** | Safety terminal; no normal flow result; doctor prep options |
| **Pass/Fail** | |
| **Notes** | |
| **User confusion** | |
| **Severity** | |

---

## Summary Sheet

| Test | Pass | Fail | Partial | Blocker? |
|------|------|------|---------|----------|
| 1 First-time | | | | |
| 2 Ask normal | | | | |
| 3 Ask safety | | | | |
| 4 Guides | | | | |
| 5 Follow-up | | | | |
| 6 Doctor Summary | | | | |
| 7 Data controls | | | | |
| 8 Guides safety | | | | |

**Overall ready for wider testing:** Yes / No  
**Top 3 issues to fix first:**

1.
2.
3.
