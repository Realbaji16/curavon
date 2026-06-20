# Curavon Step 11 — Full Flow Overlay Inside Today Next Best Action

**Date:** 2026-06-18  
**Goal:** Add an optional “See full flow” expanded pathway view on Today without reintroducing a Flow tab.

---

## Old flow / navigation status

| Item | Status |
|------|--------|
| Flow tab | **Removed** (Step 6) — 4 tabs: Today, Ask, Guides, Profile |
| Legacy `flow` tab key | Normalized to `circle` (Guides) |
| `FullFlow.tsx` screen | Deprecated standalone screen, **not in navigation** |
| Guides (`CareCircle`) | Canonical place to browse/start guided flows |

---

## New Full Flow placement

- **Location:** Today → Next Best Action hero card
- **Trigger:** Secondary link “See full flow” (or “How Curavon builds your flow” when no action)
- **Presentation:** `FullFlowOverlay` — full-screen modal matching Doctor Summary overlay pattern
- **Not a tab:** No new navigation item; overlay only

---

## Inspection findings (pre-implementation)

### Today Next Best Action (`Home.tsx`)

- Hero card reads `nextActionState` from `HealthContext`
- Fields used: `title`, `currentAction`, `reason`, `category`, `status`, `sourceSignals`, `watchFor`, `safetyLevel`, `relatedGuide`, `relatedGuideFlowId`
- Primary CTAs: Done, Blocked, Adjust, Add to summary, Related guide
- Supporting insights from legacy `buildNextBestActionPlan` (not hero action source)

### `NextActionState` (`types/health.ts`)

- Core: `currentAction`, `title`, `reason`, `source`, `category`, `status`, `safetyLevel`
- Guide links: `relatedGuide`, `relatedGuideFlowId`
- Follow-up: `followUpPrompt`
- Doctor summary hint: `relatedDoctorSummaryPrompt`

### Doctor Summary overlay

- `LazyDoctorSummaryOverlay` in `AppAuthGate` at z-index 125
- Opens via `openDoctorSummary()` from `AppContext`
- Full Flow closes before opening Doctor Summary to avoid stacking

### Safety / urgent

- `safetyLevel`: `normal` \| `caution` \| `urgent`
- `category: 'escalate'` treated as urgent in builder
- Urgent paths elsewhere remain terminal (Ask, Guides, check-in) — unchanged

### Data already exposed via `HealthContext`

- `nextActionState`, `healthProfile`, `dailyCheckins`, `healthSnapshot`, `dueFollowUp`

---

## Files changed

### New
- `src/types/fullFlow.ts`
- `src/lib/plan/fullFlowBuilder.ts`
- `src/components/FullFlowOverlay.tsx`
- `src/__tests__/fullFlowBuilder.test.ts`

### Modified
- `src/screens/Home.tsx` — “See full flow” link + overlay wiring
- `src/App.css` — Full Flow overlay + link styles

---

## Data sources used

| Source | Used for |
|--------|----------|
| `nextActionState` | Current action, category, source, safety, guide links |
| `healthSnapshot` | Trend focus area, guide activity, context |
| `dailyCheckins` | Context (“recent check-in”) |
| `dueFollowUp` | Pending follow-up section |
| `healthProfile` | Accepted in builder API (reserved; no duplicate reads) |

**No** new localStorage reads. **No** AI. **No** network.

---

## Safety behavior

- Builder avoids diagnosis / treatment / medication language
- Urgent/escalate: `urgent_boundary` section first; **no** normal “what happens after” self-care sequence
- Disclaimer in overlay: “Curavon does not diagnose”
- Does not mutate `nextActionState` or schedule follow-ups on open

---

## Regression checks

| Check | Expected |
|-------|----------|
| Today hero action | Unchanged; still primary |
| See full flow link | Secondary; below action explanation |
| Overlay open/close | Works; scroll lock like Doctor Summary |
| No action | Fallback model; no fake personalization |
| Urgent action | Safety boundary first |
| Doctor Summary | Opens after Full Flow closes |
| Guides | `setActiveTab('circle')` or `openGuidesWithFlow` |
| No AI on open | Confirmed — deterministic builder only |
| No action mutation | Confirmed |

---

## Build status

| Command | Result |
|---------|--------|
| `npm run build` | **Pass** — app shell ~205 kB minified |
| `npm run test` | **49/49 passed** (includes `fullFlowBuilder.test.ts`) |
| `npm run lint` | **0 errors, 0 warnings** |

---

## Remaining carryovers

1. `FullFlow.tsx` deprecated screen still in repo (not linked from nav)
2. Full Flow does not auto-save to Doctor Summary — user taps “Prepare doctor note”
3. Overlay is local to `HomeScreen` (not global lazy chunk like Doctor Summary)
4. `healthProfile` not yet used in section copy (API reserved)
