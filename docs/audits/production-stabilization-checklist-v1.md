# Curavon Production Stabilization Checklist v1

## SAFETY

- [x] Shared red-flag utility exists and is used across core paths.
- [x] Urgent safety path blocks normal AI/self-care reasoning.
- [x] Safety copy is calm and non-diagnostic.
- [x] No medication-change advice in guarded AI paths.

## AI

- [x] Orchestrator is the primary AI entry point.
- [x] Governance policy gates allowed/disallowed tasks.
- [x] AI observability summary + decision traces exist.
- [x] Cost controls enforced (session/request/day caps + cache-first).
- [x] Fallback paths return deterministic output without crashes.
- [x] No AI on auth/session refresh, backup/restore/export/delete flows.

## DATA

- [x] Local-first mode confirmed.
- [x] Storage keys centralized.
- [x] Safe JSON read/fallback patterns present.
- [x] Export/delete flows available.
- [x] Sign out preserves health data.
- [x] Local account deletion is separate from health-data deletion.
- [x] Corrupted local storage handling exists.

## PRODUCT

- [x] Today flow works.
- [x] Ask flow works.
- [x] Guides flow works.
- [x] Doctor Summary flow works.
- [x] Follow-up flow works.
- [x] Memory snapshot flow works.

## BUILD

- [x] `npm run build` passes.

## KNOWN GAPS

- [ ] Backend provider not selected.
- [ ] Clinical validation process not completed.
- [ ] Real-user test rounds not completed.
- [ ] Production auth stack not implemented.
- [ ] Legal/privacy policy finalization pending.
