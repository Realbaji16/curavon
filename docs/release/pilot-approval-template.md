# Private pilot approval template

Complete this document before inviting pilot users. Attach CI links and checklist evidence.

---

## Release identification

| Field | Value |
|-------|--------|
| **Release name** | |
| **Commit SHA** | |
| **Branch** | |
| **Environment** | staging / pilot |
| **Deploy URL** | |
| **Gate review date** | |
| **Planned pilot start** | |

---

## Checklist status summary

| Section | Doc | Status | Notes |
|---------|-----|--------|-------|
| Launch gate | `private-pilot-launch-gate.md` | ☐ Complete | |
| Runbook | `private-pilot-runbook.md` | ☐ Acknowledged | |
| Rollback | `rollback-plan.md` | ☐ Acknowledged | |
| Known limitations | `known-limitations.md` | ☐ Published to users | |
| Medical safety | `medical-safety-review-checklist.md` | ☐ Signed | |
| Privacy/security | `privacy-security-checklist.md` | ☐ Signed | |

---

## Automated verification (attach logs)

| Command | Result | Link / artifact |
|---------|--------|-----------------|
| `npm ci` | ☐ Pass | |
| `npm run lint` | ☐ Pass | |
| `npm test` | ☐ Pass | |
| `npm run build` | ☐ Pass | |
| `npm run test:pilot-gate` | ☐ Pass | |
| `npm run test:safety` | ☐ Pass | |
| `npm run test:privacy` | ☐ Pass | |
| GitHub Actions CI | ☐ Pass | |

---

## Open risks (accepted or blocking)

| ID | Risk | Severity | Owner | Mitigation | Accept for pilot? |
|----|------|----------|-------|------------|-------------------|
| R1 | | P0/P1/P2/P3 | | | ☐ Y ☐ N |
| R2 | | | | | ☐ Y ☐ N |
| R3 | | | | | ☐ Y ☐ N |

**Blocking risks (must be N/A or resolved for GO):** ____________________

---

## Reviewers

| Role | Name | Sign-off | Date |
|------|------|----------|------|
| Product owner | | ☐ | |
| Engineering lead | | ☐ | |
| Medical / safety reviewer | | ☐ | |
| Privacy / security reviewer | | ☐ | |
| Pilot operations owner | | ☐ | |

---

## Go / no-go decision

| Decision | Select one |
|----------|------------|
| ☐ **GO** — Private pilot approved | |
| ☐ **NO-GO** — Launch blocked | |

**Decision rationale:**  
_________________________________________________________________  
_________________________________________________________________

**Conditions (if GO with conditions):**  
_________________________________________________________________

---

## Rollback notes

| Field | Value |
|-------|--------|
| Rollback owner | |
| Last rollback drill date | |
| AI default for launch | `AI_ENABLED=false` ☐ / `true` ☐ |
| Emergency contact | |

**Pre-filled rollback triggers:** See `rollback-plan.md` sections 1–3.

---

## Post-approval

- [ ] Pilot invites sent (invite-only)
- [ ] Known limitations shared with users
- [ ] Feedback channel communicated
- [ ] Daily review cadence scheduled
- [ ] Monitoring owner confirmed for first 72 hours

**Approved by (final):** ____________________ **Date:** ____________________
