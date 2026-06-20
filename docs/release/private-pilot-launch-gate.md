# Private pilot launch gate

Formal go / no-go checklist for **Curavon private pilot** only. This is not a public launch gate.

**Release owner:** ____________________  
**Target environment:** staging / pilot  
**Commit SHA:** ____________________  
**Gate date:** ____________________

Mark each item **PASS**, **FAIL**, or **N/A** with evidence link (CI run, test output, manual sign-off).

---

## A. Build / CI

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| A1 | `npm ci` passes on clean checkout | ☐ | |
| A2 | `npm run lint` passes | ☐ | |
| A3 | `npm test` passes | ☐ | |
| A4 | `npm run build` passes | ☐ | |
| A5 | `npm run test:pilot-gate` passes | ☐ | |
| A6 | GitHub Actions CI green on pilot PR | ☐ | |
| A7 | Branch protection required before pilot merge | ☐ | GitHub settings |

---

## B. Auth / access

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| B1 | Real pilot uses **Supabase auth only** (`NEXT_PUBLIC_AUTH_MODE=supabase`) | ☐ | env / deploy config |
| B2 | Local demo auth **disabled** outside development/test | ☐ | `pilotEnvHardening.test.ts` |
| B3 | Unauthenticated `/app` access blocked | ☐ | manual / `supabaseSsrAuth.test.ts` |
| B4 | Unauthenticated `/api/*` data/AI routes return **401** | ☐ | route tests |

---

## C. Secrets

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| C1 | No `NEXT_PUBLIC_OPENAI_API_KEY` in env or bundle | ☐ | `.env.example`, pilot gate test |
| C2 | No AI provider key in browser bundle | ☐ | `getAIConfig()` client returns no key |
| C3 | Server-only `OPENAI_API_KEY` when AI enabled | ☐ | `getServerAIConfig()` |
| C4 | No service-role key in client code | ☐ | grep / pilot gate test |

---

## D. Data / Supabase

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| D1 | Migrations applied to dev/staging | ☐ | `docs/runbooks/supabase-migrations.md` |
| D2 | RLS enabled on all user-owned tables | ☐ | `supabaseMigrations.test.ts`, RLS checklist |
| D3 | Two-user isolation test completed | ☐ | `docs/backend/rls-verification-checklist.md` |
| D4 | Auth profile trigger verified | ☐ | `docs/backend/supabase-profile-trigger-v1.sql` |
| D5 | App data stored in Supabase, not localStorage | ☐ | adapter tests |
| D6 | No runtime localStorage persistence | ☐ | `noDirectLocalStorage.test.ts` |

---

## E. Safety

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| E1 | Red-flag registry tests pass | ☐ | `npm run test:safety` |
| E2 | Urgent red flags block self-care flow creation | ☐ | `healthFlowLifecycle.test.ts`, Ask/Guides manual |
| E3 | AI routes re-check red flags server-side | ☐ | `aiIntakeRoute.test.ts`, `aiFlowProposalRoute.test.ts` |
| E4 | No diagnosis / treatment / prescription language in product copy | ☐ | medical review checklist |
| E5 | Unsafe prompt tests pass | ☐ | AI route tests |
| E6 | Self-harm / immediate danger copy routes to urgent help | ☐ | `redFlags.test.ts`, UI copy review |

---

## F. HealthFlow lifecycle

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| F1 | Ask Curavon creates **draft** flow only | ☐ | `healthFlowLifecycle.test.ts` |
| F2 | User approval activates flow | ☐ | Ask → Today manual |
| F3 | Flow action created after approval | ☐ | `activateHealthFlowWithAction` test |
| F4 | Done persists action status | ☐ | HealthContext + service test |
| F5 | Blocked persists blocker | ☐ | `persistFlowActionBlocked` test |
| F6 | Adjust persists adjustment | ☐ | `persistFlowActionAdjusted` test |
| F7 | Red-flag concerns do **not** create normal self-care action | ☐ | urgent intake test |

---

## G. Privacy

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| G1 | Sensitive Mode persists `privacy_level=sensitive` | ☐ | `privacyEnforcement.test.ts` |
| G2 | Sensitive compact views are discreet | ☐ | Home / summary manual |
| G3 | Care Circle does not expose raw health details by default | ☐ | `careCirclePrivacy` tests |
| G4 | Analytics/logs contain no raw health text | ☐ | `safeAnalytics.test.ts` |
| G5 | Notifications do not preview sensitive content | ☐ | `notificationPreview` helper |
| G6 | Data export request works | ☐ | `dataPrivacyRoutes.test.ts` |
| G7 | Data deletion request works | ☐ | `dataPrivacyRoutes.test.ts` |
| G8 | delete-flow / delete-summary / delete-health-profile routes work | ☐ | route tests |

Run: `npm run test:privacy`

---

## H. AI

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| H1 | Browser calls backend only (no client provider) | ☐ | architecture review |
| H2 | `AI_ENABLED=false` → deterministic safe output | ☐ | AI route tests |
| H3 | `AI_ENABLED=true` + missing server key → controlled **503** | ☐ | AI route tests |
| H4 | Provider outputs validated before persistence | ☐ | output validators / handlers |
| H5 | `agent_events` payloads are redacted | ☐ | `safeAnalytics.test.ts`, adapter sanitization |

---

## I. Monitoring

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| I1 | Safe analytics wrapper installed | ☐ | `src/lib/observability/safeAnalytics.ts` |
| I2 | Error reporter installed (console-safe fallback) | ☐ | `errorReporter.ts` |
| I3 | `unsafe_response_blocked` tracked safely | ☐ | AI handler integration |
| I4 | `red_flag_triggered` tracked safely (category only) | ☐ | `safeAnalytics.test.ts` |
| I5 | No raw symptoms, concern, medication, or summary body in telemetry | ☐ | redaction tests |

See: `docs/observability/safe-analytics.md`

---

## J. Legal / user-facing language

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| J1 | Clear disclaimer: not a doctor, not diagnosis, not emergency service | ☐ | Doctor Summary, Ask, onboarding |
| J2 | Known limitations visible to pilot users | ☐ | `docs/release/known-limitations.md` |
| J3 | Consent language present | ☐ | auth / onboarding flow |
| J4 | Privacy policy **draft** present (counsel review pending) | ☐ | `docs/launch/safety-and-privacy-placeholder-v1.md` |
| J5 | Terms **draft** present (counsel review pending) | ☐ | same placeholder doc |
| J6 | Emergency guidance copy reviewed | ☐ | medical safety checklist |

---

## K. Medical review

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| K1 | Medical/safety reviewer signs off on red-flag categories | ☐ | `medical-safety-review-checklist.md` |
| K2 | Sensitive flows reviewed | ☐ | |
| K3 | Doctor summary language reviewed | ☐ | |
| K4 | Escalation copy reviewed | ☐ | |

---

## L. Pilot operations

| # | Check | Status | Evidence |
|---|--------|--------|----------|
| L1 | Pilot size defined (recommended: ≤25 users) | ☐ | runbook |
| L2 | Pilot eligibility defined | ☐ | runbook |
| L3 | Feedback channel defined | ☐ | runbook |
| L4 | Incident response owner defined | ☐ | runbook |
| L5 | Rollback owner defined | ☐ | `rollback-plan.md` |
| L6 | Monitoring owner defined | ☐ | runbook |
| L7 | Daily review cadence defined | ☐ | runbook |

---

## Gate decision

| Decision | ☐ GO | ☐ NO-GO |
|----------|------|---------|
| **Blocking failures** | List any FAIL items above | |
| **Open risks accepted** | Link to approval template | |
| **Sign-off** | Product: ______ Safety: ______ Privacy: ______ Eng: ______ |

Complete **`pilot-approval-template.md`** before inviting pilot users.
