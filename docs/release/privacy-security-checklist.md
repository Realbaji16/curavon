# Privacy and security checklist — private pilot

For engineering + privacy reviewer sign-off before private pilot.

**Reviewer name:** ____________________  
**Review date:** ____________________  
**Commit SHA:** ____________________

---

## 1. Authentication and access

| # | Check | Pass | Evidence |
|---|--------|------|----------|
| 1.1 | Pilot uses Supabase auth only | ☐ | env config |
| 1.2 | Local demo auth blocked outside dev/test | ☐ | `pilotEnvHardening.test.ts` |
| 1.3 | `/app` requires authentication | ☐ | proxy / gate |
| 1.4 | Protected API routes return 401 unauthenticated | ☐ | route tests |

---

## 2. Secrets and client bundle

| # | Check | Pass | Evidence |
|---|--------|------|----------|
| 2.1 | No `NEXT_PUBLIC_OPENAI_API_KEY` | ☐ | `.env.example`, pilot gate |
| 2.2 | `OPENAI_API_KEY` server-only | ☐ | `getServerAIConfig()` |
| 2.3 | No Supabase service-role key in client | ☐ | grep / pilot gate |
| 2.4 | Publishable Supabase key only in browser | ☐ | `.env.example` |

---

## 3. Data storage and isolation

| # | Check | Pass | Evidence |
|---|--------|------|----------|
| 3.1 | Migrations applied to pilot Supabase | ☐ | migration runbook |
| 3.2 | RLS on all user-owned tables | ☐ | `supabaseMigrations.test.ts` |
| 3.3 | Two-user isolation verified manually | ☐ | RLS checklist |
| 3.4 | Profile trigger creates profile on signup | ☐ | SQL doc |
| 3.5 | No runtime localStorage for health data | ☐ | `noDirectLocalStorage.test.ts` |
| 3.6 | Data adapter is Supabase authority | ☐ | ADR 0001 |

---

## 4. Privacy controls

| # | Check | Pass | Evidence |
|---|--------|------|----------|
| 4.1 | Sensitive Mode → `privacy_level=sensitive` | ☐ | `privacyEnforcement.test.ts` |
| 4.2 | Discreet compact UI for sensitive flows | ☐ | Home / summary |
| 4.3 | Care Circle default: no raw health sharing | ☐ | `careCirclePrivacy.ts` |
| 4.4 | Pending/blocked/removed members have no access | ☐ | privacy tests |
| 4.5 | Doctor summaries not auto-shared to Care Circle | ☐ | architecture review |
| 4.6 | Notification preview generic for sensitive (`sensitive_preview=false`) | ☐ | notification helper |

---

## 5. Export, deletion, and API responses

| # | Check | Pass | Evidence |
|---|--------|------|----------|
| 5.1 | Export request creates pending row only (no dump in response) | ☐ | `dataPrivacyRoutes.test.ts` |
| 5.2 | Deletion request creates pending row only | ☐ | |
| 5.3 | delete-flow response has no title/body leak | ☐ | |
| 5.4 | delete-summary / delete-health-profile scoped | ☐ | |
| 5.5 | Error responses do not include health content | ☐ | |

---

## 6. Telemetry and logging

| # | Check | Pass | Evidence |
|---|--------|------|----------|
| 6.1 | `trackSafeEvent` allowlist enforced | ☐ | `safeAnalytics.test.ts` |
| 6.2 | Banned keys dropped (concern, symptoms, etc.) | ☐ | |
| 6.3 | `agent_events` sanitized at adapter insert | ☐ | |
| 6.4 | `errorReporter` redacts context | ☐ | |
| 6.5 | No raw health text in orchestrator/agent payloads | ☐ | `safe-analytics.md` |

---

## 7. Legal drafts (pilot)

| # | Check | Pass | Notes |
|---|--------|------|-------|
| 7.1 | Privacy policy draft available | ☐ | `docs/launch/safety-and-privacy-placeholder-v1.md` |
| 7.2 | Terms draft available | ☐ | same — counsel review **required** before public launch |
| 7.3 | Consent / disclaimer in auth flow | ☐ | |
| 7.4 | Known limitations published for pilot | ☐ | `known-limitations.md` |

---

## 8. Open risks

| ID | Risk | Severity | Accepted for pilot? |
|----|------|----------|---------------------|
| | | | |

---

## 9. Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Engineering | | | |
| Privacy / security | | | |

| ☐ **Approved for private pilot** | ☐ **Not approved** |
