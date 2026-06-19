import { runAIOrchestrator } from '../ai/orchestrator/aiOrchestrator';
import { APP_STORAGE_KEYS } from '../data/storageKeys';
import { safeRead, safeWrite } from '../../utils/healthStorage';
import {
  DISALLOWED_ACTION_LABELS,
  allowedCategoriesForContext,
  allowedPrimitivesForContext,
} from './planActionBoundaries';
import { buildPlanSynthesisPrompt, PLAN_SYNTHESIS_SYSTEM_PROMPT } from './planSynthesisPrompt';
import { parseSynthesisPayload, validatePlanSynthesisResult } from './planSynthesisGuards';
import type { PlanSynthesisInput, PlanSynthesisResult } from './planTypes';

const SYNTHESIS_CACHE = new Map<string, PlanSynthesisResult>();
const SYNTHESIS_VERSION = 'v3';

type SynthesisUsageLog = {
  task: 'next_action_synthesis';
  timestamp: string;
  cacheHit: boolean;
  fallbackUsed: boolean;
  aiUsed: boolean;
  aiSynthesized: boolean;
  boundaryValidated: boolean;
  blockReason?: string;
};

function logSynthesisUsage(entry: SynthesisUsageLog) {
  const logs = safeRead<SynthesisUsageLog[]>(APP_STORAGE_KEYS.aiUsageLog, []);
  safeWrite(APP_STORAGE_KEYS.aiUsageLog, [entry, ...logs].slice(0, 250));
}

function makeSynthesisCacheKey(input: PlanSynthesisInput): string {
  const text = JSON.stringify({
    v: SYNTHESIS_VERSION,
    source: input.source,
    safety: input.safetyLevel,
    concern: input.currentConcernSummary.slice(0, 120),
    snapshot: input.compressedSnapshot.slice(0, 200),
    signals: input.sourceSignals,
    blockers: input.recentBlockers,
    candidateIds: input.baselineCandidates.map((candidate) => candidate.id),
    medication: input.medicationConcern,
  });
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `syn-${Math.abs(hash)}`;
}

export async function synthesizeNextBestAction(
  input: PlanSynthesisInput,
): Promise<PlanSynthesisResult> {
  if (input.safetyLevel === 'urgent') {
    const blocked: PlanSynthesisResult = {
      selectedMode: 'synthesize_custom_action',
      reasoning: 'Urgent safety blocks AI synthesis.',
      confidence: 'high',
      safetyNotes: 'Use safety-aware escalation only.',
      valid: false,
      validationErrors: ['urgent_safety'],
      fallbackUsed: true,
      aiUsed: false,
      boundaryValidated: false,
      aiSynthesized: false,
      blockReason: 'urgent_safety',
    };
    logSynthesisUsage({
      task: 'next_action_synthesis',
      timestamp: new Date().toISOString(),
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: false,
      aiSynthesized: false,
      boundaryValidated: false,
      blockReason: 'urgent_safety',
    });
    return blocked;
  }

  const cacheKey = makeSynthesisCacheKey(input);
  const cached = SYNTHESIS_CACHE.get(cacheKey);
  if (cached) {
    logSynthesisUsage({
      task: 'next_action_synthesis',
      timestamp: new Date().toISOString(),
      cacheHit: true,
      fallbackUsed: cached.fallbackUsed,
      aiUsed: cached.aiUsed,
      aiSynthesized: cached.aiSynthesized,
      boundaryValidated: cached.boundaryValidated,
      blockReason: cached.blockReason,
    });
    return cached;
  }

  const prompt = buildPlanSynthesisPrompt({
    ...input,
    disallowedActions: input.disallowedActions.length ? input.disallowedActions : DISALLOWED_ACTION_LABELS,
    allowedCategories: allowedCategoriesForContext({
      safetyLevel: input.safetyLevel,
      medicationConcern: input.medicationConcern,
    }),
    allowedPrimitives: allowedPrimitivesForContext({
      safetyLevel: input.safetyLevel,
      medicationConcern: input.medicationConcern,
    }),
  });

  const orchestrated = await runAIOrchestrator({
    userInput: prompt,
    contextSnapshot: {
      candidateCount: input.baselineCandidates.length,
      compressedContextOnly: true,
      consentCompleted: true,
      kernelContext: {
        systemPrompt: PLAN_SYNTHESIS_SYSTEM_PROMPT,
        candidateIds: input.baselineCandidates.map((candidate) => candidate.id),
        synthesisVersion: SYNTHESIS_VERSION,
      },
    },
    safetyLevel: input.safetyLevel,
    stageHint: 'plan_synthesis',
    source: input.source,
  });

  const aiUsed = orchestrated.moduleUsed === 'ai_kernel' && !orchestrated.fallbackUsed;
  const parsed = parseSynthesisPayload(orchestrated.result);
  const validated = validatePlanSynthesisResult({
    payload: parsed,
    baselineCandidates: input.baselineCandidates,
    inputSafetyLevel: input.safetyLevel,
    medicationConcern: input.medicationConcern,
    allowedCategories: allowedCategoriesForContext({
      safetyLevel: input.safetyLevel,
      medicationConcern: input.medicationConcern,
    }),
    allowedPrimitives: allowedPrimitivesForContext({
      safetyLevel: input.safetyLevel,
      medicationConcern: input.medicationConcern,
    }),
    sourceSignals: input.sourceSignals,
    fallbackUsed: orchestrated.fallbackUsed,
    aiUsed,
  });

  const result: PlanSynthesisResult = validated.valid
    ? validated
    : { ...validated, fallbackUsed: true };

  SYNTHESIS_CACHE.set(cacheKey, result);
  logSynthesisUsage({
    task: 'next_action_synthesis',
    timestamp: new Date().toISOString(),
    cacheHit: false,
    fallbackUsed: result.fallbackUsed,
    aiUsed: result.aiUsed,
    aiSynthesized: result.aiSynthesized,
    boundaryValidated: result.boundaryValidated,
    blockReason: result.blockReason,
  });
  return result;
}
