import type { AskIntakeData } from '../../types/askIntake';
import { collectIntakeSafetyText } from '../../utils/askIntakeRules';

export type FlowProposalPrivacyLevel = 'standard' | 'sensitive';

export type FlowProposalRequestBody = {
  askIntakeSessionId?: string;
  guideResultId?: string;
  concernSummary?: {
    concernType: string;
    timeline: string;
    goal?: string;
  };
  safetyResult?: {
    safetyCheckText: string;
  };
  proposedAction?: {
    title: string;
    instruction: string;
    reason: string;
    category: string;
    safetyLevel: 'normal' | 'caution' | 'urgent';
  };
  privacyLevel?: FlowProposalPrivacyLevel;
};

export type FlowProposalProposedAction = {
  title: string;
  instruction: string;
  reason: string;
  category: string;
  safetyLevel: 'normal' | 'caution' | 'urgent';
};

export type FlowProposalResponseBody = {
  ok: boolean;
  mode: 'flow_proposal';
  safety: {
    allowed: boolean;
    riskLevel?: string;
    blockedReason?: string;
  };
  flowId?: string;
  flowStatus?: string;
  proposedAction?: FlowProposalProposedAction;
  escalation?: {
    title: string;
    body: string;
    redFlagCategories: string[];
  };
  error?: {
    code: string;
    message: string;
  };
};

export type FlowProposalSuccess = {
  flowId: string;
  flowStatus: string;
  proposedAction: FlowProposalProposedAction;
  riskLevel?: string;
  privacyLevel?: FlowProposalPrivacyLevel;
};

export type FlowProposalClientResult =
  | { ok: true; status: 200; data: FlowProposalSuccess }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      data?: FlowProposalResponseBody;
    };

const FLOW_PROPOSAL_PATH = '/api/ai/flow-proposal';

function mapConcernTypeToCategory(concernType: string): string {
  switch (concernType) {
    case 'Physical symptom':
      return 'track';
    case 'Mood or stress':
      return 'stabilize';
    case 'Sleep or energy':
      return 'track';
    case 'Medication question':
      return 'prepare';
    case 'Preparing for a clinician':
      return 'prepare';
    default:
      return 'track';
  }
}

export function mapAskPrivacyForServer(sensitiveMode: boolean): FlowProposalPrivacyLevel {
  return sensitiveMode ? 'sensitive' : 'standard';
}

export function buildAskFlowProposalFromIntake(
  intake: AskIntakeData,
  input: {
    privacyLevel: FlowProposalPrivacyLevel;
    nextSafeStep: string;
  },
): FlowProposalRequestBody {
  return {
    privacyLevel: input.privacyLevel,
    concernSummary: {
      concernType: intake.concernType.trim() || 'Not sure',
      timeline: intake.timeline.trim() || 'Unknown timeline',
      goal: intake.goal.trim() || 'One next step',
    },
    safetyResult: {
      safetyCheckText: collectIntakeSafetyText(intake),
    },
    proposedAction: {
      title: 'Your next safe step',
      instruction: input.nextSafeStep,
      reason: 'One safe, simple next action for now — organized, not a diagnosis.',
      category: mapConcernTypeToCategory(intake.concernType.trim() || 'Not sure'),
      safetyLevel: 'normal',
    },
  };
}

function parseFlowProposalResponse(status: number, body: FlowProposalResponseBody): FlowProposalClientResult {
  if (status === 200 && body.ok && body.proposedAction && body.flowId) {
    return {
      ok: true,
      status: 200,
      data: {
        flowId: body.flowId,
        flowStatus: body.flowStatus ?? 'awaiting_user_approval',
        proposedAction: body.proposedAction,
        riskLevel: body.safety?.riskLevel,
      },
    };
  }

  return {
    ok: false,
    status,
    code: body.error?.code ?? 'request_failed',
    message: body.error?.message ?? 'Could not prepare your next step.',
    data: body,
  };
}

export async function postFlowProposal(body: FlowProposalRequestBody): Promise<FlowProposalClientResult> {
  try {
    const response = await fetch(FLOW_PROPOSAL_PATH, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const parsed = (await response.json()) as FlowProposalResponseBody;
    return parseFlowProposalResponse(response.status, parsed);
  } catch {
    return {
      ok: false,
      status: 0,
      code: 'network_error',
      message: 'Could not reach the planning service. Please try again soon.',
    };
  }
}

export type AIIntakeRequestBody = {
  concernText: string;
  privacyLevel?: FlowProposalPrivacyLevel;
};

export type AIIntakeResponseBody = {
  ok: boolean;
  error?: { code: string; message: string };
};

export type AIIntakeClientResult =
  | { ok: true; status: number; data: AIIntakeResponseBody }
  | { ok: false; status: number; code: string; message: string };

export async function postAIIntake(body: AIIntakeRequestBody): Promise<AIIntakeClientResult> {
  try {
    const response = await fetch('/api/ai/intake', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const parsed = (await response.json()) as AIIntakeResponseBody;
    if (response.ok && parsed.ok) {
      return { ok: true, status: response.status, data: parsed };
    }
    return {
      ok: false,
      status: response.status,
      code: parsed.error?.code ?? 'request_failed',
      message: parsed.error?.message ?? 'Could not process intake.',
    };
  } catch {
    return {
      ok: false,
      status: 0,
      code: 'network_error',
      message: 'Could not reach the intake service. Please try again soon.',
    };
  }
}
