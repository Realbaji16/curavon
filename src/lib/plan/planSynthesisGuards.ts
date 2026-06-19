import type { PlanCandidate, PlanSafetyLevel, PlanSynthesisResult } from './planTypes';
import {
  containsDisallowedActionText,
  isAllowedCategory,
  isAllowedPrimitive,
  PRIMITIVES_BY_CATEGORY,
  primitiveMatchesCategory,
  safetyLevelAtLeast,
} from './planActionBoundaries';

const MAX_REASONING_WORDS = 45;
const MAX_ACTION_SENTENCES = 2;

type RawSynthesisPayload = {
  selectedMode?: string;
  selectedCandidateId?: string;
  synthesizedAction?: {
    title?: string;
    actionText?: string;
    reason?: string;
    category?: string;
    safetyLevel?: string;
    primitiveUsed?: string;
    followUpPrompt?: string;
    watchFor?: string;
  };
  reasoning?: string;
  confidence?: string;
  safetyNotes?: string;
};

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function isOneActionText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  const sentences = trimmed.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  return sentences.length <= MAX_ACTION_SENTENCES;
}

export function parseSynthesisPayload(raw: Record<string, unknown>): RawSynthesisPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const synthesized = raw.synthesizedAction as RawSynthesisPayload['synthesizedAction'];
  return {
    selectedMode: typeof raw.selectedMode === 'string' ? raw.selectedMode : undefined,
    selectedCandidateId:
      typeof raw.selectedCandidateId === 'string' ? raw.selectedCandidateId : undefined,
    synthesizedAction: synthesized
      ? {
          title: typeof synthesized.title === 'string' ? synthesized.title : undefined,
          actionText: typeof synthesized.actionText === 'string' ? synthesized.actionText : undefined,
          reason: typeof synthesized.reason === 'string' ? synthesized.reason : undefined,
          category: typeof synthesized.category === 'string' ? synthesized.category : undefined,
          safetyLevel:
            typeof synthesized.safetyLevel === 'string' ? synthesized.safetyLevel : undefined,
          primitiveUsed:
            typeof synthesized.primitiveUsed === 'string' ? synthesized.primitiveUsed : undefined,
          followUpPrompt:
            typeof synthesized.followUpPrompt === 'string' ? synthesized.followUpPrompt : undefined,
          watchFor: typeof synthesized.watchFor === 'string' ? synthesized.watchFor : undefined,
        }
      : undefined,
    reasoning: typeof raw.reasoning === 'string' ? raw.reasoning : undefined,
    confidence: typeof raw.confidence === 'string' ? raw.confidence : undefined,
    safetyNotes: typeof raw.safetyNotes === 'string' ? raw.safetyNotes : undefined,
  };
}

export function validatePlanSynthesisResult(input: {
  payload: RawSynthesisPayload | null;
  baselineCandidates: PlanCandidate[];
  inputSafetyLevel: PlanSafetyLevel;
  medicationConcern: boolean;
  allowedCategories: string[];
  allowedPrimitives: string[];
  sourceSignals: string[];
  fallbackUsed: boolean;
  aiUsed: boolean;
}): PlanSynthesisResult {
  const baseFailure = (errors: string[], blockReason?: string): PlanSynthesisResult => ({
    selectedMode: 'use_existing_candidate',
    reasoning: '',
    confidence: 'low',
    safetyNotes: '',
    valid: false,
    validationErrors: errors,
    fallbackUsed: true,
    aiUsed: input.aiUsed,
    boundaryValidated: false,
    aiSynthesized: false,
    blockReason,
  });

  const { payload } = input;
  if (!payload) {
    return baseFailure(['Synthesis payload missing.'], 'invalid_shape');
  }

  if (
    payload.selectedMode !== 'use_existing_candidate' &&
    payload.selectedMode !== 'synthesize_custom_action'
  ) {
    return baseFailure(['Invalid selectedMode.'], 'invalid_mode');
  }

  if (wordCount(payload.reasoning ?? '') > MAX_REASONING_WORDS) {
    return baseFailure(['Reasoning too long.'], 'reasoning_too_long');
  }

  const concatMeta = [payload.reasoning, payload.safetyNotes].join(' ');
  if (containsDisallowedActionText(concatMeta)) {
    return baseFailure(['Reasoning contains disallowed language.'], 'medical_boundary');
  }

  if (payload.selectedMode === 'use_existing_candidate') {
    const candidateIds = new Set(input.baselineCandidates.map((candidate) => candidate.id));
    if (!payload.selectedCandidateId || !candidateIds.has(payload.selectedCandidateId)) {
      return baseFailure(['selectedCandidateId not in baseline candidates.'], 'invalid_candidate');
    }
    const candidate = input.baselineCandidates.find((item) => item.id === payload.selectedCandidateId)!;
    if (input.medicationConcern && candidate.category !== 'prepare') {
      return baseFailure(['Medication concern requires prepare category.'], 'medication_boundary');
    }
    if (input.inputSafetyLevel === 'urgent' && candidate.category !== 'escalate') {
      return baseFailure(['Urgent safety requires escalate category.'], 'urgent_boundary');
    }
    return {
      selectedMode: 'use_existing_candidate',
      selectedCandidateId: payload.selectedCandidateId,
      reasoning: payload.reasoning ?? candidate.whyCandidateFits,
      confidence:
        payload.confidence === 'high' || payload.confidence === 'medium' ? payload.confidence : 'low',
      safetyNotes: payload.safetyNotes ?? '',
      valid: true,
      fallbackUsed: input.fallbackUsed,
      aiUsed: input.aiUsed,
      boundaryValidated: true,
      aiSynthesized: false,
      synthesizedAction: {
        id: `syn-${candidate.id}`,
        title: candidate.title,
        actionText: candidate.actionText,
        reason: payload.reasoning ?? candidate.whyCandidateFits,
        category: candidate.category,
        safetyLevel: candidate.safetyLevel,
        primitiveUsed: PRIMITIVES_BY_CATEGORY[candidate.category][0],
        relatedGuide: candidate.relatedGuide,
        followUpPrompt: 'How did this step go: done, blocked, or adjust?',
        watchFor: 'Any noticeable change in how you feel.',
        sourceSignals: input.sourceSignals,
        aiSynthesized: false,
        aiReasoned: input.aiUsed,
        fallbackUsed: input.fallbackUsed,
        boundaryValidated: true,
      },
    };
  }

  const action = payload.synthesizedAction;
  if (!action?.title || !action.actionText || !action.reason || !action.category) {
    return baseFailure(['Synthesized action fields incomplete.'], 'invalid_shape');
  }

  const textBlob = [action.title, action.actionText, action.reason, action.watchFor, action.followUpPrompt]
    .filter(Boolean)
    .join(' ');

  if (containsDisallowedActionText(textBlob)) {
    return baseFailure(['Synthesized action contains disallowed language.'], 'medical_boundary');
  }

  if (!isAllowedCategory(action.category) || !input.allowedCategories.includes(action.category)) {
    return baseFailure(['Category not allowed for this context.'], 'category_boundary');
  }

  if (!action.primitiveUsed || !isAllowedPrimitive(action.primitiveUsed)) {
    return baseFailure(['primitiveUsed not allowed.'], 'primitive_boundary');
  }

  if (!input.allowedPrimitives.includes(action.primitiveUsed)) {
    return baseFailure(['primitiveUsed not allowed in context.'], 'primitive_boundary');
  }

  if (!primitiveMatchesCategory(action.primitiveUsed, action.category)) {
    return baseFailure(['primitiveUsed does not match category.'], 'primitive_mismatch');
  }

  const outputSafety =
    action.safetyLevel === 'caution' || action.safetyLevel === 'urgent' || action.safetyLevel === 'normal'
      ? action.safetyLevel
      : input.inputSafetyLevel;

  if (!safetyLevelAtLeast(outputSafety, input.inputSafetyLevel)) {
    return baseFailure(['Safety level cannot be downgraded.'], 'safety_downgrade');
  }

  if (input.inputSafetyLevel === 'urgent' && action.category !== 'escalate') {
    return baseFailure(['Urgent safety requires escalate category.'], 'urgent_boundary');
  }

  if (input.medicationConcern && action.category !== 'prepare') {
    return baseFailure(['Medication concern requires prepare category.'], 'medication_boundary');
  }

  if (!isOneActionText(action.actionText)) {
    return baseFailure(['actionText must be one action only.'], 'multi_action');
  }

  return {
    selectedMode: 'synthesize_custom_action',
    reasoning: payload.reasoning ?? action.reason,
    confidence:
      payload.confidence === 'high' || payload.confidence === 'medium' ? payload.confidence : 'low',
    safetyNotes: payload.safetyNotes ?? '',
    valid: true,
    fallbackUsed: input.fallbackUsed,
    aiUsed: input.aiUsed,
    boundaryValidated: true,
    aiSynthesized: true,
    synthesizedAction: {
      id: `syn-custom-${Date.now()}`,
      title: action.title.trim(),
      actionText: action.actionText.trim(),
      reason: action.reason.trim(),
      category: action.category,
      safetyLevel: outputSafety,
      primitiveUsed: action.primitiveUsed,
      followUpPrompt: action.followUpPrompt?.trim() || 'How did this step go: done, blocked, or adjust?',
      watchFor: action.watchFor?.trim() || 'Any noticeable change in how you feel.',
      sourceSignals: input.sourceSignals,
      aiSynthesized: true,
      aiReasoned: input.aiUsed,
      fallbackUsed: input.fallbackUsed,
      boundaryValidated: true,
    },
  };
}
