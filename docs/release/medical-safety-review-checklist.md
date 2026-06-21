# Medical safety review checklist — private pilot

For a qualified **medical or clinical safety reviewer** (not legal counsel). Sign before pilot go-live.

**Reviewer name:** ____________________  
**Credentials / role:** ____________________  
**Review date:** ____________________  
**Commit SHA:** ____________________

---

## 1. Scope disclaimer

Curavon **does not diagnose, treat, prescribe, or replace** professional medical or emergency care. This review confirms guardrails and copy are appropriate for a **private pilot**, not clinical validation of outcomes.

---

## 2. Red-flag registry

| # | Item | Pass | Notes |
|---|------|------|-------|
| 2.1 | Red-flag categories cover urgent presentations in scope (chest pain, breathing, stroke, self-harm, etc.) | ☐ | `src/lib/health/redFlags.ts` |
| 2.2 | Negation handling reviewed (e.g. "no chest pain") | ☐ | |
| 2.3 | Registry tests pass (`redFlags.test.ts`) | ☐ | |
| 2.4 | Urgent intake blocks normal self-care flow creation | ☐ | |
| 2.5 | Server AI routes re-run red-flag detection | ☐ | |

**Reviewer sign-off (Section 2):** ____________________ Date: ______

---

## 3. Escalation and crisis copy

| # | Item | Pass | Notes |
|---|------|------|-------|
| 3.1 | Self-harm language uses dedicated urgent copy | ☐ | |
| 3.2 | Immediate safety language uses dedicated copy | ☐ | |
| 3.3 | General urgent copy directs to emergency / clinician, not self-treatment | ☐ | |
| 3.4 | Ask Curavon safety terminal does not continue to result/plan | ☐ | |
| 3.5 | Guides urgent terminal reviewed | ☐ | |
| 3.6 | Doctor Summary safety notes labeled appropriately | ☐ | |

**Reviewer sign-off (Section 3):** ____________________ Date: ______

---

## 4. Product language (no clinical overreach)

| # | Item | Pass | Notes |
|---|------|------|-------|
| 4.1 | No "diagnosis" or "you have [condition]" language in UI/AI fallbacks | ☐ | |
| 4.2 | No prescription or dose-change instructions | ☐ | `planGuards.test.ts` |
| 4.3 | Doctor Summary states it organizes user notes, not clinical conclusions | ☐ | |
| 4.4 | Onboarding / consent includes non-emergency disclaimer | ☐ | |
| 4.5 | "One safer next step" framing — not treatment plan | ☐ | |

**Reviewer sign-off (Section 4):** ____________________ Date: ______

---

## 5. Sensitive flows

| # | Item | Pass | Notes |
|---|------|------|-------|
| 5.1 | Sensitive Mode persists `privacy_level=sensitive` | ☐ | |
| 5.2 | Discreet labels in compact views — no raw titles in dashboard hero | ☐ | |
| 5.3 | Sensitive doctor summary list items use discreet preview | ☐ | |
| 5.4 | Sexual/reproductive concerns handled with privacy, not broader sharing | ☐ | |

**Reviewer sign-off (Section 5):** ____________________ Date: ______

---

## 6. AI outputs (pilot)

| # | Item | Pass | Notes |
|---|------|------|-------|
| 6.1 | AI disabled path uses deterministic safe output | ☐ | |
| 6.2 | AI blocked on urgent server safety check | ☐ | |
| 6.3 | Output validators reject diagnosis/treatment patterns (where implemented) | ☐ | |
| 6.4 | Fallback to rules when provider unavailable | ☐ | |

**Reviewer sign-off (Section 6):** ____________________ Date: ______

---

## 7. Open findings

| ID | Severity | Finding | Mitigation / accept for pilot? |
|----|----------|---------|--------------------------------|
| | | | |

---

## 8. Final decision

| ☐ **Approved for private pilot** | ☐ **Not approved — block launch** |
|----------------------------------|-------------------------------------|

**Signature:** ____________________ **Date:** ____________________
