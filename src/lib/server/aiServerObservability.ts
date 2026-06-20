import { getDataAdapter } from '../data/getDataAdapter';
import { HEALTH_FLOW_MODULE_VERSION } from '../data/healthFlowService';

export const SERVER_AI_MODULE_VERSION = 'server_ai_routes_v1';

export async function recordServerAgentEvent(input: {
  flowId?: string | null;
  eventType: string;
  outputType: string;
  safetyFlag: boolean;
  toolsCalled: string[];
  moduleVersion?: string;
}): Promise<void> {
  await getDataAdapter().createAgentEvent({
    flowId: input.flowId ?? null,
    eventType: input.eventType,
    source: 'server_ai_route',
    summary: `${input.eventType}:${input.outputType}`,
    status: 'completed',
    payload: {
      output_type: input.outputType,
      safety_flag: input.safetyFlag,
      tools_called: input.toolsCalled,
      module_version: input.moduleVersion ?? SERVER_AI_MODULE_VERSION,
    },
  });
}

export async function recordFlowProposalEvent(input: {
  flowId?: string | null;
  safetyFlag: boolean;
  outputType: 'draft_flow' | 'safety_escalation' | 'error';
}): Promise<void> {
  await recordServerAgentEvent({
    flowId: input.flowId,
    eventType: 'ai_flow_proposal',
    outputType: input.outputType,
    safetyFlag: input.safetyFlag,
    toolsCalled: ['detect_red_flags', 'health_flow_adapter'],
    moduleVersion: HEALTH_FLOW_MODULE_VERSION,
  });
}

export async function recordSummaryEvent(input: {
  flowId: string;
  outputType: 'summary_draft' | 'summary_item' | 'error';
  safetyFlag: boolean;
}): Promise<void> {
  await recordServerAgentEvent({
    flowId: input.flowId,
    eventType: 'ai_doctor_summary',
    outputType: input.outputType,
    safetyFlag: input.safetyFlag,
    toolsCalled: ['health_flow_adapter', 'doctor_summary_adapter'],
    moduleVersion: SERVER_AI_MODULE_VERSION,
  });
}
