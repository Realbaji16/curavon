# Curavon HealthContext Plan Regeneration — Step 5

**Date:** 2026-06-19  
**Goal:** Stop over-regenerating Today's Next Best Action while preserving the one-action product loop.

---

## Old Regeneration Behavior (Risky)

### Primary risk path

`HealthContext` effect watched `healthProfile`, `dailyCheckins`, `nextActionState?.status`, and `applyNextActionFromPlan`:

```tsx
useEffect(() => {
  if (nextActionState && nextActionState.status !== 'pending') return;
  void applyNextActionFromPlan({ source: 'today', onlyIfPending: true });
}, [healthProfile, dailyCheckins, nextActionState?.status, applyNextActionFromPlan]);
```

**Problems:**
- Profile edits retriggered generation while a pending action existed
- Check-in list changes retriggered generation
- `applyNextActionFromPlan` depended on `healthProfile` / `todayCheckIn` → callback identity churn
- `onlyIfPending: true` still called `generateCuravonNextAction` and could replace pending hero text
- Step count updates (`addTodaySteps` / `setTodayStepsCount`) also triggered refresh

### Secondary paths

| Caller | When | Risk |
|--------|------|------|
| `saveCheckIn` | Check-in saved | Intended — explicit |
| `refreshPersonalizedAction` | Manual (unused in UI) | Weak trigger metadata |
| `submitFollowUpOutcome` | Follow-up decision | Intended when flagged |
| `clearHealthData` | Data reset | Did not regenerate after clear |
| `setNextActionFromSource` | Ask Add to Today | Direct write — OK |
| Ask/CareCircle `generateCuravonNextAction` | Flow completion | Screen-local — OK |

---

## New Regeneration Policy

File: `src/lib/plan/nextActionRegenerationPolicy.ts`

Function: `shouldRegenerateNextAction({ currentAction, trigger, lastGeneratedAt, onlyIfPending, force })`

### Allowed triggers

| Trigger | When used |
|---------|-----------|
| `initial_load` | Mount — only if no persisted action |
| `checkin_completed` | `saveCheckIn` |
| `action_completed` | Reserved for future explicit completion refresh |
| `action_blocked` | Reserved |
| `action_adjusted` | Reserved |
| `manual_refresh` | `refreshPersonalizedAction` |
| `ask_promoted` | Reserved — Ask uses `setNextActionFromSource` |
| `guide_completed` | Reserved — Guides use screen-local generation |
| `followup_requested` | `submitFollowUpOutcome` when engine requests new action |
| `data_reset` | `clearHealthData` |
| `demo_seed` | Reserved for demo utilities |

### Rules (conservative)

- No current action → allow
- Pending action + non-explicit trigger → **block**
- Urgent/escalate action → block automatic replacement
- Recent generation cooldown (5s) unless explicit trigger
- `force: true` bypasses policy (manual refresh, data reset)
- Skipped regeneration does **not** call `generateCuravonNextAction` → no AI/orchestrator/budget impact

---

## New HealthContext Behavior

1. **Initial load (once):** generate only if no persisted `nextActionState`
2. **Removed:** profile/check-in/status watching effect
3. **Removed:** step-count-driven regeneration
4. **`applyNextActionFromPlan`:** checks policy first; returns `{ status, reason, action? }`
5. **Stable callback:** reads profile/check-in from refs — no identity loop on action state updates
6. **Explicit handlers** pass `trigger` metadata

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/plan/nextActionRegenerationPolicy.ts` | New policy helper |
| `src/context/HealthContext.tsx` | Policy integration, effect stabilization, explicit triggers |

---

## Regression Checklist

| Test | Expected |
|------|----------|
| Fresh load, no action | One action generated |
| Reload with pending action | Same action, no loop |
| Edit health profile | Pending action unchanged |
| Complete check-in | Regenerates per policy |
| Mark done/blocked/adjusted | Status updates; no surprise auto-replace |
| Ask Add to Today | `setNextActionFromSource` unchanged |
| Guide completion | Screen-local plan unchanged |
| Follow-up new action | Only when engine requests |
| Delete health data | Regenerates once via `data_reset` |
| No API key | Deterministic fallback when generation runs |
| AI budget | Profile reload does not burn calls |

---

## Build Status

`npm run build` — **passed** (TypeScript + Vite, exit 0).

---

## Remaining Carryovers

- `markActionDone` / `markActionBlocked` / `markActionAdjusted` do not auto-generate next action (preserves existing product loop)
- Ask/Guides still call `generateCuravonNextAction` directly in screens for preview — promotion to Today uses `setNextActionFromSource`
- `action_completed` / `action_blocked` / `action_adjusted` triggers reserved in policy for future explicit wiring
