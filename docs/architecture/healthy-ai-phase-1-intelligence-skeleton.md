# Healthy.Ai Phase 1 — Intelligence Skeleton

Phase 1 adds a **deterministic**, Nigeria-context health intelligence layer inside Curavon. It organizes user concerns, routes symptom modules, asks safe guided questions, and prepares clinician/pharmacist summaries — **without diagnosis, prescription, or live AI provider calls**.

## What Phase 1 adds

| Area | Capability |
| --- | --- |
| **Domain types** | `HealthIntelligenceResult`, module IDs, safety shapes |
| **Module catalog** | 20 JSON seeds (`*_ng_v1`) with triggers, red flags, questions, allowed actions |
| **Nigerian language** | Phrase normalization (`body hot`, `belle pain`, `widal`, etc.) |
| **Module router** | Multi-module routing, overlap rules, context boosts (child, pregnancy, lab, medication) |
| **Guided questions** | 2–5 deterministic questions prioritized by safety, timing, severity |
| **Approved actions** | 11 stable next-step action IDs (seek care, track, prepare, etc.) |
| **Safety validator** | Blocks diagnosis, prescription, dosage, emergency minimization |
| **Professional summary** | Label-only doctor/pharmacist/lab preview fields |
| **Pipeline** | `runHealthIntelligencePipeline()` orchestrates the full stack |
| **API** | `/api/ai/intake` returns legacy `message` / `questions` / `nextStep` plus `result.intelligence` |
| **Ask UI** | Landing intake optionally calls `/api/ai/intake` for refinement (non-blocking) |

## What Phase 1 does **not** add

- Live OpenAI or other provider calls on intake (deterministic only, even when `AI_ENABLED=true`)
- Automatic diagnosis, disease naming, or treatment recommendations
- Replacement of Ask guided intake or flow-proposal as the authoritative draft-action path
- Full AI-generated module content for all 20 modules (15 remain skeleton seeds)
- Population of summary field **values** (labels only in Phase 1)
- New auth bypasses or relaxed production guards
- Client-side provider keys or browser model calls

## File map

```
src/lib/health-intelligence/
  index.ts                          # Public exports
  types.ts                          # HealthIntelligenceResult, safety types
  modules/
    moduleIds.ts                    # 20 HealthModuleId values
    moduleTypes.ts                  # HealthModule, triggers, questions
    moduleCatalog.ts                # Loads JSON seeds
    seeds/*.json                    # 20 module definitions
  nigeria/
    healthPhrases.ts                # Nigerian phrase → normalized term
    blockers.ts                     # Negation masking
    careRoutes.ts                   # Tag → care-route hints
  actions/
    allowedActions.ts               # Approved next-step IDs
    blockedOutputs.ts               # Blocked output patterns
  services/
    languageNormalizer.ts           # normalizeNigerianHealthLanguage()
    moduleRouter.ts                 # routeHealthModules()
    redFlagBridge.ts                # bridgeRedFlags() → detectRedFlags
    guidedQuestionEngine.ts         # generateGuidedQuestions()
    nextBestActionPolicy.ts         # resolveNextBestAction()
    responseSafetyValidator.ts      # validateHealthIntelligenceResponse()
    professionalSummaryBuilder.ts   # buildProfessionalSummaryPreview()
    healthIntelligencePipeline.ts     # runHealthIntelligencePipeline()

src/lib/server/
  aiIntakeHandler.ts                # /api/ai/intake → pipeline
  aiRouteGuards.ts                  # Auth, body parse, safety pre-check
  aiIntakeTypes.ts                  # Response types + intelligence field

src/lib/client/
  aiRoutes.ts                       # postAIIntake, processAIIntakeClientResult

src/screens/
  AskCuravon.tsx                    # Optional landing refinement UI

src/__tests__/
  healthIntelligencePhase1.test.ts  # Phase 1 acceptance suite
  healthIntelligenceCatalog.test.ts
  languageNormalizer.test.ts
  moduleRouter.test.ts
  guidedQuestionEngine.test.ts
  healthIntelligenceSafety.test.ts
  healthIntelligencePipeline.test.ts
  professionalSummaryBuilder.test.ts
  aiIntakeRoute.test.ts
```

## Request lifecycle

### `/api/ai/intake` (server)

```
POST { input: string, context?: object }
  → requireAuthenticatedSupabaseUser()
  → parseIntakeRequestBody()          # input or legacy concernText
  → assessIntakeSafety()              # detectRedFlags pre-block → 422 if urgent
  → runHealthIntelligencePipeline()   # always deterministic; no provider key required
       1. normalizeNigerianHealthLanguage
       2. routeHealthModules
       3. bridgeRedFlags
       4. generateGuidedQuestions
       5. resolveNextBestAction
       6. buildProfessionalSummaryPreview
       7. validateHealthIntelligenceResponse (message)
  → 200 { ok, safety, result: { message, questions[], nextStep, intelligence } }
```

### Ask Curavon landing (client)

```
User taps "Start guided intake"
  → Guided intake opens immediately (not blocked on network)
  → postAIIntake({ input }) in background
  → processAIIntakeClientResult()
       • success → show understood terms, modules, question hints on step 0
       • safety_blocked → existing safety screen
       • skipped → continue intake silently
  → finishIntake() → postFlowProposal() (unchanged authoritative path)
```

## Safety rules

1. **Red flags first** — `detectRedFlags` blocks `/api/ai/intake` with `422 safety_blocked` before pipeline output; urgent pipeline path sets `safety.allowed = false`.
2. **No diagnosis language** — validator blocks `you have [condition]`, `diagnosis`, certainty claims.
3. **No prescription / dosage** — blocks prescribe, dose advice, medication start/stop/change.
4. **No emergency minimization** — blocks “no need to see a doctor”, “no need for emergency”.
5. **Nigerian phrase negation** — `blockers.ts` masks negated phrases before matching.
6. **High-risk module priority** — chest pain, breathing, pregnancy, child fever, mental health crisis dominate `primaryModuleId`.
7. **Approved actions only** — next steps map to `APPROVED_ACTION_IDS`; module allowed actions filtered on urgent path.
8. **No raw input echo** — error responses never echo user text on safety block.
9. **No API key leakage** — responses never include `OPENAI_API_KEY`.
10. **Session metadata** — Ask stores only `selectedModules`, `riskLevel`, `questionCount` in session payload.

## How to run tests

```bash
# Full safety gate (includes intake, red flags, plan guards, Ask routing)
npm run test:safety

# Phase 1 acceptance suite
npm run test -- src/__tests__/healthIntelligencePhase1.test.ts
npm run test -- src/__tests__/healthIntelligencePhase1.test.ts

# Individual layers
npx vitest run src/__tests__/healthIntelligenceCatalog.test.ts
npx vitest run src/__tests__/languageNormalizer.test.ts
npx vitest run src/__tests__/moduleRouter.test.ts
npx vitest run src/__tests__/guidedQuestionEngine.test.ts
npx vitest run src/__tests__/healthIntelligencePipeline.test.ts
npx vitest run src/__tests__/aiIntakeRoute.test.ts

# Lint and production build
npm run lint
npm run build
```

On Windows, if Vitest hangs, use:

```bash
npx vitest run <file> --pool=threads --no-isolate
```

## Next phase — first 5 production-quality modules

Phase 2 should **deepen content and wire intelligence into flow-proposal**, starting with these five modules (richest seeds today + highest Nigeria traffic):

| Priority | Module ID | Why |
| --- | --- | --- |
| 1 | `fever_malaria_ng_v1` | Core Nigeria concern; phrase + router coverage |
| 2 | `medication_question_ng_v1` | Chemist/chemist-counter context; pharmacist summary |
| 3 | `lab_result_confusion_ng_v1` | Widal/malaria-typhoid slip confusion |
| 4 | `headache_ng_v1` | Common entry; red-flag question priority |
| 5 | `clinic_pharmacy_prep_ng_v1` | Visit-prep bridge to doctor summary |

**Recommended Phase 2 first step:** Expand these five seeds to `status: approved`, add module-specific guided-question templates to flow-proposal context, and pass `result.intelligence` from intake into `postFlowProposal` session payload — still without live provider diagnosis.
