import type { AIKernelResponse } from '../ai/aiTypes';
import type { PlanCandidate, PlanEngineInput, PlanReasoningResult } from './planTypes';

const BANNED_REASONING_PATTERNS = [
  /\byou have\b/i,
  /\bdiagnosis|diagnosed\b/i,
  /\btreatment plan\b/i,
  /\bstart medication|stop medication|change medication|dose|dosage\b/i,
  /\bno need to see a doctor|no need for urgent care|safe to wait\b/i,
];

const MAX_REASONING_WORDS = 45;

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isUrgentFromContext(input: PlanEngineInput): boolean {
  const intakeFlags = input.intakeResult?.redFlags ?? [];
  return (
    (input.snapshot?.riskSignals.repeatedRedFlags ?? false) ||
    (input.redFlagLogs?.length ?? 0) > 0 ||
    intakeFlags.some((flag) => !/none/i.test(flag))
  );
}

export function parseReasoningFromKernelResponse(response: AIKernelResponse): PlanReasoningResult | null {
  if (!response.selectedCandidateId) return null;
  return {
    selectedCandidateId: response.selectedCandidateId,
    reasoning: response.reasoning ?? '',
    whyNotOthers: response.whyNotOthers ?? '',
    followUpPrompt: response.followUpPrompt ?? 'How did this step go: done, blocked, or adjust?',
    watchFor: response.watchFor ?? 'Any noticeable change in how you feel.',
    confidence: response.confidence ?? 'low',
    fallbackUsed: Boolean(response.fallbackUsed),
    aiUsed: !response.fallbackUsed,
  };
}

export function validateReasoningResult(
  result: PlanReasoningResult | null,
  candidates: PlanCandidate[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!result) {
    errors.push('Reasoning result missing.');
    return { valid: false, errors };
  }
  const candidateIds = new Set(candidates.map((candidate) => candidate.id));
  if (!candidateIds.has(result.selectedCandidateId)) {
    errors.push('selectedCandidateId not in candidate list.');
  }
  const concatText = [result.reasoning, result.whyNotOthers, result.watchFor].join(' ');
  if (BANNED_REASONING_PATTERNS.some((pattern) => pattern.test(concatText))) {
    errors.push('Reasoning output contains blocked medical language.');
  }
  if (wordCount(result.reasoning) > MAX_REASONING_WORDS) {
    errors.push('Reasoning too long.');
  }
  if (!['low', 'medium', 'high'].includes(result.confidence)) {
    errors.push('Invalid confidence value.');
  }
  return { valid: errors.length === 0, errors };
}

export function fallbackRankCandidate(
  candidates: PlanCandidate[],
  sourceSignals: string[],
): PlanCandidate {
  const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
  const hasSymptomHeavy = sourceSignals.some((signal) =>
    ['symptom_tracking', 'headache_pattern', 'stomach_pattern', 'repeating_symptoms'].includes(signal),
  );
  const hasDoctorPrepHeavy = sourceSignals.some((signal) =>
    ['doctor_prep_needed', 'medication_question', 'repeated_unresolved_concern'].includes(signal),
  );
  const hasStressHeavy = sourceSignals.some((signal) =>
    ['high_stress', 'mood_support', 'overwhelmed', 'low_sleep', 'low_energy'].includes(signal),
  );

  const baseOrder = ['escalate', 'reduce_friction', 'stabilize', 'prepare', 'track'] as const;
  let weightedOrder = [...baseOrder];
  if (hasSymptomHeavy) weightedOrder = ['escalate', 'reduce_friction', 'track', 'stabilize', 'prepare'];
  if (hasDoctorPrepHeavy) weightedOrder = ['escalate', 'reduce_friction', 'prepare', 'stabilize', 'track'];
  if (hasStressHeavy) weightedOrder = ['escalate', 'reduce_friction', 'stabilize', 'prepare', 'track'];

  for (const category of weightedOrder) {
    const pick = candidates.find((candidate) => candidate.category === category);
    if (pick) return pick;
  }
  return byId.get(candidates[0]?.id) ?? {
    id: 'fallback-stabilize',
    title: 'Lower the noise first',
    actionText: 'Take two slow breaths, then write one sentence about what feels loudest right now.',
    category: 'stabilize',
    safetyLevel: 'normal',
    whyCandidateFits: 'Fallback candidate.',
    whenToUse: 'When uncertain.',
    relatedGuide: 'Tiny Grounding Steps',
  };
}
