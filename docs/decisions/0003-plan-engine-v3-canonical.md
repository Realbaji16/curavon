# ADR 0003: Plan Engine v3 is canonical

**Status:** Accepted  
**Date:** 2026-06-21  
**Scope:** Next-action generation and regeneration (Today, Ask, Guides, Follow-up)

## Context

Curavon had two plan engines:

- **planEngineV2** — AI reasoning over safe candidate lists (legacy orchestrator path)
- **planEngineV3** — explicit boundaries, synthesis guards, deterministic safe fallbacks, urgent overrides

`nextActionAdapter.ts` previously fell back from v3 to v2 on error. That created maintainability cost and a safety risk: v2 could bypass v3 boundary rejections and regenerate actions outside the conservative policy.

## Decision

1. **planEngineV3.ts is the only canonical runtime engine** for next-action generation and regeneration.
2. **Runtime imports** must use `nextActionAdapter.ts` only. Screens, contexts, and components must not import `planEngineV2` directly.
3. **AI may synthesize wording only** — not invent new action categories, primitives, or medical instructions. Guards:
   - `containsDisallowedActionText`
   - `DISALLOWED_ACTION_LABELS`
   - `validatePlanSynthesisResult` / `planSynthesisGuards`
4. **Urgent actions are protected** from automatic replacement via `shouldRegenerateNextAction` (`urgent_action_protected`) and v3 safety overrides.
5. **On v3 failure**, `nextActionAdapter` returns a conservative result:
   - preserve existing pending or urgent action when available
   - otherwise a generic stabilize fallback (`safe_fallback` / `plan_engine_unavailable`)
   - **never** call planEngineV2 for runtime generation
6. **planEngineV2 is deprecated** — retained for migration reference and compatibility tests only.

## Removal target

Remove `planEngineV2.ts` when:

- No runtime imports remain (enforced by tests)
- v3 deterministic + synthesis paths cover all scenarios previously served by v2
- Plan/next-action test suite passes without v2 runtime fallback

## Consequences

- `nextActionAdapter` exposes `planEngineReason` on outputs for observability.
- v3 internal fallback uses `deterministicResult` (safe candidates) instead of v2.
- CI includes plan/safety tests via `npm run test:safety`.

## References

- `src/lib/plan/planEngineV3.ts`
- `src/lib/plan/nextActionAdapter.ts`
- `src/lib/plan/nextActionRegenerationPolicy.ts`
- `src/lib/plan/planActionBoundaries.ts`
- `src/__tests__/planEngineV3Canonical.test.ts`
