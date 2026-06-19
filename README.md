# Curavon

Curavon is a **local-first AI health companion prototype** focused on one core question:

> **What is the safest, simplest, most useful next health action I should take right now?**

Curavon helps users:

- share a health concern or goal
- answer guided questions
- detect safety / red-flag situations
- receive **one** next best action
- follow up on whether the action helped
- organize doctor-ready notes

Curavon is **not** a doctor, diagnosis engine, emergency service, or treatment app.

---

## Product thesis

Curavon is **not** a general chatbot.  
Curavon is a structured **Next Best Health Action** system.

Core loop:

```
User concern / check-in / guide result
  → safety check
  → memory snapshot
  → next-action reasoning
  → one safe action
  → follow-up
  → doctor summary / memory update
```

Every feature should reinforce this loop.

---

## What Curavon does

- Guided intake in **Ask** and **Guides**
- Rule-based urgent / red-flag detection before AI
- One primary next action on **Today**
- Follow-up scheduling and outcome handling
- Doctor-ready summary drafting from user-entered notes
- Local export, backup, restore, and delete controls
- Governed AI for next-action synthesis and summaries (when configured)

---

## What Curavon does not do

Curavon does **not**:

- diagnose conditions
- prescribe medications
- give medication start / stop / dose advice
- replace clinicians or therapists
- handle emergencies as a service
- interpret labs as medical conclusions
- guarantee outcomes
- provide production clinical validation

If symptoms may be severe, sudden, or unsafe, users should seek local emergency services or a clinician.

---

## Current stage

**Production-prep local-first prototype / controlled testing build**

Current status:

- React + TypeScript + Vite frontend
- Local demo auth (`CuravonAuthProvider` + `localStorage`)
- `localStorage`-based data layer
- Guarded AI architecture with deterministic fallbacks
- **No production backend yet**
- **No public clinical release yet**
- Launch and testing documentation in `docs/`

This repository is for controlled development and testing—not a clinically validated product.

---

## Tech stack

From `package.json`:

| Layer | Technology |
|-------|------------|
| UI | React 19, TypeScript |
| Build | Vite 8 |
| Motion | Framer Motion |
| Icons | Lucide React |
| Data (current) | Browser `localStorage` |
| Tests | Vitest + jsdom |
| Lint | ESLint + TypeScript ESLint + React Hooks |

**Not active in this repo:** Supabase, production backend, cloud auth, or clinical data hosting.

Backend placeholders exist under `src/lib/sync/backends/` for future work only.

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

Other useful commands:

```bash
npm run build    # production build
npm run test     # Vitest smoke tests
npm run lint     # ESLint
npm run preview  # preview production build locally
```

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `VITE_OPENAI_API_KEY` | Optional OpenAI-compatible API key for governed AI features |

Create a local `.env` file (never commit it):

```env
VITE_OPENAI_API_KEY=your_key_here
```

Rules:

- **Never commit API keys** to git
- If the key is missing, AI is disabled and **deterministic fallbacks** still work
- AI is **not required** for local demo usage
- No Supabase or backend env vars are required today

Configuration is read in `src/lib/ai/aiConfig.ts`.

---

## Available scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Serve `dist/` locally |
| `npm run test` | Run Vitest once |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Vitest with coverage |
| `npm run lint` | ESLint |

---

## Architecture map

```
src/
  screens/          # Full-page UI surfaces (Today, Ask, Guides, Profile, Auth)
  components/       # Shared UI, overlays, tab bar, check-in
  context/          # App, health, doctor-summary providers + hooks
  hooks/            # Shared React hooks
  lib/
    ai/             # Governed AI kernel, orchestrator, guards, policy
    auth/           # Local demo auth adapter
    data/           # Export, delete, backup, restore, storage keys
    followUp/       # Follow-up scheduling, evaluation, storage
    plan/           # Next-action generation (v2 + v3 synthesis)
    doctorSummary/  # Doctor summary AI + guards
    sync/           # Future sync contract (placeholders only)
  utils/            # Safety, storage helpers, snapshots, intake
  types/            # Shared TypeScript types
  __tests__/        # Vitest smoke tests
```

### How layers fit together

| Area | Role |
|------|------|
| `screens/` | User-facing routes and flows |
| `context/` | Session, health profile, next action, doctor summary state |
| `lib/plan/` | Next-action generation via `nextActionAdapter` |
| `lib/ai/` | Governed AI orchestration, budgets, observability |
| `lib/followUp/` | Follow-up lifecycle after an action |
| `lib/data/` | Local-first export / delete / backup |
| `utils/healthSafety.ts` | Rule-based red-flag detection |

Provider order in `App.tsx`:

```
CuravonAuthProvider → AppProvider → HealthProvider → DoctorSummaryProvider → AppAuthGate
```

Heavy routes (Ask, Guides, Settings) and Doctor Summary overlay are lazy-loaded for a lighter initial bundle.

---

## AI system overview

AI is **governed and limited**. UI code must not call model APIs directly.

Expected path:

```
Feature request
  → AI Orchestrator
  → AI Governance (policy, budget, observability)
  → AI Kernel
  → Guard validation (medical boundary, output validator)
  → Feature result
```

Rules:

- AI **cannot bypass safety**
- AI **cannot diagnose**
- AI **cannot prescribe**
- AI **does not run** on urgent red-flag paths
- AI uses **compressed context** only
- AI has **cost / session limits** (see `lib/ai/governance/`)
- **Fallback works without an API key**

### Plan Engine v3

When configured, AI may synthesize a **custom safe next action** only inside allowed action boundaries (`planEngineV3`, `planSynthesisGuards`). Fallback chain:

**v3 synthesis → Plan Engine v2 candidates → deterministic safe action**

See `docs/audits/curavon-plan-engine-v3-synthesis.md`.

---

## Safety system overview

Safety is **rule-based and runs before AI**.

Primary module: `src/utils/healthSafety.ts`

Red-flag patterns include (text matching, not clinical diagnosis):

- chest pain
- trouble breathing / can't breathe
- fainting
- severe sudden pain
- worst headache
- stroke-like signs (e.g. face drooping, sudden weakness)
- heavy bleeding
- self-harm / suicidal language

Rules:

- Urgent safety **blocks** normal self-care flow continuation
- Urgent safety **blocks** AI reasoning for next actions
- Medication concerns stay **clinician / pharmacist-prep** language only
- Safety copy stays **calm and non-diagnostic**

Urgent paths in Ask, Guides, and Today check-in are **terminal**—they show safety guidance, not a normal next-action loop.

---

## Data storage overview

**Current mode: local-first**

Health and app data for this version live in the browser **`localStorage`** on the user's device.

Profile / Settings includes:

- **Export my data** — JSON export
- **Download local backup** — portable backup file
- **Restore from backup** — when a valid backup is selected
- **Delete all health data** — clears health-related keys
- **Sign out** — keeps health data on device (local demo)
- **Delete local account** — auth shell removal; optional health data deletion

Important:

- Local demo auth is **not** production auth
- Passwords in local demo mode are **not** production-secure
- **No** claim of encryption or secure cloud storage in this build
- Production backend, schema, and RLS are **required before public launch**

Storage keys are centralized in `src/lib/data/storageKeys.ts`. New keys must update export and delete scopes.

---

## Testing

```bash
npm run test
```

Automated smoke tests (`src/__tests__/`):

| File | Focus |
|------|--------|
| `healthSafety.test.ts` | Urgent / red-flag detection |
| `planGuards.test.ts` | Plan guardrails |
| `nextActionAdapter.test.ts` | Next-action fallback path |
| `followUpEngine.test.ts` | Follow-up outcomes and scheduling |
| `dataScope.test.ts` | Export / delete key coverage |

Manual testing scripts live in `docs/testing/` and `docs/audits/manual-test-script-v1.md`.

---

## Local demo / test data

**In-app:** Profile provides data management (export, backup, restore, delete, clear Ask history)—not a one-click “seed demo” button today.

**Facilitator scenarios:** Fictional test stories are documented in `docs/testing/demo-data-plan-v1.md`.

Rules for testers:

- Use **fictional** scenarios only
- Do **not** enter real urgent symptoms during testing
- **Reset** between sessions on shared devices (`Delete all health data`)
- Follow `docs/testing/tester-safety-boundaries-v1.md`

---

## Contributor rules

Before adding any feature, ask:

1. Does it support the **Next Best Health Action** loop?
2. Does **safety run before AI**?
3. Does it avoid diagnosis / treatment claims?
4. Does it preserve **export / delete** behavior?
5. Does it avoid **unnecessary AI calls**?
6. Does it keep **one primary action** on Today?

### Hard rules

- **No direct AI calls from UI** — use `lib/ai` orchestration
- **No raw prompts stored** in user-visible persistence
- **No raw model responses stored** as health records
- **No medication advice** (start / stop / dose)
- **No diagnosis claims**
- **No normal self-care flow** after an urgent red flag
- **No new storage key** without updating `storageKeys`, export, and delete
- **No new action engine path** without routing through `nextActionAdapter`

See [CONTRIBUTING.md](./CONTRIBUTING.md) for PR expectations and checklists.

---

## Known limitations

- Local-first only; data stays on the device
- No production backend or real auth yet
- Local demo passwords are not production-secure
- Legal / privacy docs are placeholders (`docs/launch/safety-and-privacy-placeholder-v1.md`)
- No clinical validation or FDA / regulatory clearance
- Urgent detection uses **text matching** and may miss or over-match edge cases
- Bundle size has been improved (route splitting) but CSS and entry chunk may still grow
- Real deployment pipeline not finalized
- Sync / Supabase adapters are placeholders only

---

## Production roadmap

High-level sequence (not a commitment timeline):

1. Consolidate remaining legacy code paths
2. Expand automated test coverage
3. Production auth and backend
4. Database schema + row-level security (RLS)
5. Legal and privacy review
6. Clinical / safety review
7. Deployment pipeline and monitoring
8. Closed beta testing

---

## Important docs

| Document | Purpose |
|----------|---------|
| [curavon-build-kernel-v2.md](./curavon-build-kernel-v2.md) | Product thesis, architecture control, build order |
| [docs/audits/](./docs/audits/) | System, safety, AI, and hardening audits |
| [docs/launch/](./docs/launch/) | Launch readiness, demo flow, known limitations |
| [docs/testing/](./docs/testing/) | Tester instructions, safety boundaries, demo scenarios |
| [docs/audits/curavon-plan-engine-v3-synthesis.md](./docs/audits/curavon-plan-engine-v3-synthesis.md) | Plan Engine v3 |
| [docs/audits/test-coverage-step-7.md](./docs/audits/test-coverage-step-7.md) | Vitest setup |
| [docs/audits/lint-cleanup-step-8.md](./docs/audits/lint-cleanup-step-8.md) | Lint / React hygiene |
| [docs/audits/bundle-splitting-step-9.md](./docs/audits/bundle-splitting-step-9.md) | Route code splitting |

---

## License / disclaimer

Curavon is experimental software for development and controlled testing. It does not provide medical advice, diagnosis, or treatment. Always seek qualified clinical care for health concerns.
