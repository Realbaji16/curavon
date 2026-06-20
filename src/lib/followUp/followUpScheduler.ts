import type { PlanAction, PlanCategory, PlanSafetyLevel } from '../plan/planTypes';
import type { CuravonNextActionOutput } from '../plan/nextActionAdapter';
import type { AcceptedActionSource } from '../../types/actionLifecycle';
import { isPreviewActionSource } from '../../types/actionLifecycle';
import type { FollowUpIntent, FollowUpRecord } from './followUpTypes';
import { followUpIntentForCategory, promptForFollowUp } from './followUpQuestions';
import { dueAtForCategory, getFollowUps, saveFollowUp } from './followUpStorage';

export type FollowUpScheduleSource = 'today' | 'ask' | 'guides' | 'followup' | 'manual';

export type FollowUpScheduleStatus = 'created' | 'existing' | 'skipped';

export type FollowUpScheduleInput = {
  /** Must be an accepted-action source — preview paths are rejected. */
  acceptanceSource: AcceptedActionSource;
  action:
    | PlanAction
    | CuravonNextActionOutput
    | {
        actionId: string;
        title: string;
        category: PlanCategory | string;
        safetyLevel: PlanSafetyLevel | 'normal' | 'caution' | 'urgent';
        sourceSignals?: string[];
      };
  context?: {
    entryId?: string;
    guideId?: string;
  };
};

export type FollowUpScheduleResult = {
  status: FollowUpScheduleStatus;
  record: FollowUpRecord | null;
  reason?: string;
};

function scheduleSourceFromAcceptance(source: AcceptedActionSource): FollowUpScheduleSource {
  switch (source) {
    case 'ask_promoted':
      return 'ask';
    case 'guide_completed':
      return 'guides';
    case 'followup_adjusted':
      return 'followup';
    case 'manual_refresh':
      return 'manual';
    default:
      return 'today';
  }
}

function actionIdFor(input: FollowUpScheduleInput): string {
  const scheduleSource = scheduleSourceFromAcceptance(input.acceptanceSource);
  if ('actionId' in input.action && input.action.actionId) return input.action.actionId;
  if ('id' in input.action && input.action.id) {
    const prefix = scheduleSource === 'ask' ? 'ask' : scheduleSource === 'guides' ? 'guide' : 'plan';
    return `${prefix}-${input.action.id}`;
  }
  return `fup-${Date.now()}`;
}

function titleFor(input: FollowUpScheduleInput): string {
  if ('title' in input.action) return input.action.title;
  return "Today's next best action";
}

function categoryFor(input: FollowUpScheduleInput): string {
  return input.action.category ?? 'stabilize';
}

function safetyLevelFor(input: FollowUpScheduleInput): 'normal' | 'caution' | 'urgent' {
  return input.action.safetyLevel ?? 'normal';
}

function sourceSignalsFor(input: FollowUpScheduleInput): string[] {
  return (input.action.sourceSignals ?? []).map(String);
}

function recordIdFor(input: FollowUpScheduleInput, actionId: string): string {
  const scheduleSource = scheduleSourceFromAcceptance(input.acceptanceSource);
  if (input.context?.entryId) return `fup-ask-${input.context.entryId}`;
  if (input.context?.guideId) return `fup-guide-${input.context.guideId}-${Date.now()}`;
  return `fup-${scheduleSource}-${actionId}-${Date.now()}`;
}

export function scheduleFollowUpForAction(input: FollowUpScheduleInput): FollowUpScheduleResult {
  try {
    if (isPreviewActionSource(input.acceptanceSource)) {
      return { status: 'skipped', record: null, reason: 'preview_action' };
    }

    const category = categoryFor(input);
    const safetyLevel = safetyLevelFor(input);

    if (safetyLevel === 'urgent' || category === 'escalate') {
      return { status: 'skipped', record: null, reason: 'urgent_or_escalate' };
    }

    const actionId = actionIdFor(input);
    const sameDay = new Date().toISOString().slice(0, 10);
    const existing = getFollowUps().find(
      (item) =>
        item.actionId === actionId &&
        item.createdAt.slice(0, 10) === sameDay &&
        item.status === 'pending',
    );
    if (existing) {
      return { status: 'existing', record: existing };
    }

    const record: FollowUpRecord = {
      id: recordIdFor(input, actionId),
      actionId,
      createdAt: new Date().toISOString(),
      dueAt: dueAtForCategory(category, safetyLevel),
      status: 'pending',
      intent: followUpIntentForCategory(category) as FollowUpIntent,
      linkedActionTitle: titleFor(input),
      linkedActionCategory: category,
      linkedSafetyLevel: safetyLevel,
      prompt: promptForFollowUp(category, safetyLevel),
      sourceSignals: sourceSignalsFor(input),
      escalationFlag: false,
      savedToDoctorSummary: false,
    };

    const saved = saveFollowUp(record);
    if (!saved) {
      return { status: 'skipped', record: null, reason: 'save_rejected' };
    }
    return { status: 'created', record: saved };
  } catch {
    return { status: 'skipped', record: null, reason: 'storage_error' };
  }
}
