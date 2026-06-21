# Private pilot rollback plan

Use when pilot safety, privacy, or stability requires **immediate reduction of exposure**. This is not a full production disaster recovery plan.

**Rollback owner:** ____________________  
**Last updated:** ____________________

---

## 1. Triggers (any one may invoke rollback)

- Confirmed or suspected **PHI leakage** in logs, analytics, or API responses
- **Auth bypass** or cross-user data access
- **Urgent safety path failure** (self-care generated for red-flag intake)
- **AI output** containing diagnosis, treatment, or prescription language reaching users
- **Secrets exposed** in client bundle or public env
- Sustained **P0** incidents with no hotfix within SLA

---

## 2. Rollback levels

| Level | Name | When |
|-------|------|------|
| **L1** | Feature throttle | Single route or AI feature misbehaving |
| **L2** | AI off | Any AI safety/privacy concern |
| **L3** | Pilot pause | Auth, RLS, or data integrity breach |
| **L4** | Full maintenance | Critical unknown; stop all access |

---

## 3. Procedures

### L1 — Feature throttle

1. Disable specific API route via env or deploy flag if available.
2. Document incident; continue pilot for unaffected flows.
3. Ship fix; re-run `npm run test:safety` / `test:privacy`.

### L2 — Disable AI

1. Set **`AI_ENABLED=false`** in pilot environment (server).
2. Remove or rotate **`OPENAI_API_KEY`** if compromise suspected.
3. Redeploy application (no client bundle change required for server env).
4. Verify:
   - `/api/ai/intake` returns deterministic mock or safe fallback
   - `/api/ai/flow-proposal` returns deterministic mock
   - `/api/ai/summary` returns deterministic mock
5. Track `ai_route_blocked` / `unsafe_response_blocked` events for audit.
6. Notify pilot users only if AI-dependent flows were actively promoted.

### L3 — Pause pilot (stop new usage)

1. Execute **L2** (disable AI).
2. Set **`NEXT_PUBLIC_AUTH_MODE=supabase`** but disable new signups:
   - Supabase dashboard: disable signups, or
   - Maintenance banner in app (if implemented), or
   - Remove invite links / rotate pilot URL
3. Existing sessions: allow read-only export path if safe; otherwise maintenance copy.
4. **Do not** delete user data during incident unless legally required — use deletion **requests** only.
5. Assign incident scribe; preserve `agent_events` and server logs (**redacted export only**).

### L4 — Full maintenance mode

1. Execute **L3**.
2. Deploy maintenance message: *"Curavon pilot is temporarily unavailable while we review a safety update."*
3. Block `/app` at edge or proxy if needed.
4. Revoke exposed keys immediately (OpenAI, Supabase service role if leaked).
5. Notify all pilot users with plain-language summary (no health details in email).

---

## 4. Key revocation checklist

If any secret may have leaked:

- [ ] Rotate `OPENAI_API_KEY` (OpenAI dashboard)
- [ ] Rotate Supabase **service role** key (if ever exposed — should not be in client)
- [ ] Rotate Supabase **publishable** key only if required by provider guidance
- [ ] Review GitHub / CI secrets
- [ ] Confirm no `NEXT_PUBLIC_*` AI keys in deployed env
- [ ] Re-run `npm run test:pilot-gate`

---

## 5. Safe incident log export

When exporting logs for review:

- Use Supabase `agent_events` with **metadata columns only**
- Never export raw `payload` fields without redaction review
- Use `docs/observability/safe-analytics.md` banned-field list
- Do not attach user concern text, symptoms, or summary bodies to tickets

---

## 6. User notification template (pilot)

> Subject: Curavon pilot — temporary pause  
>  
> We paused the Curavon private pilot while we review a safety and privacy update.  
> Curavon is not an emergency service — if you need urgent help, contact local emergency services or a clinician.  
> We will follow up when the pilot resumes. No medical advice is included in this message.

Customize with counsel if required.

---

## 7. Recovery (return to pilot)

1. Root cause documented; fix merged and CI green.
2. Re-run full **`private-pilot-launch-gate.md`** for affected sections.
3. New **`pilot-approval-template.md`** entry with rollback notes.
4. Re-enable AI only after `AI_ENABLED` + key checks pass.
5. Monitoring owner confirms 24h clean `agent_events` sample.

---

## 8. Rollback notes (fill during incident)

| Field | Value |
|-------|--------|
| Date/time UTC | |
| Level invoked | L1 / L2 / L3 / L4 |
| Trigger | |
| Commit before rollback | |
| Commit after fix | |
| Keys rotated | Y / N |
| Users notified | Y / N |
| Sign-off | |
