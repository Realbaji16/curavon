import type { AIIntakeRiskLevel, AIIntakeSafety } from './aiIntakeTypes';
import type { FlowProposalIntelligenceContext } from '../health-intelligence/services/intelligenceContextSerializer';

export type { FlowProposalIntelligenceContext };

export type AIServerMode = 'flow_proposal' | 'summary';

export type AIServerError = {
  code: string;
  message: string;
};

export type ProposedActionPreview = {
  title: string;
  instruction: string;
  reason: string;
  category: string;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  /** Present when action was derived from Phase 2 intelligence context. */
  sourceActionId?: string;
};

export type FlowProposalResponse = {
  ok: boolean;
  mode: 'flow_proposal';
  safety: AIIntakeSafety;
  flowId?: string;
  flowStatus?: string;
  proposedAction?: ProposedActionPreview;
  escalation?: {
    title: string;
    body: string;
    redFlagCategories: string[];
  };
  error?: AIServerError;
};

export type FlowSummarySection = {
  heading: string;
  lines: string[];
};

export type SummaryResponse = {
  ok: boolean;
  mode: 'summary';
  safety: AIIntakeSafety;
  healthFlowId?: string;
  draftId?: string;
  itemId?: string;
  sections?: FlowSummarySection[];
  disclaimer: string;
  aiUsed: boolean;
  error?: AIServerError;
};

export type FlowProposalRequestBody = {
  askIntakeSessionId?: unknown;
  guideResultId?: unknown;
  concernSummary?: unknown;
  safetyResult?: unknown;
  proposedAction?: unknown;
  privacyLevel?: unknown;
  intelligenceContext?: unknown;
};

export type SummaryRequestBody = {
  healthFlowId?: unknown;
};

export type ParsedFlowProposalInput =
  | {
      kind: 'session';
      askIntakeSessionId: string;
      privacyLevel: 'standard' | 'sensitive';
    }
  | {
      kind: 'guide';
      guideResultId: string;
      privacyLevel: 'standard' | 'sensitive';
    }
  | {
      kind: 'structured';
      concernSummary: {
        concernType: string;
        timeline: string;
        goal?: string;
      };
      proposedAction: ProposedActionPreview;
      safetyCheckText: string;
      privacyLevel: 'standard' | 'sensitive';
      intelligenceContext?: FlowProposalIntelligenceContext;
    };

export type ParsedSummaryInput = {
  healthFlowId: string;
};

export const SUMMARY_DISCLAIMER =
  'This summary organizes your notes for clinician conversation. It is not a diagnosis, treatment plan, or emergency assessment.';

export function defaultServerSafety(riskLevel: AIIntakeRiskLevel = 'low'): AIIntakeSafety {
  return { allowed: riskLevel !== 'urgent', riskLevel };
}
