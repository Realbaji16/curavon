/**
 * Single runtime entry for next-action generation. Plan Engine v3 is canonical —
 * do not import planEngineV2 from screens, contexts, or other runtime modules.
 *
 * @see docs/decisions/0003-plan-engine-v3-canonical.md
 */
import type { AskHistoryEntry } from '../../types/askIntake';
import type { RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import type { HealthSnapshot } from '../../types/healthSnapshot';
import type { FollowUpOutcome } from '../followUp/followUpTypes';
import type { GuideResultRecord } from '../../types/guideResult';
import { generateNextBestActionV3, generateNextBestActionV3Sync } from './planEngineV3';
import type { PlanCategory, PlanEngineInput, PlanEngineResult, PlanSafetyLevel } from './planTypes';

export type NextActionSource = 'today' | 'ask' | 'guides' | 'followup';

export type PlanEngineFailureReason = 'canonical_v3' | 'plan_engine_unavailable' | 'safe_fallback';

export interface CuravonNextActionInput {
  source: NextActionSource;
  snapshot: HealthSnapshot | null;
  intakeResult?: {
    concern?: string;
    concernType?: string;
    redFlags?: string[];
  } | null;
  guideResult?: GuideResultRecord | null;
  followUpResult?: { outcome: FollowUpOutcome; note?: string } | null;
  latestCheckIn?: DailyCheckIn | null;
  profile?: HealthProfile | null;
  redFlagLogs?: RedFlagLog[];
  askHistory?: AskHistoryEntry[];
  guideHistory?: Array<{ id: string; title: string; completedAt?: string }>;
  nextActionState?: NextActionState | null;
  currentConcern?: string;
  sourceSignals?: string[];
}

export interface CuravonNextActionOutput {
  title: string;
  actionText: string;
  reason: string;
  category: PlanCategory;
  safetyLevel: PlanSafetyLevel;
  relatedGuide?: string;
  relatedGuideFlowId: NextActionState['relatedGuideFlowId'];
  followUpPrompt: string;
  watchFor: string;
  sourceSignals: string[];
  selectedBy: 'ai' | 'rules';
  aiReasoned: boolean;
  fallbackUsed: boolean;
  actionId: string;
  safetyOverride: boolean;
  planEngineReason: PlanEngineFailureReason;
}

function sourceLabel(source: NextActionSource): string {
  switch (source) {
    case 'ask':
      return 'Ask Curavon';
    case 'guides':
      return 'Guided Flow';
    case 'followup':
      return 'Follow-Up';
    default:
      return "Today's Check-In";
  }
}

function relatedGuideFlowId(relatedGuide?: string): NextActionState['relatedGuideFlowId'] {
  const guide = (relatedGuide ?? '').toLowerCase();
  if (guide.includes('doctor')) return 'doctor-visit-prep';
  if (guide.includes('sleep') || guide.includes('mood')) return 'mood-stress-checkin';
  if (guide.includes('stomach')) return 'stomach-pain';
  if (guide.includes('headache')) return 'headache';
  return 'something-feels-off';
}

function appendFollowUpSignals(
  input: CuravonNextActionInput,
  signals: string[],
): string[] {
  const next = [...signals];
  if (input.followUpResult?.outcome === 'helped') next.push('followup_helped');
  if (input.followUpResult?.outcome === 'blocked' || input.followUpResult?.outcome === 'not_done') {
    next.push('followup_blocked');
  }
  if (input.followUpResult?.outcome === 'worse') next.push('followup_worse');
  if (input.guideResult) next.push('recent_guide_completion');
  return Array.from(new Set(next));
}

function toPlanEngineInput(input: CuravonNextActionInput): PlanEngineInput {
  const guideHistory =
    input.guideHistory ??
    (input.guideResult
      ? [{ id: input.guideResult.guideId, title: input.guideResult.guideTitle, completedAt: input.guideResult.completedAt }]
      : []);

  return {
    snapshot: input.snapshot,
    intakeResult: input.intakeResult ?? null,
    latestCheckIn: input.latestCheckIn ?? null,
    askHistory: input.askHistory ?? [],
    guideHistory,
    nextActionState: input.nextActionState ?? null,
    redFlagLogs: input.redFlagLogs ?? [],
    profile: input.profile ?? null,
    currentConcern: input.currentConcern ?? input.intakeResult?.concern ?? input.guideResult?.resultSummary ?? '',
    sourceSignals: appendFollowUpSignals(input, input.sourceSignals ?? []),
  };
}

function isUrgentExistingAction(state: NextActionState): boolean {
  return state.safetyLevel === 'urgent' || state.category === 'escalate';
}

function outputFromExistingState(
  state: NextActionState,
  source: NextActionSource,
  planEngineReason: PlanEngineFailureReason,
): CuravonNextActionOutput {
  return {
    title: state.title ?? "Today's next step",
    actionText: state.currentAction,
    reason: state.reason ?? 'Keeping your current step while planning is unavailable.',
    category: (state.category ?? 'stabilize') as PlanCategory,
    safetyLevel: state.safetyLevel ?? 'normal',
    relatedGuide: state.relatedGuide,
    relatedGuideFlowId: state.relatedGuideFlowId ?? relatedGuideFlowId(state.relatedGuide),
    followUpPrompt: state.followUpPrompt ?? 'How did this step go: done, blocked, or adjust?',
    watchFor: state.watchFor ?? 'Any noticeable change in how you feel.',
    sourceSignals: state.sourceSignals ?? [],
    selectedBy: state.selectedBy ?? 'rules',
    aiReasoned: state.aiReasoned ?? false,
    fallbackUsed: true,
    actionId: state.actionId ?? `plan-v3-preserved-${source}`,
    safetyOverride: isUrgentExistingAction(state),
    planEngineReason,
  };
}

function mapPlanResult(
  result: PlanEngineResult,
  source: NextActionSource,
): CuravonNextActionOutput {
  const prefix = source === 'ask' ? 'ask' : source === 'guides' ? 'guide' : source === 'followup' ? 'fup' : 'plan';
  return {
    title: result.action.title,
    actionText: result.action.actionText,
    reason: result.action.reason,
    category: result.action.category,
    safetyLevel: result.action.safetyLevel,
    relatedGuide: result.action.relatedGuide,
    relatedGuideFlowId: relatedGuideFlowId(result.action.relatedGuide),
    followUpPrompt: result.action.followUpPrompt,
    watchFor: result.action.watchFor,
    sourceSignals: result.action.sourceSignals,
    selectedBy: result.action.selectedBy,
    aiReasoned: result.action.aiReasoned,
    fallbackUsed: result.action.fallbackUsed,
    actionId: `${prefix}-v3-${result.action.id}`,
    safetyOverride: result.safetyOverride,
    planEngineReason: 'canonical_v3',
  };
}

function conservativeSafeFallback(): CuravonNextActionOutput {
  return {
    title: 'Keep today simple',
    actionText: 'Take one gentle stabilizing step: hydrate, pause briefly, and write one short note.',
    reason: 'A safe fallback step keeps support practical when planning is unavailable.',
    category: 'stabilize',
    safetyLevel: 'normal',
    relatedGuide: 'Tiny Grounding Steps',
    relatedGuideFlowId: 'something-feels-off',
    followUpPrompt: 'How did this step go: done, blocked, or adjust?',
    watchFor: 'Any noticeable change in how you feel.',
    sourceSignals: [],
    selectedBy: 'rules',
    aiReasoned: false,
    fallbackUsed: true,
    actionId: 'plan-v3-safe-fallback',
    safetyOverride: false,
    planEngineReason: 'safe_fallback',
  };
}

function resolveEngineFailure(
  input: CuravonNextActionInput,
  reason: PlanEngineFailureReason,
): CuravonNextActionOutput {
  const current = input.nextActionState;
  if (current?.currentAction?.trim()) {
    if (isUrgentExistingAction(current) || current.status === 'pending') {
      return outputFromExistingState(current, input.source, reason);
    }
  }
  return { ...conservativeSafeFallback(), planEngineReason: reason === 'plan_engine_unavailable' ? reason : 'safe_fallback' };
}

export function toNextActionStateFromAdapter(
  output: CuravonNextActionOutput,
  source: NextActionSource,
): NextActionState {
  return {
    currentAction: output.actionText,
    title: output.title,
    reason: output.reason,
    source: sourceLabel(source),
    sourceSignals: output.sourceSignals,
    sourceChips: ['Next Action'],
    effort: 'very_low',
    category: output.category,
    relatedGuide: output.relatedGuide,
    relatedGuideFlowId: output.relatedGuideFlowId,
    safetyLevel: output.safetyLevel,
    followUpPrompt: output.followUpPrompt,
    watchFor: output.watchFor,
    selectedBy: output.selectedBy,
    aiReasoned: output.aiReasoned,
    fallbackUsed: output.fallbackUsed,
    actionId: output.actionId,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  };
}

/** Async runtime path — v3 only; never falls back to deprecated v2. */
export async function generateCuravonNextAction(
  input: CuravonNextActionInput,
): Promise<CuravonNextActionOutput> {
  try {
    const result = await generateNextBestActionV3(toPlanEngineInput(input));
    return mapPlanResult(result, input.source);
  } catch {
    return resolveEngineFailure(input, 'plan_engine_unavailable');
  }
}

/** Sync runtime path — v3 only; never falls back to deprecated v2. */
export function generateCuravonNextActionSync(
  input: CuravonNextActionInput,
): CuravonNextActionOutput {
  try {
    const result = generateNextBestActionV3Sync(toPlanEngineInput(input));
    return mapPlanResult(result, input.source);
  } catch {
    return resolveEngineFailure(input, 'plan_engine_unavailable');
  }
}
