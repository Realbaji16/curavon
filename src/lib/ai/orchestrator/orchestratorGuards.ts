import { detectUrgentConcern } from '../../../utils/healthSafety';
import { getOrchestratorState } from './orchestratorState';
import type { AIRequest, AIStage } from './orchestratorTypes';

export const MAX_AI_CALLS_PER_SESSION = 2;
export const MAX_AI_CALLS_PER_REQUEST = 1;
export const MAX_CONTEXT_SIZE = 'compressed_only' as const;

const BLOCKED_PATTERNS = [
  /\byou have\b/i,
  /\bdefinitely\b/i,
  /\bdiagnosis\b/i,
  /\btreatment plan\b/i,
  /\bstart medication\b/i,
  /\bstop medication\b/i,
  /\bincrease dose\b/i,
  /\bdecrease dose\b/i,
  /\bno need to worry\b/i,
];

export function createRequestCacheKey(request: AIRequest, stage: AIStage): string {
  const context = JSON.stringify(request.contextSnapshot ?? {});
  return `${stage}:${request.source}:${request.safetyLevel}:${request.userInput.slice(0, 240)}:${context.slice(0, 500)}`;
}

export function shouldBlockBySafety(request: AIRequest): { blocked: boolean; reason?: string } {
  if (request.safetyLevel === 'urgent') {
    return { blocked: true, reason: 'urgent_safety_level' };
  }
  const urgent = detectUrgentConcern(request.userInput);
  if (urgent.hasUrgent) {
    return { blocked: true, reason: 'urgent_signal_detected' };
  }
  return { blocked: false };
}

export function exceededSessionLimit() {
  return getOrchestratorState().sessionAIUsageCount >= MAX_AI_CALLS_PER_SESSION;
}

export function isDuplicateBlockedRequest(cacheKey: string): boolean {
  return getOrchestratorState().blockedRequests.includes(cacheKey);
}

export function isRuleBasedEnough(stage: AIStage, request: AIRequest): boolean {
  const trimmed = request.userInput.trim();
  if (!trimmed) return true;
  if (stage === 'followup_analysis') return true;
  if (stage === 'intake') {
    return trimmed.length < 40;
  }
  if (stage === 'plan_reasoning') {
    const candidateCount = Number(request.contextSnapshot?.candidateCount ?? 0);
    return candidateCount <= 1;
  }
  if (stage === 'plan_synthesis') {
    return false;
  }
  if (stage === 'summary_generation') {
    const concernCount = Number(request.contextSnapshot?.mainConcernCount ?? 0);
    return concernCount <= 1;
  }
  return false;
}

export function validateOrchestratorOutput(output: Record<string, unknown>): boolean {
  const text = JSON.stringify(output).slice(0, 4000);
  return !BLOCKED_PATTERNS.some((pattern) => pattern.test(text));
}
