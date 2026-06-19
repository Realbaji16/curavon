# Step 13 — User-Facing Activity Insights Audit

Date: 2026-06-18  
Scope: Upgrade internal meta-system into safer user-facing **Activity Insights** in Settings/Profile.

---

## 1. Existing meta-system behavior (pre–Step 13)

**Location:** `src/utils/metaSystem.ts` (internal; not `src/lib/meta/`)

**Storage keys (`curavon_meta_*`):**

| Key | Purpose |
|-----|---------|
| `curavon_meta_action_outcomes` | Action done/blocked/ignored outcomes |
| `curavon_meta_safety_events` | Red-flag triggers, escalations (sanitized signals) |
| `curavon_meta_flow_behavior` | Guide/flow start, complete, abandon |
| `curavon_meta_orchestrator_events` | Orchestrator execution telemetry |
| `curavon_meta_insights` | Internal pattern/failure bundle |
| `curavon_meta_improvement_queue` | Internal improvement proposals |
| `curavon_meta_activity_insights` | **New** — user-facing insight cards only |

**Collection functions:**

- `collectActionOutcome` — HealthContext action outcomes
- `collectFlowBehavior` — CareCircle guide flows
- `collectSafetyEvent` / `collectSafetyFromRedFlag` — safety events from red flags
- `collectOrchestratorExecution` — orchestratorV2
- `collectAskCompletion` — Ask Curavon completion

**`runMetaSystemCycle` callers:**

- `HealthContext` (action outcomes, follow-ups, check-ins)
- `AskCuravon.tsx`
- `CareCircle.tsx`
- `orchestratorV2.ts`
- `collectSafetyFromRedFlag` / `collectAskCompletion`

**Red-flag path:**

- `DoctorSummaryContext.logRedFlag` → `doctorSummaryStorage.addRedFlagLog` → `collectSafetyFromRedFlag` (deduped by source/signal within 24h)

**Flow abandonment:** `collectFlowBehavior` with `event: 'abandon'`

**Action outcomes:** `collectActionOutcome` from HealthContext

**Proposal generation:** `generateImprovementProposals()` — internal only, not shown in UI

**Prior user-facing display:** None. Meta insights were internal analytics only.

---

## 2. New Activity Insights behavior

**User-facing name:** Activity Insights (never “meta-system”, “analytics”, or “behavioral analysis” in UI)

**Placement:** Settings/Profile → Activity Insights section (`ActivityInsightsSection.tsx`)

**What users see:**

- 2–4 short insight cards with title, body, optional evidence lines
- Source line: “Based on your Curavon activity”
- Safety copy: “These insights are not a diagnosis and do not replace medical advice.”
- Actions: Refresh insights, Clear Activity Insights

**Generation pipeline:**

1. Meta cycle collects events → `syncRuleInsightsAfterMetaCycle()` updates rule insights
2. On Activity Insights open / Refresh: `refreshActivityInsights()` builds summary → rule insights → optional AI polish
3. Guards validate all AI output; invalid insights dropped
4. Final safe cards stored in `curavon_meta_activity_insights`

**Example insights:**

- “Smaller steps may work better” (blocked actions)
- “A shorter guide may help” (abandoned guide)
- “You’re building useful context” (regular check-ins)
- “A safety note was saved” (red-flag safety event)
- “Curavon needs a little more context” (sparse data)

---

## 3. Data used

- Action outcome counts (done/blocked/ignored)
- Flow start/complete/abandon counts
- Check-in counts and coarse mood/energy trends (Low vs not-Low buckets)
- Safety event counts and source labels (Ask, check-in, guide — not raw text)
- Sanitized blocker pattern labels (counts only)
- Rule insight titles passed to AI (not raw user narrative)

---

## 4. Data never used

- Raw Ask prompts or full symptom notes
- Raw AI model responses
- Hidden reasoning / decision traces
- Medication names/doses (unless already generalized elsewhere)
- Diagnosis labels or condition inference
- Full red-flag user text in user-facing copy

---

## 5. Safety boundaries

- No diagnosis, disorder, or disease language
- No “you have” / “you may have” clinical framing
- No treatment plans or medication advice
- No “no need to see a doctor” or unsafe reassurance
- No emergency/clinical monitoring implication
- Safety notes described as saved for later review, not as dangerous patterns
- Urgent safety level blocks AI insight generation

---

## 6. AI boundaries

- Task: `activity_insight` (governance allowlist)
- Path: `evaluateAIPolicy` → `runAIClient` (not deprecated `guardedAI` / `orchestratorAI`)
- Input: `ActivityInsightInputSummary` + rule insight titles only
- Output: validated JSON insights; guards reject unsafe content
- Not stored: prompts, raw responses, hidden reasoning
- Fallback: rule insights always available; AI optional
- Throttle: max once per 24h unless forced refresh; skipped without API key, urgent safety, or meaningful activity

---

## 7. Export / delete behavior

**Delete health data:**

- `HEALTH_DERIVED_DELETE_PREFIXES` includes `curavon_meta_` (Step 12)
- Removes all meta keys including `curavon_meta_activity_insights`
- Auth/session keys (`curavon_auth_demo_user`, consent, setup) preserved

**Export:**

- `activityInsights` included in `EXPORT_HEALTH_DATA_KEYS` and `CuravonExportPayload`
- Exports final insight cards (title, body, evidence, source, createdAt)
- Does not export raw meta event logs, AI prompts, or model responses

**Clear Activity Insights:** User can clear stored cards without deleting all health data.

---

## 8. Files created / changed

**Created:**

- `docs/audits/user-facing-activity-insights-step-13.md`
- `src/types/activityInsights.ts`
- `src/lib/activityInsights/activityInsightSummary.ts`
- `src/lib/activityInsights/ruleActivityInsights.ts`
- `src/lib/activityInsights/activityInsightGuards.ts`
- `src/lib/activityInsights/activityInsightStorage.ts`
- `src/lib/activityInsights/aiActivityInsightInterpreter.ts`
- `src/lib/activityInsights/activityInsightEngine.ts`
- `src/components/ActivityInsightsSection.tsx`
- `src/__tests__/activityInsights.test.ts`

**Changed:**

- `src/utils/metaSystem.ts` — rule sync after cycle; red-flag dedupe
- `src/lib/data/storageKeys.ts` — `activityInsights` key + export
- `src/lib/data/dataExport.ts` — `activityInsights` payload field
- `src/lib/ai/governance/aiPolicyTypes.ts` — `activity_insight` task
- `src/lib/ai/governance/aiPolicy.ts` — allowlist
- `src/lib/ai/governance/aiBudget.ts` — token limit
- `src/screens/Settings.tsx` — UI section + privacy copy
- `src/App.css` — Activity Insights styles
- `src/__tests__/dataLifecycle.test.ts` — activity insights delete test
- `src/__tests__/dataScope.test.ts` — export key assertion

---

## 9. Tests / build / lint status

| Command | Status |
|---------|--------|
| `npm run test` | **70/70 passed** (8 files) |
| `npm run build` | **Pass** (tsc + vite) |
| `npm run lint` | **Pass** (0 errors) |

New tests in `src/__tests__/activityInsights.test.ts` cover delete scope, summary builder, rule insights, guards, AI guard fallback, and export.

---

## 10. Remaining carryovers

- Today tab gentle single-insight teaser (deferred)
- “Make future actions smaller” preference wiring (suggestedPreference stored but not yet applied to plan engine)
- Backup restore could explicitly refresh Activity Insights UI state (prefix keys restored via meta cycle on next open)
- Weekly comparison insight (“more check-ins than last week”) — partial via trends, not full week-over-week yet
- Non-English copy localization
