# Curavon AI Audit v1

## Expected Architecture

`UI / Feature -> AI Orchestrator -> AI Governance -> AI Kernel -> AI Guards -> Feature result`

## Current Architecture Status

- **Primary path:** implemented and used by Ask, Plan Engine, and Doctor Summary.
- **Legacy path present:** `src/lib/ai/orchestratorAI.ts` calls `runGuardedAI` directly (not referenced by active features).

## Component Audit

### AI Kernel
- **Status:** complete
- **Files:** `src/lib/ai/aiKernel.ts`, `aiClient.ts`, `aiCache.ts`, `aiGuards.ts`
- **What works:** cache-first, call cap, urgent bypass, validation, fallback.
- **Risks:** session limit exists both here and governance; in-memory cache resets on reload.
- **Priority:** P2

### AI Client
- **Status:** complete
- **Files:** `src/lib/ai/aiClient.ts`
- **What works:** API key gate, network failure fallback.
- **Risks:** no provider abstraction yet (acceptable for v1).
- **Priority:** P2

### AI Cache
- **Status:** mostly complete
- **Files:** `src/lib/ai/aiCache.ts`, `src/lib/ai/orchestrator/orchestratorState.ts`
- **What works:** deterministic request hashing + in-memory caching.
- **Risks:** duplicated cache layers (kernel map + orchestrator runtime map).
- **Priority:** P1

### AI Guards
- **Status:** complete
- **Files:** `src/lib/ai/aiGuards.ts`, `src/lib/ai/orchestrator/orchestratorGuards.ts`, `src/lib/doctorSummary/doctorSummaryGuards.ts`
- **What works:** medical-language blocking, output shape checks, orchestrator output blocklist.
- **Risks:** policy logic split across multiple guard modules.
- **Priority:** P1

### AI Orchestrator
- **Status:** mostly complete
- **Files:** `src/lib/ai/orchestrator/aiOrchestrator.ts`
- **What works:** safety block, cache check, policy and budget checks, trace logging, fallback behavior.
- **Risks:** runtime counters separate from governance state counters.
- **Priority:** P1

### AI Governance
- **Status:** mostly complete
- **Files:** `src/lib/ai/governance/aiPolicy.ts`, `aiBudget.ts`, `aiPolicyState.ts`, `aiGovernanceGuards.ts`
- **What works:** allowlist tasks, source authorization, compressed context requirement, consent/API key checks.
- **Risks:** duplicated limit checks with orchestrator guards.
- **Priority:** P1

### AI Observability
- **Status:** mostly complete
- **Files:** `src/lib/ai/governance/aiDecisionTrace.ts`, `aiObservability.ts`, `aiObservabilityStorage.ts`, `src/lib/ai/orchestrator/orchestratorLogger.ts`
- **What works:** traces, summary aggregates, orchestrator logs.
- **Risks:** multiple logging streams (`aiUsageLog`, decision traces, orchestrator logs) create overlap.
- **Priority:** P2

### Plan Engine AI reasoning
- **Status:** mostly complete
- **Files:** `src/lib/plan/planEngineV2.ts`, `planCandidates.ts`, `planGuards.ts`
- **What works:** candidate-limited prompting, safety override, strict fallback.
- **Risks:** legacy action engines still coexist outside this path.
- **Priority:** P0

### Doctor Summary AI
- **Status:** mostly complete
- **Files:** `src/lib/doctorSummary/doctorSummaryAI.ts`, `doctorSummaryGuards.ts`, `src/context/DoctorSummaryContext.tsx`
- **What works:** explicit-action trigger, orchestrator path, safe fallback.
- **Risks:** no issue found for render-time calls.
- **Priority:** P1

### Memory compression AI
- **Status:** legacy/dead
- **Files:** `src/lib/ai/orchestratorAI.ts` (`maybeCompressSnapshot`)
- **What works:** legacy helper exists only.
- **Risks:** bypasses orchestrator/governance if accidentally wired.
- **Priority:** P1

### Follow-up AI usage
- **Status:** complete (minimal AI usage)
- **Files:** `src/lib/followUp/followUpEngine.ts`, `followUpGuards.ts`
- **What works:** button outcomes are rule-based.
- **Risks:** none critical.
- **Priority:** P2

## Required Checks

1. **Direct AI calls from UI components:** none found (pass).  
2. **AI calls outside orchestrator:** legacy `orchestratorAI.ts` only (not active).  
3. **AI without governance policy:** active path passes governance.  
4. **AI without safety pre-check:** active path has safety guards before kernel call.  
5. **Cache-first behavior:** present in orchestrator and kernel.  
6. **AI calls on render:** none observed; calls happen on explicit interactions.  
7. **AI during auth/session/export/delete:** not found.  
8. **Missing API key fallback:** implemented in client/orchestrator/kernel.  
9. **Raw user text stored in logs:** partial risk (`aiUsageLog` exists; traces are metadata-focused).  
10. **Raw prompts stored in logs:** not observed in AI observability logs.  
11. **Full AI responses stored in logs:** not observed in governance traces/logger.  
12. **Missing token/call limits:** limits present (kernel + governance + orchestrator checks).  
13. **Missing fallback behavior:** fallback paths exist across modules.

## AI Audit Summary

- Architecture is **mostly compliant** with intended orchestration design.
- Key hardening target is **removing/isolating legacy direct AI helper path** and reducing duplicated control counters/log streams.
