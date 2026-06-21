import type { FlowCard } from '../../data/guides/flowCatalog';
import type { FlowDefinition } from '../../data/guides/flowRunners';
import type { FlowPrivacyLevel } from '../../lib/data/dataTypes';
import type { CuravonNextActionOutput } from '../../lib/plan/nextActionAdapter';
import { generateCuravonNextAction } from '../../lib/plan/nextActionAdapter';
import type { PlanAction } from '../../lib/plan/planTypes';
import { scheduleFollowUpForAction } from '../../lib/followUp/followUpScheduler';
import type { AcceptedActionSource } from '../../types/actionLifecycle';
import type { HealthProfile, NextActionState } from '../../types/health';
import type { HealthSnapshot } from '../../types/healthSnapshot';
import { saveGuideResult } from '../../utils/guideResultStorage';
import { collectFlowBehavior, runMetaSystemCycle } from '../../utils/metaSystem';
import { detectRunnerUrgent, shouldBlockRunnerCompletion } from './flowRunnerUtils';

export type FlowCompletionBlockedReason = 'urgent_terminal' | 'urgent_answers' | 'missing_flow';

export type FlowCompletionSuccess = {
  status: 'success';
  planAction: PlanAction;
  guideResultId: string;
  nextActionId: string;
  followUpId: string | null;
  concernSummary: string;
};

export type FlowCompletionBlocked = {
  status: 'blocked';
  reason: FlowCompletionBlockedReason;
  safeMessage: string;
};

export type FlowCompletionError = {
  status: 'error';
  safeMessage: string;
};

export type FlowCompletionResult = FlowCompletionSuccess | FlowCompletionBlocked | FlowCompletionError;

export type CompleteFlowInput = {
  flow: FlowCard;
  runner: FlowDefinition;
  answers: Record<string, unknown>;
  flowUrgentTerminal: boolean;
  privacyLevel: FlowPrivacyLevel;
  acceptanceSource: AcceptedActionSource;
  healthSnapshot: HealthSnapshot | null;
  nextActionState: NextActionState | null;
  healthProfile: HealthProfile | null;
  addFromFlow: (input: {
    title: string;
    answers: Record<string, unknown>;
    watch?: string;
    nextStep?: string;
    redFlags?: string[];
    category?: string;
  }) => void;
  refreshHealthSnapshot: () => void;
};

export function buildFlowAnswerMap(
  runner: FlowDefinition,
  answers: Record<string, unknown>,
): Record<string, unknown> {
  const answerMap: Record<string, unknown> = {};
  runner.questions?.forEach((question) => {
    answerMap[question.prompt] = answers[question.id];
  });
  return answerMap;
}

export function buildFlowConcernSummary(
  flow: FlowCard,
  answerMap: Record<string, unknown>,
  privacyLevel: FlowPrivacyLevel,
): string {
  if (privacyLevel === 'sensitive') {
    return flow.title;
  }
  return (
    Object.values(answerMap)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .map((value) => String(value))
      .slice(0, 3)
      .join(' | ') || flow.title
  );
}

export function mapGuidePlanToPlanAction(plan: CuravonNextActionOutput): PlanAction {
  return {
    id: plan.actionId.replace(/^guide-v2-/, ''),
    title: plan.title,
    actionText: plan.actionText,
    reason: plan.reason,
    category: plan.category,
    safetyLevel: plan.safetyLevel,
    relatedGuide: plan.relatedGuide,
    followUpPrompt: plan.followUpPrompt,
    watchFor: plan.watchFor,
    sourceSignals: plan.sourceSignals,
    selectedBy: plan.selectedBy,
    aiReasoned: plan.aiReasoned,
    fallbackUsed: plan.fallbackUsed,
  };
}

export function getFlowCompletionBlockReason(
  flowUrgentTerminal: boolean,
  answers: Record<string, unknown>,
  runner: FlowDefinition | null | undefined,
): FlowCompletionBlockedReason | null {
  if (flowUrgentTerminal) return 'urgent_terminal';
  if (shouldBlockRunnerCompletion(false, answers, runner)) return 'urgent_answers';
  return null;
}

export async function completeFlowCompletion(input: CompleteFlowInput): Promise<FlowCompletionResult> {
  const { flow, runner, answers, flowUrgentTerminal, privacyLevel } = input;

  const blockReason = getFlowCompletionBlockReason(flowUrgentTerminal, answers, runner);
  if (blockReason) {
    return {
      status: 'blocked',
      reason: blockReason,
      safeMessage:
        blockReason === 'urgent_terminal'
          ? 'This flow is in a safety terminal state. Normal completion is blocked.'
          : 'Urgent answers were detected. Normal guide completion is blocked.',
    };
  }

  try {
    const answerMap = buildFlowAnswerMap(runner, answers);
    const redFlags = detectRunnerUrgent(runner, answers).urgent.matches;
    const concernSummary = buildFlowConcernSummary(flow, answerMap, privacyLevel);
    const completedAt = new Date().toISOString();

    const plan = await generateCuravonNextAction({
      source: 'guides',
      snapshot: input.healthSnapshot,
      intakeResult: {
        concern: concernSummary,
        concernType: flow.tag,
        redFlags,
      },
      latestCheckIn: null,
      askHistory: [],
      guideHistory: [{ id: flow.id, title: flow.title }],
      nextActionState: input.nextActionState,
      redFlagLogs: [],
      profile: input.healthProfile,
      currentConcern: concernSummary,
    });

    const planAction = mapGuidePlanToPlanAction(plan);
    const guideResultId = `${flow.id}-${completedAt}`;

    saveGuideResult({
      guideId: flow.id,
      guideTitle: flow.title,
      completedAt,
      resultSummary: concernSummary,
      safeNextStep: plan.actionText,
      safetyLevel: plan.safetyLevel,
      sourceSignals: plan.sourceSignals,
    });

    input.refreshHealthSnapshot();

    const followUp = scheduleFollowUpForAction({
      acceptanceSource: input.acceptanceSource,
      action: plan,
      context: { guideId: flow.id },
    });

    input.addFromFlow({
      title: flow.title,
      answers: answerMap,
      watch: runner.watch.join('; '),
      nextStep: plan.actionText,
      redFlags,
      category: flow.tag,
    });

    collectFlowBehavior({
      flowId: flow.id,
      event: 'complete',
      stepIndex: runner.questions?.length ?? 0,
      totalSteps: runner.questions?.length,
    });

    runMetaSystemCycle();

    return {
      status: 'success',
      planAction,
      guideResultId,
      nextActionId: plan.actionId,
      followUpId: followUp.record?.id ?? null,
      concernSummary,
    };
  } catch {
    return {
      status: 'error',
      safeMessage: 'Guide completion could not be saved safely. No new action was created.',
    };
  }
}
