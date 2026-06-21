# Server AI routing

Curavon routes health-sensitive AI work through authenticated Next.js API handlers. Browser code must not call providers directly.

## Ask Curavon

Primary path after guided intake completion:

```
AskCuravon finishIntake
  → postFlowProposal()  (/api/ai/flow-proposal)
  → handleAIFlowProposalPost (server)
  → red-flag re-check (detectRedFlags)
  → draft health_flow OR safety_blocked / escalation
  → Ask UI shows proposal preview (awaiting approval) OR safety terminal
  → user approval activates flow via existing HealthFlow lifecycle
```

- **Server safety is authoritative** — client intake rules may preview urgency, but flow creation and action proposals for Ask go through the server route.
- **No automatic activation** — successful proposals return `flowStatus: awaiting_user_approval`; the user must approve before `activateHealthFlowWithAction`.
- **Live provider deferred** — unless `AI_ENABLED=true` and server keys are configured, handlers use deterministic mock proposals after safety checks. No browser OpenAI calls.
- **Client orchestrator deprecated for Ask** — `runAIOrchestrator` is not used in `AskCuravon.tsx`. Plan Engine v3 via `nextActionAdapter` remains for Today/other surfaces, not Ask intake completion.

## Client helpers

| Helper | Route | Purpose |
| --- | --- | --- |
| `postFlowProposal` | `/api/ai/flow-proposal` | Ask (and future guide) draft flow proposals |
| `postAIIntake` | `/api/ai/intake` | Optional structured intake refinement (server-only provider) |

Both live in `src/lib/client/aiRoutes.ts`. They use `credentials: 'same-origin'`, typed results, and never log raw concern text.

## Error handling (Ask)

| Status | Behavior |
| --- | --- |
| `401` | Auth-safe copy — sign in required |
| `422` + `safety_blocked` | Safety escalation UI; no self-care action |
| `503` + `ai_unavailable` | Safe retry copy; no client orchestrator fallback |
| Network | Safe retry copy |

## Related routes

- `/api/ai/summary` — doctor-ready summary generation (server)
- `/api/ai/intake` — intake refinement (server)

## Remaining gaps

- Guide completion should adopt `postFlowProposal` with `guideResultId` (not in this fix).
- Doctor Summary AI may still use legacy orchestrator paths until migrated.
- Live provider responses when `AI_ENABLED=true` need end-to-end pilot validation.
