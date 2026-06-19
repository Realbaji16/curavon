import { detectUrgentConcern } from '../../utils/healthSafety';
import { createCacheKey, getCache, setCache } from './aiCache';
import { runAIKernelClient } from './aiClient';
import { containsMedicalViolation, enforceMaxQuestions, validateAIOutput } from './aiGuards';
import type { AIKernelRequest, AIKernelResponse } from './aiTypes';
import { warnIfKernelCalledWithoutGovernance } from './governance/aiGovernanceGuards';

export const MAX_AI_CALLS_PER_SESSION = 2;
let aiCallsThisSession = 0;

function fallbackResponse(input: string): AIKernelResponse {
  return {
    refinedConcern: input,
    missingQuestions: [],
    severityGuess: 'unknown',
    tags: [],
    fallbackUsed: true,
  };
}

function shouldUseAI(task: AIKernelRequest['task']): boolean {
  return (
    task === 'intake' ||
    task === 'plan_explain' ||
    task === 'summary' ||
    task === 'next_action_reasoning' ||
    task === 'next_action_synthesis' ||
    task === 'doctor_summary'
  );
}

export async function runAIKernel(request: AIKernelRequest): Promise<AIKernelResponse> {
  warnIfKernelCalledWithoutGovernance({
    requestId: request.requestId,
    policyDecisionId: request.policyDecisionId,
  });
  const cacheKey = createCacheKey(request.task, request.input, request.context);
  const cached = getCache(cacheKey);
  if (cached) {
    console.info('[Curavon AI Kernel] enabled: true fallback: false cache: hit');
    return cached;
  }

  if (!shouldUseAI(request.task)) {
    const fallback = fallbackResponse(request.input);
    setCache(cacheKey, fallback);
    console.info('[Curavon AI Kernel] enabled: false fallback: true reason: task_not_supported');
    return fallback;
  }

  if (aiCallsThisSession >= MAX_AI_CALLS_PER_SESSION) {
    const fallback = fallbackResponse(request.input);
    setCache(cacheKey, fallback);
    console.info('[Curavon AI Kernel] enabled: false fallback: true reason: call_limit');
    return fallback;
  }

  const urgent = detectUrgentConcern(request.input);
  if (urgent.hasUrgent) {
    const fallback = fallbackResponse(request.input);
    setCache(cacheKey, fallback);
    console.info('[Curavon AI Kernel] enabled: false fallback: true reason: safety_bypass');
    return fallback;
  }

  if (request.task === 'intake' && containsMedicalViolation(request.input)) {
    const fallback = fallbackResponse(request.input);
    setCache(cacheKey, fallback);
    console.info('[Curavon AI Kernel] enabled: false fallback: true reason: input_boundary');
    return fallback;
  }

  aiCallsThisSession += 1;
  try {
    const result = await runAIKernelClient(request);
    if (request.task === 'next_action_reasoning' || request.task === 'next_action_synthesis') {
      setCache(cacheKey, result);
      console.info('[Curavon AI Kernel] enabled: true fallback: false cache: miss');
      return result;
    }
    const bounded = enforceMaxQuestions(result);
    const valid = validateAIOutput(bounded);
    if (!valid) {
      const fallback = fallbackResponse(request.input);
      setCache(cacheKey, fallback);
      console.info('[Curavon AI Kernel] enabled: true fallback: true reason: output_validation');
      return fallback;
    }
    setCache(cacheKey, bounded);
    console.info('[Curavon AI Kernel] enabled: true fallback: false cache: miss');
    return bounded;
  } catch {
    const fallback = fallbackResponse(request.input);
    setCache(cacheKey, fallback);
    console.info('[Curavon AI Kernel] enabled: true fallback: true reason: exception');
    return fallback;
  }
}
