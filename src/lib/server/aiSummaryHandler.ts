import { getDataAdapter } from '../data/getDataAdapter';
import {
  defaultSafetyForError,
  parseSummaryBody,
  requireAuthenticatedSupabaseUser,
  resolveServerAIIntakeMode,
} from './aiRouteGuards';
import { recordSummaryEvent } from './aiServerObservability';
import type { SummaryResponse } from './aiServerTypes';
import { SUMMARY_DISCLAIMER } from './aiServerTypes';
import { buildDeterministicFlowSummary } from './flowSummaryBuilder';
import { createSupabaseServerClient } from '../supabase/serverClient';
import { withServerDataAccess } from './serverDataContext';

function summaryError(
  status: number,
  code: string,
  message: string,
): { status: number; body: SummaryResponse } {
  return {
    status,
    body: {
      ok: false,
      mode: 'summary',
      safety: defaultSafetyForError(),
      disclaimer: SUMMARY_DISCLAIMER,
      aiUsed: false,
      error: { code, message },
    },
  };
}

export async function handleAISummaryPost(request: Request): Promise<{
  status: number;
  body: SummaryResponse;
}> {
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return summaryError(auth.status, auth.code, auth.message);
  }

  const serverClient = await createSupabaseServerClient();
  if (!serverClient) {
    return summaryError(401, 'unauthenticated', 'Authentication required.');
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return summaryError(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const body = parseSummaryBody(parsedBody);
  if (!body.ok) {
    return summaryError(body.status, body.code, body.message);
  }

  return withServerDataAccess(auth.userId, serverClient, async () => {
    const adapter = getDataAdapter();
    const flow = await adapter.getHealthFlow(body.data.healthFlowId);
    if (!flow) {
      return summaryError(404, 'flow_not_found', 'Health flow was not found for this account.');
    }

    const aiMode = resolveServerAIIntakeMode();
    if (aiMode === 'provider_unavailable') {
      return summaryError(503, 'ai_unavailable', 'AI provider is temporarily unavailable.');
    }

    const [actions, blockers, redFlagLogs] = await Promise.all([
      adapter.listFlowActions(flow.id),
      adapter.listFlowBlockers(flow.id),
      adapter.listRedFlagLogs(),
    ]);

    const linkedRedFlags = redFlagLogs.filter((log) => {
      const intakeSessionId = flow.payload?.intakeSessionId;
      return typeof intakeSessionId === 'string'
        ? log.source.includes('Ask') || log.source.includes('Flow Proposal')
        : true;
    });

    const { sections, summaryText, questionsForClinician } = buildDeterministicFlowSummary({
      flow,
      actions,
      blockers,
      redFlagLogs: linkedRedFlags.slice(0, 5),
    });

    const now = new Date().toISOString();
    const draftId = `flow-summary-${flow.id}`;
    await adapter.upsertDoctorSummaryDraft({
      id: draftId,
      title: `Doctor-ready summary — ${flow.title ?? 'Health flow'}`,
      dateRange: 'Current health flow',
      includedItemIds: [],
      summaryText,
      questionsForClinician,
      createdAt: now,
      updatedAt: now,
    });

    const item = await adapter.createDoctorSummaryItem({
      id: crypto.randomUUID(),
      type: 'ask_intake',
      title: `Flow summary — ${flow.title ?? 'Health flow'}`,
      source: 'Ask Curavon',
      content: summaryText,
      tags: ['flow_summary', 'server_generated'],
      severity: flow.riskLevel === 'urgent' ? 'urgent' : flow.riskLevel === 'medium' ? 'attention' : 'normal',
      createdAt: now,
      includedInSummary: true,
    });

    await recordSummaryEvent({
      flowId: flow.id,
      outputType: 'summary_draft',
      safetyFlag: flow.riskLevel === 'urgent' || flow.status === 'safety_blocked',
    });

    return {
      status: 200,
      body: {
        ok: true,
        mode: 'summary',
        safety: {
          allowed: true,
          riskLevel: flow.riskLevel === 'urgent' ? 'urgent' : flow.riskLevel === 'medium' ? 'medium' : 'low',
        },
        healthFlowId: flow.id,
        draftId,
        itemId: item.id,
        sections,
        disclaimer: SUMMARY_DISCLAIMER,
        aiUsed: false,
      },
    };
  });
}
