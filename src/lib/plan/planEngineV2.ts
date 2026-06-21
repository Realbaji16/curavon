/**
 * @deprecated Legacy plan engine — do not import from runtime app paths.
 * Retained for migration reference and compatibility tests only.
 * Canonical engine: planEngineV3.ts via nextActionAdapter.ts
 * @see docs/decisions/0003-plan-engine-v3-canonical.md
 */
import { detectUrgentConcern } from '../../utils/healthSafety';
import { buildSafePlanCandidates } from './planCandidates';
import { buildPlanReasoningPrompt, PLAN_REASONING_SYSTEM_PROMPT } from './planReasoningPrompt';
import { runAIOrchestrator } from '../ai/orchestrator/aiOrchestrator';
import { recordSafeAiUsageLog } from '../data/operationalDataService';
import type { AIKernelResponse } from '../ai/aiTypes';
import type {
  PlanAction,
  PlanCandidate,
  PlanEngineInput,
  PlanEngineResult,
  PlanReasoningResult,
  PlanSafetyLevel,
} from './planTypes';
import {
  fallbackRankCandidate,
  isUrgentFromContext,
  parseReasoningFromKernelResponse,
  validateReasoningResult,
} from './planGuards';

const PLAN_ENGINE_CACHE = new Map<string, PlanEngineResult>();

type AIUsageLogEntry = {
  task: string;
  timestamp: string;
  cacheHit: boolean;
  fallbackUsed: boolean;
  candidateCount: number;
  aiUsed: boolean;
};

function logAIUsage(entry: AIUsageLogEntry) {
  recordSafeAiUsageLog({
    taskName: entry.task,
    status: entry.aiUsed ? 'completed' : 'fallback',
    occurredAt: entry.timestamp,
    payload: {
      cacheHit: entry.cacheHit,
      fallbackUsed: entry.fallbackUsed,
      aiUsed: entry.aiUsed,
      candidateCount: entry.candidateCount,
      moduleVersion: 'plan-engine-v2',
    },
  });
}

function makeInputKey(input: PlanEngineInput): string {
  const text = JSON.stringify({
    concern: input.currentConcern ?? '',
    risk: input.snapshot?.riskSignals ?? null,
    state: input.snapshot?.currentState ?? null,
    blocked: input.snapshot?.activeConcerns.blockedActions ?? 0,
    unresolved: input.snapshot?.activeConcerns.unresolvedAskConcerns.length ?? 0,
    actionStatus: input.nextActionState?.status ?? 'none',
    redFlags: input.redFlagLogs?.length ?? 0,
  });
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `plan-${Math.abs(hash)}`;
}

function safetyOverrideAction(safetyLevel: PlanSafetyLevel): PlanAction {
  return {
    id: 'plan-safety-override',
    title: 'Review urgent-support notes',
    actionText: 'Open your doctor-ready summary and make sure the urgent concern is clearly written.',
    reason:
      'You recently saw a safety message. Severe, sudden, or unsafe symptoms should be handled by local emergency services or a clinician now.',
    category: 'escalate',
    safetyLevel,
    relatedGuide: 'Doctor Visit Prep',
    followUpPrompt: 'Do you need help preparing a clinician summary right now?',
    watchFor: 'Severe, sudden, or unsafe symptom changes.',
    sourceSignals: ['recent_red_flag'],
    selectedBy: 'rules',
    aiReasoned: false,
    fallbackUsed: false,
  };
}

function toPlanAction(
  candidate: PlanCandidate,
  reasoning: PlanReasoningResult,
  sourceSignals: string[],
): PlanAction {
  return {
    id: candidate.id,
    title: candidate.title,
    actionText: candidate.actionText,
    reason: reasoning.reasoning || candidate.whyCandidateFits,
    category: candidate.category,
    safetyLevel: candidate.safetyLevel,
    relatedGuide: candidate.relatedGuide,
    followUpPrompt: reasoning.followUpPrompt || 'How did this step go: done, blocked, or adjust?',
    watchFor: reasoning.watchFor || 'Any noticeable change in how you feel.',
    sourceSignals,
    selectedBy: reasoning.aiUsed ? 'ai' : 'rules',
    aiReasoned: reasoning.aiUsed,
    fallbackUsed: reasoning.fallbackUsed,
  };
}

function deriveSourceSignals(input: PlanEngineInput): string[] {
  const signals: string[] = [...(input.sourceSignals ?? [])];
  if ((input.snapshot?.activeConcerns.repeatingSymptoms.length ?? 0) > 0) signals.push('repeating_symptoms');
  if (input.snapshot?.riskSignals.increasingSymptomFrequency) signals.push('increasing_symptom_frequency');
  if ((input.snapshot?.activeConcerns.blockedActions ?? 0) > 0) signals.push('action_blocked');
  if ((input.snapshot?.activeConcerns.unresolvedAskConcerns.length ?? 0) >= 2) {
    signals.push('repeated_unresolved_concern');
  }
  if (input.latestCheckIn?.stressLevel === 'Overwhelmed' || input.latestCheckIn?.stressLevel === 'Stressed') {
    signals.push('high_stress');
  }
  if (input.latestCheckIn?.sleepQuality === 'Poor' || input.latestCheckIn?.sleepQuality === 'Very poor') {
    signals.push('low_sleep');
  }
  if (input.latestCheckIn?.energyLevel === 'Low' || input.latestCheckIn?.energyLevel === 'Drained') {
    signals.push('low_energy');
  }
  return Array.from(new Set(signals));
}

function aiFallbackReasoning(candidate: PlanCandidate): PlanReasoningResult {
  return {
    selectedCandidateId: candidate.id,
    reasoning: candidate.whyCandidateFits,
    whyNotOthers: 'This is the lowest-risk option from available safe candidates.',
    followUpPrompt: 'How did this step go: done, blocked, or adjust?',
    watchFor: 'Any noticeable change in how you feel.',
    confidence: 'medium',
    fallbackUsed: true,
    aiUsed: false,
  };
}

function fromReasoningKernel(response: AIKernelResponse): PlanReasoningResult | null {
  return parseReasoningFromKernelResponse(response);
}

export async function generateNextBestPlanAction(input: PlanEngineInput): Promise<PlanEngineResult> {
  const cacheKey = makeInputKey(input);
  const cacheHit = PLAN_ENGINE_CACHE.get(cacheKey);
  if (cacheHit) {
    logAIUsage({
      task: 'next_action_reasoning',
      timestamp: new Date().toISOString(),
      cacheHit: true,
      fallbackUsed: cacheHit.reasoningResult.fallbackUsed,
      candidateCount: cacheHit.candidates.length,
      aiUsed: cacheHit.reasoningResult.aiUsed,
    });
    return cacheHit;
  }

  const concernText = input.currentConcern ?? input.intakeResult?.concern ?? '';
  const urgentBySafety = isUrgentFromContext(input);
  const urgentByText = detectUrgentConcern(concernText).hasUrgent;
  if (urgentBySafety || urgentByText) {
    const action = safetyOverrideAction(urgentByText ? 'urgent' : 'caution');
    const result: PlanEngineResult = {
      action,
      reasoningResult: {
        selectedCandidateId: action.id,
        reasoning: action.reason,
        whyNotOthers: 'Safety override suppresses normal self-care planning.',
        followUpPrompt: action.followUpPrompt,
        watchFor: action.watchFor,
        confidence: 'high',
        fallbackUsed: false,
        aiUsed: false,
      },
      candidates: [],
      safetyOverride: true,
    };
    PLAN_ENGINE_CACHE.set(cacheKey, result);
    logAIUsage({
      task: 'next_action_reasoning',
      timestamp: new Date().toISOString(),
      cacheHit: false,
      fallbackUsed: false,
      candidateCount: 0,
      aiUsed: false,
    });
    return result;
  }

  const sourceSignals = deriveSourceSignals(input);
  const candidates = buildSafePlanCandidates(input);

  if (candidates.length === 1) {
    const reasoning = aiFallbackReasoning(candidates[0]);
    const result: PlanEngineResult = {
      action: toPlanAction(candidates[0], reasoning, sourceSignals),
      reasoningResult: reasoning,
      candidates,
      safetyOverride: false,
    };
    PLAN_ENGINE_CACHE.set(cacheKey, result);
    logAIUsage({
      task: 'next_action_reasoning',
      timestamp: new Date().toISOString(),
      cacheHit: false,
      fallbackUsed: true,
      candidateCount: candidates.length,
      aiUsed: false,
    });
    return result;
  }

  const prompt = buildPlanReasoningPrompt({
    snapshotSummary: input.snapshot?.trendSummary ?? 'No snapshot summary available.',
    currentConcern: concernText,
    sourceSignals,
    safetyLevel: input.snapshot?.riskSignals.repeatedRedFlags ? 'caution' : 'normal',
    userConstraints: [
      input.nextActionState?.status === 'blocked' ? 'blocked action recently' : '',
      input.snapshot?.engagementSignals.missedCheckins ? 'missed check-ins recently' : '',
    ].filter(Boolean),
    candidates,
  });

  const orchestrated = await runAIOrchestrator({
    userInput: prompt,
    contextSnapshot: {
      candidateCount: candidates.length,
      kernelContext: {
        systemPrompt: PLAN_REASONING_SYSTEM_PROMPT,
        candidateIds: candidates.map((candidate) => candidate.id),
        candidateCount: candidates.length,
      },
    },
    safetyLevel: input.snapshot?.riskSignals.repeatedRedFlags ? 'caution' : 'normal',
    stageHint: input.guideHistory?.length ? 'guides' : 'plan_generation',
    source: input.guideHistory?.length ? 'guides' : input.intakeResult ? 'ask' : 'today',
  });
  const kernelResult = orchestrated.result as unknown as AIKernelResponse;

  const parsed = fromReasoningKernel(kernelResult);
  const validation = validateReasoningResult(parsed, candidates);
  let finalReasoning: PlanReasoningResult;
  let selected: PlanCandidate;

  if (!validation.valid || !parsed) {
    selected = fallbackRankCandidate(candidates, sourceSignals);
    finalReasoning = aiFallbackReasoning(selected);
  } else {
    selected = candidates.find((candidate) => candidate.id === parsed.selectedCandidateId) ?? fallbackRankCandidate(candidates, sourceSignals);
    finalReasoning = {
      ...parsed,
      fallbackUsed: Boolean(kernelResult.fallbackUsed),
      aiUsed: !kernelResult.fallbackUsed,
    };
  }

  const result: PlanEngineResult = {
    action: toPlanAction(selected, finalReasoning, sourceSignals),
    reasoningResult: finalReasoning,
    candidates,
    safetyOverride: false,
  };
  PLAN_ENGINE_CACHE.set(cacheKey, result);
  logAIUsage({
    task: 'next_action_reasoning',
    timestamp: new Date().toISOString(),
    cacheHit: false,
    fallbackUsed: finalReasoning.fallbackUsed,
    candidateCount: candidates.length,
    aiUsed: finalReasoning.aiUsed,
  });
  return result;
}

export function generateNextBestPlanActionSync(input: PlanEngineInput): PlanEngineResult {
  const concernText = input.currentConcern ?? input.intakeResult?.concern ?? '';
  const urgentBySafety = isUrgentFromContext(input);
  const urgentByText = detectUrgentConcern(concernText).hasUrgent;
  if (urgentBySafety || urgentByText) {
    const action = safetyOverrideAction(urgentByText ? 'urgent' : 'caution');
    return {
      action,
      reasoningResult: {
        selectedCandidateId: action.id,
        reasoning: action.reason,
        whyNotOthers: 'Safety override suppresses normal self-care planning.',
        followUpPrompt: action.followUpPrompt,
        watchFor: action.watchFor,
        confidence: 'high',
        fallbackUsed: false,
        aiUsed: false,
      },
      candidates: [],
      safetyOverride: true,
    };
  }
  const sourceSignals = deriveSourceSignals(input);
  const candidates = buildSafePlanCandidates(input);
  const selected = fallbackRankCandidate(candidates, sourceSignals);
  const reasoning = aiFallbackReasoning(selected);
  return {
    action: toPlanAction(selected, reasoning, sourceSignals),
    reasoningResult: reasoning,
    candidates,
    safetyOverride: false,
  };
}
