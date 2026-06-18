# Curavon Launch Readiness Checklist v1

Use before real-user testing and product demos. Check when verified.

---

## PRODUCT

| Item | Status | Notes |
|------|--------|-------|
| Onboarding works | ☐ | 4 slides → auth setup |
| Today works | ☐ | One hero action, check-in, pattern card |
| Ask works | ☐ | Normal intake → one next step |
| Guides works | ☐ | Flow runner, result, learning cards |
| Follow-up works | ☐ | Outcome buttons on Today |
| Doctor Summary works | ☐ | Save, generate, copy |
| Profile/settings works | ☐ | Export, delete, sign out |

---

## SAFETY

| Item | Status | Notes |
|------|--------|-------|
| Red flags block normal plan | ☐ | Ask + Guides terminal safety |
| No diagnosis copy in UI | ☐ | "Does not diagnose" present |
| No medication change advice | ☐ | Plan guards + copy |
| Urgent path has safe options only | ☐ | No result continuation |
| Safety copy calm and consistent | ☐ | Shared healthSafety utility |

---

## AI

| Item | Status | Notes |
|------|--------|-------|
| AI through orchestrator/governance | ☐ | Active features only |
| Missing API key fallback works | ☐ | Rule-based plan/summary |
| No AI on urgent paths | ☐ | Early return before orchestrator |
| No AI on export/delete/auth | ☐ | Verified in audits |
| No raw prompts in export | ☐ | EXPORT_HEALTH_DATA_KEYS |

---

## DATA

| Item | Status | Notes |
|------|--------|-------|
| Local-first copy accurate | ☐ | AuthFlow, Settings, onboarding |
| Export works | ☐ | JSON download from Profile |
| Delete health data works | ☐ | Confirm-tap pattern |
| Sign out preserves health data | ☐ | Session keys only |
| No backend dependency | ☐ | Local demo only |

---

## DEMO

| Item | Status | Notes |
|------|--------|-------|
| 5–7 minute demo script ready | ☐ | See product-demo-flow-v1.md |
| Test account/demo state ready | ☐ | Create fresh or reset |
| Sample user journey ready | ☐ | See real-user-test-script-v1.md |

---

## KNOWN GAPS (Accept for v1 Test)

- Backend not implemented
- Production auth not implemented
- Clinical validation not done
- Legal/privacy policy placeholder only
- Consent versioning later
- Bundle size optimization later
- Flow + Guides tabs duplicate entry (same screen)

---

## Sign-off

| Role | Name | Date | Ready? |
|------|------|------|--------|
| Product | | | |
| Engineering | | | |
| Safety review | | | |
