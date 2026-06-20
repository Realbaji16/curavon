import { detectRedFlags } from '../health/redFlags';
import { getDataAdapter } from '../data/getDataAdapter';
import {
  buildAskDraftFlowPayload,
  buildAskSafetyBlockedPayload,
  createAskDraftHealthFlow,
  createAskSafetyBlockedFlow,
  mapPlanSafetyToRiskLevel,
} from '../data/healthFlowService';
import type { FlowRiskLevel } from '../data/dataTypes';
import {
  defaultSafetyForError,
  parseFlowProposalBody,
  requireAuthenticatedSupabaseUser,
  resolveServerAIIntakeMode,
} from './aiRouteGuards';
import { recordFlowProposalEvent } from './aiServerObservability';
import { trackSafeEvent } from '../observability/safeAnalytics';
import type {
  FlowProposalResponse,
  ParsedFlowProposalInput,
  ProposedActionPreview,
} from './aiServerTypes';
import { createSupabaseServerClient } from '../supabase/serverClient';
import { withServerDataAccess } from './serverDataContext';
import { mapPrivacyLevelInput, mapRiskLevelFromSafety } from './flowSummaryBuilder';

function flowProposalError(
  status: number,
  code: string,
  message: string,
  safety = defaultSafetyForError(),
): { status: number; body: FlowProposalResponse } {
  return {
    status,
    body: {
      ok: false,
      mode: 'flow_proposal',
      safety,
      error: { code, message },
    },
  };
}

function buildMockProposedAction(input: ParsedFlowProposalInput): ProposedActionPreview {
  if (input.kind === 'structured') {
    return input.proposedAction;
  }

  return {
    title: 'One safe next step',
    instruction: 'Write down when symptoms started, what changed, and what feels most important.',
    reason: 'Organizing notes first helps clarify next steps — not a diagnosis.',
    category: 'track',
    safetyLevel: 'normal',
  };
}

async function resolveSafetyCheckText(input: ParsedFlowProposalInput): Promise<{
  safetyText: string;
  concernType: string;
  timeline: string;
  goal?: string;
  title?: string;
  privacyLevel?: 'standard' | 'sensitive' | 'private' | 'care_circle_later' | 'shared';
  sourceRef?: { askIntakeSessionId?: string; guideResultId?: string };
}> {
  const adapter = getDataAdapter();

  if (input.kind === 'structured') {
    return {
      safetyText: input.safetyCheckText,
      concernType: input.concernSummary.concernType,
      timeline: input.concernSummary.timeline,
      goal: input.concernSummary.goal,
      title: input.proposedAction.title,
    };
  }

  if (input.kind === 'session') {
    const session = await adapter.getAskIntakeSession(input.askIntakeSessionId);
    if (!session) {
      throw new Error('session_not_found');
    }
    const payload = session.payload ?? {};
    const safetyText =
      (typeof payload.safetyCheckText === 'string' && payload.safetyCheckText) ||
      (typeof payload.concernType === 'string' ? payload.concernType : '') ||
      session.stage;
    return {
      safetyText,
      concernType: typeof payload.concernType === 'string' ? payload.concernType : 'Not sure',
      timeline: typeof payload.timeline === 'string' ? payload.timeline : 'Unknown timeline',
      goal: typeof payload.goal === 'string' ? payload.goal : undefined,
      title: typeof payload.title === 'string' ? payload.title : 'Ask Curavon flow',
      privacyLevel: session.privacyLevel === 'sensitive' ? 'sensitive' : input.privacyLevel,
      sourceRef: { askIntakeSessionId: input.askIntakeSessionId },
    };
  }

  const guide = await adapter.getGuideResult(input.guideResultId);
  if (!guide) {
    throw new Error('guide_not_found');
  }
  return {
    safetyText: `${guide.resultSummary} ${guide.safeNextStep}`,
    concernType: guide.guideTitle,
    timeline: guide.completedAt,
    title: guide.guideTitle,
    sourceRef: { guideResultId: input.guideResultId },
  };
}

export async function handleAIFlowProposalPost(request: Request): Promise<{
  status: number;
  body: FlowProposalResponse;
}> {
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return flowProposalError(auth.status, auth.code, auth.message);
  }

  const serverClient = await createSupabaseServerClient();
  if (!serverClient) {
    return flowProposalError(401, 'unauthenticated', 'Authentication required.');
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return flowProposalError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const body = parseFlowProposalBody(parsedBody);
  if (!body.ok) {
    return flowProposalError(body.status, body.code, body.message);
  }

  return withServerDataAccess(auth.userId, serverClient, async () => {
    let resolved;
    try {
      resolved = await resolveSafetyCheckText(body.data);
    } catch (error) {
      const code = error instanceof Error && error.message === 'session_not_found' ? 'session_not_found' : 'guide_not_found';
      return flowProposalError(404, code, 'Referenced intake or guide record was not found.');
    }

    const redFlags = detectRedFlags(resolved.safetyText);
    const privacyLevel = mapPrivacyLevelInput(resolved.privacyLevel ?? body.data.privacyLevel);

    if (redFlags.hasUrgent) {
      const safetyFlow = await createAskSafetyBlockedFlow({
        title: resolved.title ?? 'Safety escalation',
        privacyLevel,
        payload: buildAskSafetyBlockedPayload({
          redFlagCategories: redFlags.categories,
          selfHarm: redFlags.selfHarm,
          immediateSafety: redFlags.immediateSafety,
          intakeSessionId:
            body.data.kind === 'session' ? body.data.askIntakeSessionId : resolved.sourceRef?.askIntakeSessionId,
        }),
      });

      await getDataAdapter().createRedFlagLog({
        id: crypto.randomUUID(),
        source: 'AI Flow Proposal',
        matchedConcern: redFlags.matches[0]?.label ?? 'urgent concern',
        userText: redFlags.categories.join(', '),
        guidanceShown: redFlags.body,
        createdAt: new Date().toISOString(),
      });

      await recordFlowProposalEvent({
        flowId: safetyFlow.id,
        safetyFlag: true,
        outputType: 'safety_escalation',
        privacyLevel,
        riskLevel: 'urgent',
      });

      trackSafeEvent('ai_route_blocked', {
        route_name: 'ai_flow_proposal',
        error_code: 'safety_blocked',
        safety_flag: true,
        risk_level: 'urgent',
        flow_id: safetyFlow.id,
        privacy_level: privacyLevel,
      });
      trackSafeEvent('unsafe_response_blocked', {
        route_name: 'ai_flow_proposal',
        error_code: 'safety_blocked',
        safety_flag: true,
        risk_level: 'urgent',
      });

      return {
        status: 422,
        body: {
          ok: false,
          mode: 'flow_proposal',
          safety: {
            allowed: false,
            riskLevel: 'urgent',
            blockedReason: redFlags.selfHarm ? 'self_harm_language' : 'urgent_language_detected',
          },
          flowId: safetyFlow.id,
          flowStatus: safetyFlow.status,
          escalation: {
            title: redFlags.title,
            body: redFlags.body,
            redFlagCategories: redFlags.categories,
          },
          error: {
            code: 'safety_blocked',
            message:
              'This concern may need urgent support. Use local emergency services or a clinician now.',
          },
        },
      };
    }

    const aiMode = resolveServerAIIntakeMode();
    if (aiMode === 'provider_unavailable') {
      return flowProposalError(
        503,
        'ai_unavailable',
        'AI provider is temporarily unavailable.',
        { allowed: true, riskLevel: 'low' },
      );
    }

    const proposedAction = buildMockProposedAction(body.data);
    const riskLevel: FlowRiskLevel =
      body.data.kind === 'structured'
        ? mapRiskLevelFromSafety(body.data.proposedAction.safetyLevel)
        : mapPlanSafetyToRiskLevel(proposedAction.safetyLevel);

    const draftFlow = await createAskDraftHealthFlow({
      title: proposedAction.title,
      riskLevel,
      privacyLevel,
      payload: buildAskDraftFlowPayload({
        concernType: resolved.concernType,
        goal: resolved.goal ?? 'One next step',
        timeline: resolved.timeline,
        intakeSessionId: body.data.kind === 'session' ? body.data.askIntakeSessionId : undefined,
        askHistoryEntryId: null,
        actionPreview: {
          actionId: `proposal-${draftFlowIdSuffix()}`,
          title: proposedAction.title,
          category: proposedAction.category,
          safetyLevel: proposedAction.safetyLevel,
        },
      }),
    });

    await recordFlowProposalEvent({
      flowId: draftFlow.id,
      safetyFlag: false,
      outputType: 'draft_flow',
      privacyLevel,
      riskLevel,
    });

    trackSafeEvent('ai_route_called', {
      route_name: 'ai_flow_proposal',
      status: 'completed',
      safety_flag: false,
      risk_level: riskLevel,
      flow_id: draftFlow.id,
      privacy_level: privacyLevel,
    });
    trackSafeEvent('flow_created', {
      flow_id: draftFlow.id,
      privacy_level: privacyLevel,
      risk_level: riskLevel,
      status: 'awaiting_user_approval',
      route_name: 'ai_flow_proposal',
    });

    return {
      status: 200,
      body: {
        ok: true,
        mode: 'flow_proposal',
        safety: { allowed: true, riskLevel: riskLevel === 'urgent' ? 'urgent' : riskLevel === 'medium' ? 'medium' : 'low' },
        flowId: draftFlow.id,
        flowStatus: draftFlow.status,
        proposedAction,
      },
    };
  });
}

function draftFlowIdSuffix(): string {
  return `${Date.now()}`;
}
