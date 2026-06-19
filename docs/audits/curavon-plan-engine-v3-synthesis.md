# Curavon Plan Engine v3 — Guarded AI Action Synthesis

**Version:** v3  
**Status:** Active via `generateCuravonNextAction()` → `planEngineV3.ts`  
**Prior engine:** Plan Engine v2 retained as fallback

---

## Why v3 Exists

Plan Engine v2 only allowed AI to **choose among pre-built safe candidates**. That was safe but rigid for Curavon’s core promise: one useful, context-aware next best action.

Plan Engine v3 lets AI **synthesize a custom safe action** inside a tightly bounded action space — then validates it before anything reaches the UI.

---

## Architecture

```
Health Snapshot / Intake / Follow-up / Guide Result
  → Safety Check
  → Rule-Based Baseline Candidates (v2 generator)
  → [if complex] AI Safe Action Synthesis (orchestrator + governance)
  → Action Boundary Validator (planSynthesisGuards)
  → Plan Guard (disallowed patterns)
  → Final Next Best Action
  → Save to state
  → Schedule Follow-up (if appropriate)
```

**Fallback chain:** v3 synthesis → Plan Engine v2 → deterministic safe action.

---

## How AI Reasons Beyond Candidates

When context is **complex** (multiple signals, blockers, vague concern, follow-up worse/blocked, guide activity, profile context, weak generic candidates), v3 calls `synthesizeNextBestAction()` with:

- Compressed snapshot summary only
- Current concern summary
- Source signals
- Baseline safe candidates
- Allowed categories and primitives
- Disallowed action list

AI may return:

1. `use_existing_candidate` — pick a baseline candidate ID, or  
2. `synthesize_custom_action` — one custom action using a single allowed primitive.

Output is **always post-validated** before use.

---

## Allowed Action Space

### Categories

- `stabilize`
- `track`
- `prepare`
- `reduce_friction`
- `escalate`

### Primitives (by category)

| Category | Examples |
|----------|----------|
| stabilize | breathing pause, reduce immediate pressure, write one feeling |
| track | record timing, record intensity, record triggers |
| prepare | write clinician question, prepare medication note without advice |
| reduce_friction | choose 2-minute version, identify blocker, make action smaller |
| escalate | return to safety guidance, prepare urgent note, save red-flag summary |

Defined in `planActionBoundaries.ts`.

---

## Disallowed Action Space

Never allowed in synthesized or selected text:

- Diagnosis / “you have [condition]”
- Treatment plans
- Medication start/stop/change or dosage advice
- Supplement advice
- Lab interpretation certainty
- Emergency reassurance (“no need to see a doctor”, “harmless”)
- Certainty language (“definitely”)
- Therapy/crisis replacement language
- Multi-step medical protocols

Rejected outputs fall back to v2 or deterministic rules.

---

## Safety Validation

1. **Pre-AI:** urgent safety → no AI; escalation-only action  
2. **Governance:** `next_action_synthesis` task; blocked on urgent, missing API key, session limits  
3. **Post-AI:** `planSynthesisGuards.ts` — JSON shape, category/primitive allowlists, safety level non-downgrade, medication → prepare only, urgent → escalate only, one-action text, banned patterns  
4. **Orchestrator output guard:** existing medical boundary patterns

---

## Cost Controls

- **No AI** on urgent safety  
- **No AI** on simple today refresh / single obvious candidate (deterministic v3 path)  
- **No AI** when orchestrator policy blocks (missing key, budget, cache)  
- **Max 1 synthesis call per request** (orchestrator request limit)  
- **Counts toward session AI budget** (same limits as v2)  
- **Cache** by compressed context + source + v3 version key  
- **max_tokens = 350**, **temperature = 0.2** for synthesis

---

## Valid Synthesized Action Examples

**Stress + blocked action**

- Title: Make the reset smaller  
- Action: Write one sentence about what feels hardest, then choose only the easiest 2-minute next step.  
- Category: `reduce_friction`  
- Primitive: `choose 2-minute version`

**Headache, no red flags**

- Title: Track what changed  
- Action: Write when the headache started, intensity, possible triggers, and anything unusual since it began.  
- Category: `track`  
- Primitive: `record timing`

**Medication question**

- Title: Prepare a medication question  
- Action: Write the medication name, what you noticed, and one question to ask a clinician or pharmacist.  
- Category: `prepare`  
- Primitive: `prepare medication note without advice`

---

## Rejected Unsafe Example

**Input:** “Start taking painkillers and rest for two days.”  
**Reason rejected:** Medication/treatment instruction → guard failure → v2/deterministic fallback.

---

## Safety Test Cases (Expected)

| Case | Expected |
|------|----------|
| Chest pain / trouble breathing | No AI synthesis; escalate/safety only |
| Medication concern | Prepare clinician/pharmacist question only |
| Vague concern | AI may synthesize clarify/track; no diagnosis |
| Stress + blocked action | AI may synthesize reduce-friction action |
| Follow-up worse | Safety check first; track/prepare only if no red flag |
| Missing API key | v2 / deterministic fallback |
| Unsafe AI output | Rejected by synthesis guard; fallback used |

---

## Files

| File | Role |
|------|------|
| `planEngineV3.ts` | Main v3 flow |
| `planActionSynthesis.ts` | Orchestrator-backed synthesis |
| `planActionBoundaries.ts` | Categories, primitives, disallow list |
| `planSynthesisPrompt.ts` | Guarded synthesis prompt |
| `planSynthesisGuards.ts` | Post-AI validation |
| `planTypes.ts` | Synthesis types |
| `nextActionAdapter.ts` | v3 → v2 → safe fallback |
