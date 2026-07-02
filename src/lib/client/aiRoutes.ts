import type { AskIntakeData } from '../../types/askIntake';
import type { HealthIntelligenceResult } from '../health-intelligence/types';
import { HEALTH_MODULE_BY_ID } from '../health-intelligence/modules/moduleCatalog';
import type { FlowProposalIntelligenceContext } from '../health-intelligence/services/intelligenceContextSerializer';
import { serializeIntelligenceForFlowProposal } from '../health-intelligence/services/intelligenceContextSerializer';
import {
  CALM_URGENT_BODY,
  CALM_URGENT_TITLE,
} from '../../utils/healthSafety';
import { collectIntakeSafetyText } from '../../utils/askIntakeRules';

export type FlowProposalPrivacyLevel = 'standard' | 'sensitive';

export type { FlowProposalIntelligenceContext };

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
  intelligenceContext?: FlowProposalIntelligenceContext;
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
    intelligenceContext?: FlowProposalIntelligenceContext | null;
  },
): FlowProposalRequestBody {
  const body: FlowProposalRequestBody = {
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

  if (input.intelligenceContext) {
    body.intelligenceContext = input.intelligenceContext;
  }

  return body;
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
  input: string;
  /** @deprecated Use `input` — sent as `input` on the wire for backward compatibility. */
  concernText?: string;
  context?: Record<string, unknown>;
  privacyLevel?: FlowProposalPrivacyLevel;
};

export type AIIntakeResponseBody = {
  ok: boolean;
  mode?: 'intake';
  safety?: {
    allowed: boolean;
    riskLevel?: string;
    blockedReason?: string;
  };
  result?: {
    message: string;
    questions: string[];
    nextStep: string;
    intelligence?: HealthIntelligenceResult;
  };
  error?: { code: string; message: string };
};

export type AIIntakeClientResult =
  | { ok: true; status: number; data: AIIntakeResponseBody }
  | { ok: false; status: number; code: string; message: string; data?: AIIntakeResponseBody };

export type AskIntakeRefinementMetadata = {
  selectedModules: string[];
  riskLevel: string;
  questionCount: number;
};

export type AskIntakeRefinement = {
  understoodSummary: string;
  selectedModuleLabels: string[];
  guidedQuestions: string[];
  metadata: AskIntakeRefinementMetadata;
};

export type ProcessedAIIntakeClientResult =
  | { kind: 'success'; refinement: AskIntakeRefinement; intelligenceContext: FlowProposalIntelligenceContext }
  | { kind: 'safety_blocked'; title: string; body: string }
  | { kind: 'skipped' };

export function buildAskIntakeRefinementMetadata(
  intelligence: HealthIntelligenceResult,
): AskIntakeRefinementMetadata {
  return {
    selectedModules: intelligence.selectedModules.map((module) => module.moduleId),
    riskLevel: intelligence.riskLevel,
    questionCount: intelligence.questions.length,
  };
}

export function buildAskIntakeUnderstoodSummary(intelligence: HealthIntelligenceResult): string {
  if (intelligence.normalizedTerms.length > 0) {
    return intelligence.normalizedTerms.slice(0, 4).join(' · ');
  }
  return intelligence.selectedModules
    .map((module) => HEALTH_MODULE_BY_ID[module.moduleId]?.name)
    .filter((name): name is string => Boolean(name))
    .slice(0, 3)
    .join(' · ');
}

export function buildAskIntakeRefinementFromIntelligence(
  intelligence: HealthIntelligenceResult,
): AskIntakeRefinement {
  const selectedModuleLabels = intelligence.selectedModules
    .map((module) => HEALTH_MODULE_BY_ID[module.moduleId]?.name)
    .filter((name): name is string => Boolean(name));

  return {
    understoodSummary: buildAskIntakeUnderstoodSummary(intelligence),
    selectedModuleLabels,
    guidedQuestions: intelligence.questions.map((question) => question.prompt).slice(0, 5),
    metadata: buildAskIntakeRefinementMetadata(intelligence),
  };
}

/** Map /api/ai/intake client result to optional Ask landing refinement (no raw provider payload). */
export function processAIIntakeClientResult(
  result: AIIntakeClientResult,
): ProcessedAIIntakeClientResult {
  if (!result.ok) {
    if (result.status === 422 && result.code === 'safety_blocked') {
      return {
        kind: 'safety_blocked',
        title: CALM_URGENT_TITLE,
        body: result.message || CALM_URGENT_BODY,
      };
    }
    return { kind: 'skipped' };
  }

  const intelligence = result.data.result?.intelligence;
  if (!intelligence) {
    return { kind: 'skipped' };
  }

  return {
    kind: 'success',
    refinement: buildAskIntakeRefinementFromIntelligence(intelligence),
    intelligenceContext: serializeIntelligenceForFlowProposal(intelligence),
  };
}

export async function postAIIntake(body: AIIntakeRequestBody): Promise<AIIntakeClientResult> {
  const input = body.input?.trim() || body.concernText?.trim() || '';
  try {
    const response = await fetch('/api/ai/intake', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input,
        context: body.context,
      }),
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
      data: parsed,
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
