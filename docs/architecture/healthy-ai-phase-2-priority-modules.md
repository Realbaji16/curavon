# Healthy.Ai Phase 2 — Priority Modules

Phase 2 deepens five Nigeria-context health modules, wires intake intelligence into flow proposal, and keeps the stack **deterministic and safety-bounded** — no live provider diagnosis, no prescription or dosage advice.

## 1. Goal of Phase 2

Phase 2 turns the Phase 1 intelligence skeleton into **production-quality routing and preparation** for the highest-traffic concerns:

- Richer module seeds (triggers, red flags, guided questions, summary fields)
- **Module-specific question priority** instead of generic severity-first ordering
- **Module-aware intake messages** that explain what Curavon will organize — not what condition the user has
- **Safe intelligence context** passed from Ask intake → `/api/ai/flow-proposal`
- **Module-aware flow proposal actions** that override generic client mock steps
- **Module-specific professional summary previews** (label-only field lists)

The pipeline still runs entirely on deterministic rules. `AI_ENABLED` does not enable diagnosis on intake.

## 2. Why these five modules

| Module ID | Why Phase 2 priority |
| --- | --- |
| `fever_malaria_ng_v1` | Core Nigeria entry (`body hot`, malaria drug, typhoid overlap); overlaps medication and lab modules |
| `medication_question_ng_v1` | Chemist/pharmacy counter context; pharmacist summary path; allergy escalation |
| `lab_result_confusion_ng_v1` | Widal / malaria–typhoid slip confusion; must not interpret results |
| `headache_ng_v1` | Very common; vision/neuro red-flag screening must come first |
| `clinic_pharmacy_prep_ng_v1` | Visit-prep bridge; checklist + questions without facility or medicine directives |

These five were the richest seeds after Phase 1 and cover the majority of multi-module overlaps in Nigerian phrasing.

## 3. Files changed

### Intelligence services

```
src/lib/health-intelligence/services/
  moduleQuestionStrategy.ts       # Per-module question priority tiers
  moduleResponseComposer.ts       # Module-aware intake opening messages
  intelligenceContextSerializer.ts # Safe derived metadata for flow proposal
  moduleActionTemplates.ts        # Module-aware flow proposal actions
  guidedQuestionEngine.ts         # Strategy boost + mandatory question slots
  healthIntelligencePipeline.ts   # Wires composer + summary + context
  professionalSummaryBuilder.ts   # Phase 2 module-specific summary fields
  nextBestActionPolicy.ts         # resolveFlowProposalActionFromIntelligenceContext()
```

### Module seeds (v1.1.0, `status: review`)

```
src/lib/health-intelligence/modules/seeds/
  fever_malaria_ng_v1.json
  headache_ng_v1.json
  medication_question_ng_v1.json
  lab_result_confusion_ng_v1.json
  clinic_pharmacy_prep_ng_v1.json
```

### Server / client wiring

```
src/lib/server/aiFlowProposalHandler.ts   # Uses intelligenceContext when present
src/lib/server/aiRouteGuards.ts           # parseFlowProposalIntelligenceContext()
src/lib/server/aiServerTypes.ts           # intelligenceContext on structured body
src/lib/client/aiRoutes.ts                # buildAskFlowProposalFromIntake()
src/screens/AskCuravon.tsx                # Stores aiIntelligenceContext in session
src/lib/health-intelligence/index.ts      # Public exports
```

### Tests

```
src/__tests__/healthIntelligencePhase2Acceptance.test.ts
src/__tests__/feverMalariaModule.test.ts
src/__tests__/headacheModule.test.ts
src/__tests__/medicationQuestionModule.test.ts
src/__tests__/labResultConfusionModule.test.ts
src/__tests__/clinicPharmacyPrepModule.test.ts
src/__tests__/moduleQuestionStrategy.test.ts
src/__tests__/moduleQuestionStrategyGuided.test.ts
src/__tests__/moduleResponseComposer.test.ts
src/__tests__/intelligenceContextSerializer.test.ts
src/__tests__/healthIntelligenceFlowProposalContext.test.ts
src/__tests__/aiFlowProposalIntelligenceContext.test.ts
src/__tests__/professionalSummaryBuilder.test.ts
```

## 4. How module-specific questions work

1. `routeHealthModules()` selects 1–3 modules and a `primaryModuleId`.
2. `getModuleQuestionStrategy(primaryModuleId)` returns tiered question IDs for Phase 2 modules:
   - `redFlagQuestionIds` — safety screening (e.g. headache vision/neuro)
   - `firstPriorityQuestionIds` — onset, severity, test name
   - `medicationQuestionIds` — medicines taken, source, reaction
   - `contextQuestionIds` — fluids, BP, visit blockers
   - `summaryPrepQuestionIds` — fields that feed professional summary
3. `generateGuidedQuestions()` merges module seed questions with strategy boosts via `strategyPriorityBoost()` and `ensureStrategyMandatoryQuestions()` so must-include IDs survive the 2–5 question cap.
4. Non-priority modules fall back to Phase 1 generic prioritization (red flags → timing → severity → medication).

## 5. How response composer works

`composeModuleAwareIntakeMessage()` in `moduleResponseComposer.ts` replaces the generic “Curavon can help organize notes…” opener when `primaryModuleId` is a Phase 2 module:

- Detects context signals from `rawText` and `normalizedTerms` (fever, medication, vision, lab, neuro)
- Builds a module-specific opening (fever, headache, medication, lab, clinic prep)
- Appends a guidance line (“Answer a few short questions…”) and safety disclaimer (“This does not diagnose…”)
- **Does not** overwrite urgent `redFlagBridge.message` on the urgent pipeline path

Urgent red-flag paths still use the bridge message; composer runs only on the non-urgent path.

## 6. How flow proposal uses intelligenceContext

```
Ask intake finishes
  → runHealthIntelligencePipeline() on landing (background)
  → serializeIntelligenceForFlowProposal(result)
       { selectedModules, primaryModuleId, riskLevel, normalizedTerms,
         questionCount, summaryFieldIds, allowedActionIds }
  → buildAskFlowProposalFromIntake() attaches intelligenceContext
  → POST /api/ai/flow-proposal
  → parseFlowProposalIntelligenceContext() validates shape (invalid → ignored)
  → resolveModuleFlowProposalAction(context) overrides client proposedAction
```

**Safety of the payload:** no `rawText`, `message`, `questions`, `summaryPreview` values, or provider payloads. `assertFlowProposalIntelligenceContextSafe()` rejects forbidden keys in tests.

Red-flag pre-block on flow proposal still runs first; urgent paths are unchanged.

## 7. Safety boundaries

| Rule | Enforcement |
| --- | --- |
| No diagnosis | `blockedOutputs.ts`, `responseSafetyValidator.ts`, composer copy |
| No prescription / dosage | Block patterns + medication module copy (“not start, stop, or change”) |
| No lab interpretation | Lab module action + composer; avoids interpreting Widal titres |
| Red flags first | `bridgeRedFlags()` / `detectRedFlags()` before pipeline output; headache strategy puts red-flag questions first |
| Urgent path unchanged | `safety.allowed = false`, seek urgent care messaging |
| Approved actions only | `moduleActionTemplates.ts` maps to `APPROVED_ACTIONS` IDs |
| Label-only summaries | `professionalSummaryBuilder.ts` returns `fieldId` + `label` only |
| No raw text in flow context | `intelligenceContextSerializer.ts` allowlist |

## 8. What Phase 2 still does not add

- Live OpenAI or other provider calls for intake intelligence (still deterministic)
- Automatic disease naming, treatment plans, or dosing recommendations
- Population of summary field **values** (labels only)
- Full production approval (`status: approved`) for the five modules — they remain `review`
- Deepening the other 15 skeleton modules to Phase 2 quality
- Phase 3 **forms** that collect answers into structured visit packets
- Facility referrals (“go to X hospital”) or medicine start/stop/change instructions
- Replacement of clinician/pharmacist judgment

## 9. Test commands

```bash
# Safety gate (Phase 1 + routing, red flags, plan guards, Ask server paths)
npm run test:safety

# Phase 2 end-to-end acceptance suite
npm run test -- src/__tests__/healthIntelligencePhase2Acceptance.test.ts

# Phase 2 module unit suites
npm run test -- src/__tests__/feverMalariaModule.test.ts
npm run test -- src/__tests__/headacheModule.test.ts
npm run test -- src/__tests__/medicationQuestionModule.test.ts
npm run test -- src/__tests__/labResultConfusionModule.test.ts
npm run test -- src/__tests__/clinicPharmacyPrepModule.test.ts

# Flow proposal + intelligence context
npm run test -- src/__tests__/healthIntelligenceFlowProposalContext.test.ts
npm run test -- src/__tests__/aiFlowProposalIntelligenceContext.test.ts

# Professional summary previews
npm run test -- src/__tests__/professionalSummaryBuilder.test.ts

# Lint and production build
npm run lint
npm run build
```

On Windows, if Vitest hangs:

```bash
npx vitest run src/__tests__/healthIntelligencePhase2Acceptance.test.ts --pool=threads --no-isolate
```

## Next phase — forms (Phase 3 preview)

Phase 3 should turn label-only summary previews into **guided forms**: each `summaryFieldId` becomes a fillable field, answers persist in the health flow session, and export produces a clinician/pharmacist handoff packet — still without diagnosis or treatment advice.
