# Curavon System Unification Audit v1

## Scope

This audit covers runtime integration and stabilization status for:

- Auth and onboarding
- Health profile and Today check-in
- Ask Curavon
- Guides runner
- Next Best Action path
- AI Kernel, Orchestrator, Governance, Observability
- Follow-Up Intelligence
- Doctor Summary
- Memory Snapshot
- Local data adapter + hardening
- Sync contract placeholder
- Shared safety/red-flag handling

## Runtime Flow Map

1. User enters app shell.
2. Local auth/session is checked.
3. Consent/setup state is checked before full app entry.
4. Today tab loads with local health state.
5. Memory snapshot loads/recomputes from local data.
6. Shared safety utility is available globally.
7. User can:
   - complete Today check-in
   - run Ask intake
   - run Guides flow
   - open Doctor Summary
8. Next Best Action is generated (safety-first, candidate-based).
9. Follow-up record is created for non-urgent actions.
10. Memory snapshot refreshes from latest changes.
11. Relevant events can be saved to Doctor Summary.
12. AI requests route through orchestrator + governance, then kernel.

## System Connection Status

- **Auth / onboarding**: connected
- **Health profile**: connected
- **Today check-in**: connected
- **Ask Curavon**: connected
- **Guides / flows**: connected
- **Next Best Action engine**: connected
- **AI Kernel**: connected (behind orchestrator in primary path)
- **AI Orchestrator**: connected
- **AI Governance**: connected
- **AI Observability**: connected
- **Follow-Up Intelligence**: connected
- **Doctor Summary**: connected
- **Memory Snapshot**: connected
- **Local data adapter/hardening**: connected
- **Sync contract placeholder**: partially connected (queue + state + simulation only)
- **Safety / red flag logic**: connected

## Preferred Primary Paths

- **Safety detection**: `utils/healthSafety.ts` shared utility.
- **AI execution**: feature -> orchestrator -> governance -> kernel.
- **Next Best Action**: plan engine v2 with safety-first override and guarded reasoning.
- **Follow-up creation**: health context + Ask/Guides save path; dedupe in follow-up storage.
- **Summary storage**: doctor summary storage helpers.
- **Local storage keys**: centralized in `lib/data/storageKeys.ts`.

## Duplicate / Legacy Notes

- `lib/ai/orchestratorAI.ts` remains as legacy compatibility path; primary routing is orchestrator v1.
- `utils/orchestratorV2.ts` and older rule-only paths remain for compatibility with existing state flows.
- Prototype/dead-chat compatibility constants in app context remain intentionally marked legacy.
- Some storage consumers still read legacy keys directly for backward compatibility.

## Fragile Areas

- Orchestrator and governance now enforce strict AI budgets; edge request-shape differences can shift fallback frequency.
- Follow-up and plan flows are multi-entry; maintain shared safety-first ordering in all call sites.
- Sync layer is simulated-only; no real remote conflict lifecycle exists yet.

## Fixes Applied During This Pass

- Removed visible developer-only status text from Settings data section.
- Unified follow-up safety behavior to skip casual follow-up creation for urgent/escalate actions.
- Marked legacy AI helper path explicitly for post-stabilization cleanup.

## Remaining Work (Deferred)

- Full removal of legacy compatibility code after stabilization v2 validation.
- Backend provider selection and implementation.
- Production auth and legal/privacy readiness.
