# Contributing to Curavon

Thank you for helping make Curavon easier to understand, safer to build on, and harder to misuse.

This is a **health-adjacent prototype**. Small mistakes can have outsized safety impact. Read [README.md](./README.md) and [curavon-build-kernel-v2.md](./curavon-build-kernel-v2.md) before your first PR.

---

## Before you start

1. `npm install`
2. `npm run dev` — confirm the app loads
3. Skim `src/utils/healthSafety.ts` and `src/lib/plan/nextActionAdapter.ts`

---

## Branch and PR expectations

- Use a descriptive branch name (e.g. `fix/follow-up-deps`, `docs/readme-update`)
- Keep PRs **focused**—one concern per PR when possible
- Describe **what** changed and **why**
- Note any safety or data-lifecycle impact in the PR body
- Do not commit `.env`, API keys, or real user health data

### Before opening a PR, run

```bash
npm run lint
npm run test
npm run build
```

All three should pass unless your PR explicitly documents why not (rare).

---

## Safety checklist

- [ ] Urgent / red-flag input still routes to **terminal safety**, not normal next-action flow
- [ ] AI is **not invoked** on urgent paths
- [ ] No new diagnosis, prescription, or medication-dose language
- [ ] Safety copy remains calm and non-diagnostic
- [ ] `detectUrgentConcern` / `healthSafety` behavior unchanged unless intentionally updated with tests
- [ ] Guides and Ask urgent flows remain terminal

---

## AI checklist

- [ ] No `fetch` / direct OpenAI calls from `screens/` or `components/`
- [ ] New AI usage goes through `lib/ai/orchestrator` and governance guards
- [ ] Missing `NEXT_PUBLIC_OPENAI_API_KEY` still produces a safe fallback
- [ ] Context passed to models is **compressed**, not full raw health dumps
- [ ] No storage of raw prompts or raw model responses in `localStorage`
- [ ] Plan changes route through `nextActionAdapter` / plan guards

---

## Data checklist

- [ ] New persistence uses keys from `src/lib/data/storageKeys.ts`
- [ ] Export scope updated if new health-related keys are added
- [ ] Delete scope updated (`DELETE_HEALTH_DATA_KEYS` / related helpers)
- [ ] Sign-out vs delete-health-data behavior preserved
- [ ] No silent data loss on navigation or context refactors

---

## Product rules checklist

- [ ] Supports the **one next best action** loop
- [ ] Does not add a second competing “primary action” on Today
- [ ] Does not turn Curavon into a general chatbot
- [ ] Does not claim clinical readiness in UI or docs
- [ ] No backend / Supabase wiring unless explicitly scoped and approved

---

## Code style

- Match existing patterns in the file you edit
- Prefer minimal, behavior-preserving diffs
- Avoid global eslint disables; document scoped disables with a reason
- Split hooks from providers when react-refresh requires it (see `src/context/useApp.ts`)

---

## Questions

When unsure, check:

- `docs/audits/curavon-safety-audit-v1.md`
- `docs/audits/curavon-ai-audit-v1.md`
- `docs/testing/tester-safety-boundaries-v1.md`

If a change affects medical boundaries, safety copy, or data deletion—call it out explicitly in the PR.
