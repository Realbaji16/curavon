# Curavon Known Risks and Fixes v1

## Fixed in This Pass

1. **Urgent follow-up behavior drift**
   - **Risk**: Casual follow-ups could be created for urgent/escalate action types.
   - **Fix**: Follow-up creation now skips urgent/escalate records in shared creation paths.

2. **Developer status text visible in user UI**
   - **Risk**: Internal wording in Settings could leak implementation detail.
   - **Fix**: Removed visible developer mode text in primary Settings data section.

3. **Legacy AI path ambiguity**
   - **Risk**: Hard to identify primary vs legacy AI routing.
   - **Fix**: Added explicit legacy compatibility note in old helper module.

## Active Risks (Accepted for v1)

1. **Legacy compatibility layers remain**
   - `orchestratorAI`, older rule paths, and compatibility state logic are still present.
   - Kept intentionally to reduce regression risk during stabilization.

2. **No backend sync execution**
   - Sync layer is queue/state/contract simulation only.
   - Real network and conflict workflows are deferred.

3. **Strict AI budget fallback frequency**
   - Session caps can trigger more deterministic fallbacks for long sessions.
   - Expected behavior for safety/cost governance.

4. **Complex integration graph**
   - Multiple systems update shared state (Health, Follow-up, Summary, Memory, AI traces).
   - Requires careful regression testing and controlled cleanup in v2.

## Recommended Next Fix Wave (v2)

1. Remove or isolate legacy compatibility paths after regression signoff.
2. Add lightweight internal integration tests for:
   - safety-first AI blocking
   - follow-up dedupe and escalation paths
   - doctor-summary fallback behavior without API key
3. Prepare backend adapter conformance tests (without enabling backend).
