# Private pilot runbook

Operational guide for launching and running the **Curavon private pilot**. Not for public launch.

---

## 1. Scope

- **Audience:** Invited pilot users only (no open signup).
- **Purpose:** Validate safety, privacy, HealthFlow lifecycle, and Supabase persistence under real use.
- **Out of scope:** Public marketing, app-store release, clinical claims, emergency response.

---

## 2. Pilot parameters (fill before launch)

| Parameter | Value |
|-----------|--------|
| **Pilot name** | Curavon Private Pilot v1 |
| **Max users** | ≤ 25 (adjust with ops capacity) |
| **Environment** | staging / pilot Supabase project |
| **Commit SHA** | |
| **Launch date** | |
| **End date (review)** | +2 weeks initial window |

### Eligibility

- Age 18+ (or local minimum with guardian consent if applicable).
- Not using Curavon as sole source of medical decisions.
- Willing to use Supabase account (email/password or approved OAuth).
- **Excluded:** Users in acute crisis should be directed to emergency services, not onboarded.

### Feedback channel

- Primary: ____________________ (email / form / Slack)
- Severity labels: **P0 safety**, **P1 privacy/data**, **P2 product**, **P3 cosmetic**
- Triage: `docs/testing/issue-triage-rules-v1.md`

---

## 3. Pre-launch (T-7 to T-0)

1. Complete **`private-pilot-launch-gate.md`** — all required sections PASS or accepted risk documented.
2. Fill **`pilot-approval-template.md`** and obtain sign-offs.
3. Apply Supabase migrations to pilot project (`docs/runbooks/supabase-migrations.md`).
4. Run RLS two-user isolation (`docs/backend/rls-verification-checklist.md`).
5. Configure environment:
   ```bash
   APP_ENV=staging
   NEXT_PUBLIC_APP_ENV=staging
   NEXT_PUBLIC_AUTH_MODE=supabase
   NEXT_PUBLIC_SUPABASE_URL=<pilot-url>
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
   AI_ENABLED=false   # start deterministic; enable later if ready
   OPENAI_API_KEY=    # server-only, never NEXT_PUBLIC_*
   ```
6. Run locally and in CI:
   ```bash
   npm ci
   npm run lint
   npm test
   npm run test:pilot-gate
   npm run test:safety
   npm run test:privacy
   npm run build
   ```
7. Deploy to pilot hosting; verify `/api/health` and auth session.
8. Smoke test: onboarding → check-in → Ask (normal + urgent) → Today action → export request → deletion request.
9. Confirm monitoring: spot-check `agent_events` for redacted payloads only.

---

## 4. Launch day (T-0)

1. Send invite-only access instructions (no public URL promotion).
2. Include **known limitations** link: `docs/release/known-limitations.md`.
3. Include emergency guidance: Curavon is **not** an emergency service.
4. Enable monitoring watch on:
   - `red_flag_triggered`
   - `unsafe_response_blocked`
   - `ai_route_blocked`
   - error reporter logs (server)
5. Confirm on-call / incident owner is reachable.

---

## 5. Daily cadence (during pilot)

| Time | Owner | Action |
|------|-------|--------|
| Daily AM | Monitoring owner | Review `agent_events` sample; check for PHI patterns |
| Daily AM | Safety owner | Review any red-flag / safety_blocked flows |
| Daily PM | Product owner | Triage feedback; tag P0–P3 |
| Weekly | Eng owner | CI status, open defects, rollback readiness |

**Daily review checklist (5 min):**

- [ ] Any P0 safety reports?
- [ ] Any auth or data isolation anomalies?
- [ ] Export/deletion requests processing as expected?
- [ ] AI routes behaving (deterministic or controlled 503)?
- [ ] Need rollback? → `rollback-plan.md`

---

## 6. Incident response

| Severity | Response time | Action |
|----------|---------------|--------|
| **P0 Safety** | Immediate | Pause affected flow; consider rollback; document in approval template |
| **P1 Privacy** | Same day | Disable feature if needed; revoke keys if exposed |
| **P2 Product** | Next business day | Fix or workaround |
| **P3** | Backlog | Track only |

**Incident owner:** ____________________  
**Rollback owner:** ____________________  
**Monitoring owner:** ____________________

Escalation: product → engineering → safety reviewer → go/no-go on rollback.

---

## 7. End of pilot

1. Export anonymized metrics from safe analytics (no raw health text).
2. Retrospective: gate failures, near-misses, user feedback themes.
3. Decide: extend pilot, fix-and-relaunch, or pause.
4. Archive **`pilot-approval-template.md`** with final notes.

---

## 8. Related documents

- Launch gate: `private-pilot-launch-gate.md`
- Rollback: `rollback-plan.md`
- Known limitations: `known-limitations.md`
- Medical review: `medical-safety-review-checklist.md`
- Privacy/security: `privacy-security-checklist.md`
- Safe analytics: `docs/observability/safe-analytics.md`
