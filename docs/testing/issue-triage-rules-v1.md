# Curavon Issue Triage Rules v1

How to prioritize fixes after controlled test sessions.

---

## Fix Immediately — Before Next Tester

| Issue | Why |
|-------|-----|
| Red-flag / urgent path fails | Safety |
| App **diagnoses** or strongly **appears to diagnose** | Trust + safety |
| App suggests **medication change** (start/stop/dose) | Safety |
| **Delete** or **export** health data fails | Privacy + trust |
| **App crash** or block on core task (auth, Today, Ask) | Session unusable |

**Process:** Halt new sessions until fixed and smoke-tested. Re-run urgent path + export/delete once.

---

## Fix Before Wider Test Group

| Issue | Why |
|-------|-----|
| Confusing **onboarding** or consent | First impression |
| **Next action** unclear or missing on Today | Core value prop |
| **Ask** flow confusing or too long | Core loop |
| **Guide** flow confusing or broken result | Core loop |
| **Doctor Summary** hard to find or generate | Visit-prep value |
| **Follow-up** cards confusing or unsafe on “worse” | Loop integrity |
| **Local-first / privacy** copy misleading | Trust |
| User thinks data is **synced to cloud** | Trust |

**Process:** Batch fix after 3–7 sessions; verify with one facilitator dry-run before expanding testers.

---

## Can Wait (P2 / Backlog)

| Issue | Notes |
|-------|-------|
| Visual polish, spacing, icons | No safety/trust impact |
| Bundle size warning | Documented known gap |
| Non-critical **loading states** | UX improvement |
| Copy **preferences** (tone tweaks) | Subjective |
| Flow + Guides **duplicate tabs** | Known limitation |
| Backend, production auth, Supabase | Out of scope for alpha |
| Consent versioning | Post-alpha legal |
| Forgot password | Demo auth only |

---

## Triage Workflow

```
New issue from session
        │
        ▼
  Safety or data failure? ──Yes──► P0 → fix before next tester
        │ No
        ▼
  Core flow broken or major
  trust confusion? ──Yes──► P1 → fix before wider group
        │ No
        ▼
  P2 / polish → backlog
```

---

## Decision Log Template

| Issue ID | Summary | Severity | Decision | Owner | Target |
|----------|---------|----------|----------|-------|--------|
| | | P0/P1/P2 | fix / defer / no-fix | | |

---

## Cross-References

- Severity definitions: `feedback-tracker-template-v1.md`
- Hardening backlog: `docs/audits/curavon-hardening-backlog-v1.md`
- Launch checklist: `docs/launch/launch-readiness-checklist-v1.md`
