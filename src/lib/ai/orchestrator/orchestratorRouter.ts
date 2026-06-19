import type { AIRequest, OrchestratorRoute } from './orchestratorTypes';

export function routeAIRequest(request: AIRequest): OrchestratorRoute {
  const hint = request.stageHint;
  if (hint === 'ask_input') return { requestType: 'ask_input', stage: 'intake' };
  if (hint === 'plan_synthesis') return { requestType: 'plan_generation', stage: 'plan_synthesis' };
  if (hint === 'plan_generation') return { requestType: 'plan_generation', stage: 'plan_reasoning' };
  if (hint === 'followup') return { requestType: 'followup', stage: 'followup_analysis' };
  if (hint === 'summary') return { requestType: 'summary', stage: 'summary_generation' };
  if (hint === 'guides') return { requestType: 'guides', stage: 'plan_reasoning' };
  if (hint === 'intake') return { requestType: 'ask_input', stage: 'intake' };
  if (hint === 'plan_reasoning') return { requestType: 'plan_generation', stage: 'plan_reasoning' };
  if (hint === 'summary_generation') return { requestType: 'summary', stage: 'summary_generation' };
  if (hint === 'followup_analysis') return { requestType: 'followup', stage: 'followup_analysis' };

  if (request.source === 'ask') return { requestType: 'ask_input', stage: 'intake' };
  if (request.source === 'guides') return { requestType: 'guides', stage: 'plan_reasoning' };
  return { requestType: 'plan_generation', stage: 'plan_reasoning' };
}
