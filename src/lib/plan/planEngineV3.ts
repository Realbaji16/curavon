import { detectUrgentConcern } from '../../utils/healthSafety';
import { APP_STORAGE_KEYS } from '../data/storageKeys';
import { safeRead, safeWrite } from '../../utils/healthStorage';
import { buildSafePlanCandidates } from './planCandidates';
import {
  generateNextBestPlanAction,
  generateNextBestPlanActionSync,
} from './planEngineV2';
import { synthesizeNextBestAction } from './planActionSynthesis';
import { DISALLOWED_ACTION_LABELS } from './planActionBoundaries';
import { fallbackRankCandidate, isUrgentFromContext } from './planGuards';
import type {
  PlanAction,
  PlanCandidate,
  PlanEngineInput,
  PlanEngineV3Result,
  PlanReasoningResult,
  PlanSafetyLevel,
  PlanSynthesisInput,
} from './planTypes';

const PLAN_V3_CACHE = new Map<string, PlanEngineV3Result>();
const ENGINE_VERSION = 'v3';

type V3UsageLog = {
  task: 'next_action_v3';
  timestamp: string;
  cacheHit: boolean;
  fallbackUsed: boolean;
  aiSynthesized: boolean;
  boundaryValidated: boolean;
  safetyOverride: boolean;
};

function logV3Usage(entry: V3UsageLog) {
  const logs = safeRead<V3UsageLog[]>(APP_STORAGE_KEYS.aiUsageLog, []);
  safeWrite(APP_STORAGE_KEYS.aiUsageLog, [entry, ...logs].slice(0, 250));
}

function makeInputKey(input: PlanEngineInput): string {
  const text = JSON.stringify({
    v: ENGINE_VERSION,
    concern: input.currentConcern ?? '',
    risk: input.snapshot?.riskSignals ?? null,
    blocked: input.snapshot?.activeConcerns.blockedActions ?? 0,
    signals: input.sourceSignals ?? [],
    actionStatus: input.nextActionState?.status ?? 'none',
  });
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return `plan-v3-${Math.abs(hash)}`;
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
    aiSynthesized: false,
    boundaryValidated: true,
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

function hasMedicationConcern(input: PlanEngineInput): boolean {
  const concern = `${input.currentConcern ?? ''} ${input.intakeResult?.concern ?? ''}`.toLowerCase();
  return (
    /\bmedication|medicine|dose|tablet|capsule|side effect|pharmacist\b/.test(concern) ||
    (input.profile?.medications?.length ?? 0) > 0
  );
}

function isComplexPlanningContext(input: PlanEngineInput, candidates: PlanCandidate[]): boolean {
  const signals = deriveSourceSignals(input);
  const concern = (input.currentConcern ?? input.intakeResult?.concern ?? '').trim();
  const vagueConcern = concern.length > 0 && concern.length < 28;
  const multipleSignals = signals.length >= 3;
  const blocked =
    (input.snapshot?.activeConcerns.blockedActions ?? 0) > 0 ||
    input.nextActionState?.status === 'blocked' ||
    input.snapshot?.engagementSignals.repeatedBlockedActions;
  const followUpWorse = (input.snapshot?.followUpSignals.recentWorse ?? 0) > 0;
  const followUpBlocked = (input.snapshot?.followUpSignals.recentBlocked ?? 0) > 0;
  const unresolved = (input.snapshot?.activeConcerns.unresolvedAskConcerns.length ?? 0) >= 2;
  const guideActivity = (input.snapshot?.guideActivity.recentGuideCount ?? 0) > 0;
  const profileMatters =
    (input.profile?.conditions.length ?? 0) > 0 ||
    (input.profile?.medications.length ?? 0) > 0 ||
    (input.profile?.doctorQuestions.length ?? 0) > 0;
  const weakCandidates =
    candidates.length >= 2 &&
    candidates.every((candidate) => candidate.id.startsWith('cand-'));

  return (
    multipleSignals ||
    blocked ||
    followUpWorse ||
    followUpBlocked ||
    vagueConcern ||
    unresolved ||
    guideActivity ||
    profileMatters ||
    weakCandidates
  );
}

function isSimpleTodayRefresh(input: PlanEngineInput): boolean {
  const concern = (input.currentConcern ?? '').trim();
  return !concern && !input.intakeResult?.concern && (input.guideHistory?.length ?? 0) === 0;
}

function inferSource(input: PlanEngineInput): PlanSynthesisInput['source'] {
  if (input.guideHistory?.length) return 'guides';
  if (input.intakeResult?.concern) return 'ask';
  if (input.sourceSignals?.some((signal) => signal.startsWith('followup'))) return 'followup';
  return 'today';
}

function buildSynthesisInput(
  input: PlanEngineInput,
  candidates: PlanCandidate[],
  sourceSignals: string[],
  safetyLevel: PlanSafetyLevel,
): PlanSynthesisInput {
  return {
    compressedSnapshot: input.snapshot?.trendSummary ?? 'No snapshot summary available.',
    currentConcernSummary: input.currentConcern ?? input.intakeResult?.concern ?? '',
    source: inferSource(input),
    safetyLevel,
    baselineCandidates: candidates,
    recentBlockers: input.snapshot?.recentBlockers ?? [],
    followUpSignals: input.snapshot?.followUpSignals ?? {
      recentHelped: 0,
      recentBlocked: 0,
      recentWorse: 0,
      recentNotDone: 0,
      repeatedBlocked: false,
      repeatedWorse: false,
    },
    guideActivity: input.snapshot?.guideActivity ?? { recentGuideTitles: [], recentGuideCount: 0 },
    profileContext: input.snapshot?.profileContext ?? {
      goalCount: 0,
      hasMedications: false,
      hasConditions: false,
      primaryGoalsSummary: '',
    },
    allowedCategories: [],
    allowedPrimitives: [],
    disallowedActions: DISALLOWED_ACTION_LABELS,
    sourceSignals,
    medicationConcern: hasMedicationConcern(input),
  };
}

function ruleReasoning(candidate: PlanCandidate): PlanReasoningResult {
  return {
    selectedCandidateId: candidate.id,
    reasoning: candidate.whyCandidateFits,
    whyNotOthers: 'Deterministic selection from safe baseline candidates.',
    followUpPrompt: 'How did this step go: done, blocked, or adjust?',
    watchFor: 'Any noticeable change in how you feel.',
    confidence: 'medium',
    fallbackUsed: true,
    aiUsed: false,
  };
}

function synthesizedToPlanAction(
  synthesis: NonNullable<PlanEngineV3Result['synthesis']>,
  sourceSignals: string[],
): PlanAction {
  const action = synthesis.synthesizedAction!;
  return {
    id: action.id,
    title: action.title,
    actionText: action.actionText,
    reason: action.reason,
    category: action.category,
    safetyLevel: action.safetyLevel,
    relatedGuide: action.relatedGuide,
    followUpPrompt: action.followUpPrompt ?? 'How did this step go: done, blocked, or adjust?',
    watchFor: action.watchFor ?? 'Any noticeable change in how you feel.',
    sourceSignals,
    selectedBy: synthesis.aiUsed ? 'ai' : 'rules',
    aiReasoned: synthesis.aiUsed,
    fallbackUsed: synthesis.fallbackUsed,
    aiSynthesized: synthesis.aiSynthesized,
    boundaryValidated: synthesis.boundaryValidated,
    primitiveUsed: action.primitiveUsed,
  };
}

function deterministicResult(
  _input: PlanEngineInput,
  candidates: PlanCandidate[],
  sourceSignals: string[],
): PlanEngineV3Result {
  const selected = fallbackRankCandidate(candidates, sourceSignals);
  const reasoning = ruleReasoning(selected);
  return {
    action: {
      id: selected.id,
      title: selected.title,
      actionText: selected.actionText,
      reason: reasoning.reasoning,
      category: selected.category,
      safetyLevel: selected.safetyLevel,
      relatedGuide: selected.relatedGuide,
      followUpPrompt: reasoning.followUpPrompt,
      watchFor: reasoning.watchFor,
      sourceSignals,
      selectedBy: 'rules',
      aiReasoned: false,
      fallbackUsed: true,
      aiSynthesized: false,
      boundaryValidated: true,
    },
    reasoningResult: reasoning,
    candidates,
    safetyOverride: false,
  };
}

export async function generateNextBestActionV3(input: PlanEngineInput): Promise<PlanEngineV3Result> {
  const cacheKey = makeInputKey(input);
  const cached = PLAN_V3_CACHE.get(cacheKey);
  if (cached) {
    logV3Usage({
      task: 'next_action_v3',
      timestamp: new Date().toISOString(),
      cacheHit: true,
      fallbackUsed: cached.action.fallbackUsed,
      aiSynthesized: Boolean(cached.action.aiSynthesized),
      boundaryValidated: Boolean(cached.action.boundaryValidated),
      safetyOverride: cached.safetyOverride,
    });
    return cached;
  }

  const concernText = input.currentConcern ?? input.intakeResult?.concern ?? '';
  const urgentBySafety = isUrgentFromContext(input);
  const urgentByText = detectUrgentConcern(concernText).hasUrgent;
  if (urgentBySafety || urgentByText) {
    const action = safetyOverrideAction(urgentByText ? 'urgent' : 'caution');
    const result: PlanEngineV3Result = {
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
    PLAN_V3_CACHE.set(cacheKey, result);
    logV3Usage({
      task: 'next_action_v3',
      timestamp: new Date().toISOString(),
      cacheHit: false,
      fallbackUsed: false,
      aiSynthesized: false,
      boundaryValidated: true,
      safetyOverride: true,
    });
    return result;
  }

  const sourceSignals = deriveSourceSignals(input);
  const candidates = buildSafePlanCandidates(input);
  const safetyLevel: PlanSafetyLevel = input.snapshot?.riskSignals.repeatedRedFlags
    ? 'caution'
    : 'normal';
  const complex = isComplexPlanningContext(input, candidates);

  if (!complex && (candidates.length === 1 || isSimpleTodayRefresh(input))) {
    const result = deterministicResult(input, candidates, sourceSignals);
    PLAN_V3_CACHE.set(cacheKey, result);
    logV3Usage({
      task: 'next_action_v3',
      timestamp: new Date().toISOString(),
      cacheHit: false,
      fallbackUsed: true,
      aiSynthesized: false,
      boundaryValidated: true,
      safetyOverride: false,
    });
    return result;
  }

  if (complex) {
    const synthesis = await synthesizeNextBestAction(
      buildSynthesisInput(input, candidates, sourceSignals, safetyLevel),
    );
    if (synthesis.valid && synthesis.synthesizedAction) {
      const result: PlanEngineV3Result = {
        action: synthesizedToPlanAction(synthesis, sourceSignals),
        reasoningResult: {
          selectedCandidateId: synthesis.selectedCandidateId ?? synthesis.synthesizedAction.id,
          reasoning: synthesis.reasoning,
          whyNotOthers: synthesis.safetyNotes || 'Synthesis guard validated this action.',
          followUpPrompt: synthesis.synthesizedAction.followUpPrompt ?? 'How did this step go?',
          watchFor: synthesis.synthesizedAction.watchFor ?? 'Any noticeable change.',
          confidence: synthesis.confidence,
          fallbackUsed: synthesis.fallbackUsed,
          aiUsed: synthesis.aiUsed,
        },
        candidates,
        safetyOverride: false,
        synthesis,
      };
      PLAN_V3_CACHE.set(cacheKey, result);
      logV3Usage({
        task: 'next_action_v3',
        timestamp: new Date().toISOString(),
        cacheHit: false,
        fallbackUsed: synthesis.fallbackUsed,
        aiSynthesized: synthesis.aiSynthesized,
        boundaryValidated: synthesis.boundaryValidated,
        safetyOverride: false,
      });
      return result;
    }
  }

  try {
    const v2 = await generateNextBestPlanAction(input);
    const result: PlanEngineV3Result = { ...v2, synthesis: undefined };
    PLAN_V3_CACHE.set(cacheKey, result);
    logV3Usage({
      task: 'next_action_v3',
      timestamp: new Date().toISOString(),
      cacheHit: false,
      fallbackUsed: v2.action.fallbackUsed,
      aiSynthesized: false,
      boundaryValidated: true,
      safetyOverride: v2.safetyOverride,
    });
    return result;
  } catch {
    const result = deterministicResult(input, candidates, sourceSignals);
    PLAN_V3_CACHE.set(cacheKey, result);
    return result;
  }
}

export function generateNextBestActionV3Sync(input: PlanEngineInput): PlanEngineV3Result {
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

  try {
    const v2 = generateNextBestPlanActionSync(input);
    return { ...v2 };
  } catch {
    const sourceSignals = deriveSourceSignals(input);
    const candidates = buildSafePlanCandidates(input);
    return deterministicResult(input, candidates, sourceSignals);
  }
}
