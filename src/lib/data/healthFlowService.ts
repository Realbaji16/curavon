import type {
  FlowAction,
  FlowBlocker,
  FlowPrivacyLevel,
  FlowRiskLevel,
  HealthFlow,
} from './dataTypes';
import { getDataAdapter } from './getDataAdapter';
import type { AdjustOption, HealthBlockedReason, NextActionState } from '../../types/health';
import { ADJUSTED_ACTIONS } from '../../utils/nextActionRules';
import { blockedReasonLabel, adjustedOptionLabel } from '../../utils/nextBestActionEngine';

export const HEALTH_FLOW_MODULE_VERSION = 'health_flow_v1';

const BLOCKER_SEVERITY: Record<HealthBlockedReason, FlowRiskLevel> = {
  tired: 'low',
  time: 'low',
  unsure: 'medium',
  symptoms: 'high',
  other: 'medium',
};

export function mapPlanSafetyToRiskLevel(
  safetyLevel?: 'normal' | 'caution' | 'urgent',
): FlowRiskLevel {
  if (safetyLevel === 'urgent') return 'urgent';
  if (safetyLevel === 'caution') return 'medium';
  return 'low';
}

export function resolveAskPrivacyLevel(sensitiveMode: boolean): FlowPrivacyLevel {
  return sensitiveMode ? 'sensitive' : 'private';
}

export function buildAskDraftFlowPayload(input: {
  concernType: string;
  goal: string;
  timeline: string;
  intakeSessionId?: string | null;
  askHistoryEntryId?: string | null;
  actionPreview: {
    actionId: string;
    title: string;
    category: string;
    safetyLevel: string;
  };
}): Record<string, unknown> {
  return {
    source: 'ask_curavon',
    concernType: input.concernType,
    goal: input.goal,
    timeline: input.timeline,
    intakeSessionId: input.intakeSessionId ?? null,
    askHistoryEntryId: input.askHistoryEntryId ?? null,
    actionPreview: input.actionPreview,
  };
}

export function buildAskSafetyBlockedPayload(input: {
  redFlagCategories: string[];
  selfHarm: boolean;
  immediateSafety: boolean;
  intakeSessionId?: string | null;
}): Record<string, unknown> {
  return {
    source: 'ask_curavon',
    outcome: 'safety_blocked',
    redFlagCategories: input.redFlagCategories,
    selfHarm: input.selfHarm,
    immediateSafety: input.immediateSafety,
    intakeSessionId: input.intakeSessionId ?? null,
  };
}

export async function createAskDraftHealthFlow(input: {
  title?: string;
  riskLevel: FlowRiskLevel;
  privacyLevel: FlowPrivacyLevel;
  payload: Record<string, unknown>;
}): Promise<HealthFlow> {
  const adapter = getDataAdapter();
  const draft = await adapter.createDraftHealthFlow({
    title: input.title,
    stage: 'intake',
    riskLevel: input.riskLevel,
    privacyLevel: input.privacyLevel,
    moduleVersion: HEALTH_FLOW_MODULE_VERSION,
    payload: input.payload,
  });
  return adapter.updateHealthFlowStatus(draft.id, {
    status: 'awaiting_user_approval',
    stage: 'intake_complete',
    riskLevel: input.riskLevel,
    privacyLevel: input.privacyLevel,
    payload: input.payload,
  });
}

export async function createAskSafetyBlockedFlow(input: {
  title?: string;
  privacyLevel: FlowPrivacyLevel;
  payload: Record<string, unknown>;
}): Promise<HealthFlow> {
  const adapter = getDataAdapter();
  const draft = await adapter.createDraftHealthFlow({
    title: input.title ?? 'Safety escalation',
    stage: 'safety_check',
    riskLevel: 'urgent',
    privacyLevel: input.privacyLevel,
    moduleVersion: HEALTH_FLOW_MODULE_VERSION,
    payload: input.payload,
  });
  return adapter.updateHealthFlowStatus(draft.id, {
    status: 'safety_blocked',
    stage: 'safety_escalation',
    riskLevel: 'urgent',
    payload: input.payload,
  });
}

export async function activateHealthFlowWithAction(input: {
  flowId: string;
  instruction: string;
  reason?: string;
  dueAt?: string;
  category?: string;
  safetyLevel?: FlowRiskLevel;
  actionId?: string;
  privacyLevel?: FlowPrivacyLevel;
}): Promise<{ flow: HealthFlow; action: FlowAction }> {
  const adapter = getDataAdapter();
  const existing = await adapter.getHealthFlow(input.flowId);
  const riskLevel = input.safetyLevel ?? existing?.riskLevel ?? 'low';
  const privacyLevel = input.privacyLevel ?? existing?.privacyLevel ?? 'private';

  const flow = await adapter.updateHealthFlowStatus(input.flowId, {
    status: 'active',
    stage: 'action_active',
    riskLevel,
    privacyLevel,
  });

  const action = await adapter.createFlowAction({
    flowId: input.flowId,
    status: 'pending',
    stage: 'next_action',
    riskLevel,
    privacyLevel,
    moduleVersion: HEALTH_FLOW_MODULE_VERSION,
    actionOrder: 0,
    payload: {
      instruction: input.instruction,
      reason: input.reason,
      dueAt: input.dueAt,
      category: input.category,
      actionId: input.actionId,
    },
  });

  return { flow, action };
}

export async function persistFlowActionDone(
  flowActionId: string,
  state: Pick<NextActionState, 'currentAction' | 'reason' | 'category'>,
): Promise<FlowAction> {
  return getDataAdapter().updateFlowActionStatus(flowActionId, {
    status: 'done',
    payload: {
      instruction: state.currentAction,
      reason: state.reason,
      category: state.category,
      responseReason: 'done',
      completedAt: new Date().toISOString(),
    },
  });
}

export async function persistFlowActionBlocked(input: {
  flowId: string;
  flowActionId: string;
  reason: HealthBlockedReason;
  state: Pick<NextActionState, 'currentAction' | 'reason' | 'category'>;
}): Promise<{ action: FlowAction; blocker: FlowBlocker }> {
  const adapter = getDataAdapter();
  const notesSummary = blockedReasonLabel(input.reason) ?? input.reason;
  const severity = BLOCKER_SEVERITY[input.reason];

  const action = await adapter.updateFlowActionStatus(input.flowActionId, {
    status: 'blocked',
    payload: {
      instruction: input.state.currentAction,
      reason: input.state.reason,
      category: input.state.category,
      responseReason: input.reason,
      notesSummary,
    },
  });

  const blocker = await adapter.createFlowBlocker({
    flowId: input.flowId,
    blockerType: input.reason,
    status: 'active',
    stage: 'blocked',
    riskLevel: severity,
    payload: {
      notesSummary,
      flowActionId: input.flowActionId,
      severity,
    },
  });

  await adapter.updateHealthFlowStatus(input.flowId, { stage: 'blocked' });
  return { action, blocker };
}

export async function persistFlowActionAdjusted(input: {
  flowId: string;
  flowActionId: string;
  option: AdjustOption;
  state: Pick<NextActionState, 'currentAction' | 'reason' | 'category'>;
}): Promise<FlowAction> {
  const adapter = getDataAdapter();
  const adjustment = adjustedOptionLabel(input.option) ?? input.option;
  const newInstruction = ADJUSTED_ACTIONS[input.option] ?? input.state.currentAction;

  const action = await adapter.updateFlowActionStatus(input.flowActionId, {
    status: 'adjusted',
    payload: {
      instruction: newInstruction,
      reason: input.state.reason,
      category: input.state.category,
      responseReason: input.option,
      adjustment,
      previousInstruction: input.state.currentAction,
    },
  });

  await adapter.updateHealthFlowStatus(input.flowId, { stage: 'adjusted' });
  return action;
}

export function shouldPersistHealthFlowLifecycle(state: NextActionState | null): state is NextActionState & {
  healthFlowId: string;
  flowActionId: string;
} {
  return Boolean(state?.healthFlowId && state?.flowActionId);
}
