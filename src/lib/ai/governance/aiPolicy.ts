import { getAIConfig } from '../aiConfig';
import type { AIRequest } from '../orchestrator/orchestratorTypes';
import { getAIBudgetState, getTaskTokenLimit, MAX_AI_CALLS_PER_REQUEST, MAX_AI_CALLS_PER_SESSION } from './aiBudget';
import type { AIAllowedTask, AIBlockReason, AIPolicyDecision } from './aiPolicyTypes';
import { validateCompressedContext, validateSourceAuthorization } from './aiGovernanceGuards';

type EvaluateAIPolicyInput = {
  task: AIAllowedTask | string;
  source: AIRequest['source'];
  safetyLevel: AIRequest['safetyLevel'];
  userInputSummary: string;
  compressedContext: Record<string, unknown>;
  sessionState: {
    sessionAIUsageCount: number;
    requestAIUsageCount: number;
  };
  cacheStatus: {
    hasCached: boolean;
  };
  hasApiKey: boolean;
  candidateCount: number;
  userConsentState: {
    consentCompleted: boolean;
  };
};

const DISALLOWED_TASKS = new Set([
  'diagnosis',
  'medication_instruction',
  'emergency_reassurance',
  'treatment_plan',
  'lab_interpretation',
  'autonomous_followup',
  'raw_chat_companion',
]);

const ALLOWED_TASKS = new Set<AIAllowedTask>([
  'intake_structuring',
  'next_action_reasoning',
  'doctor_summary',
  'memory_compression',
  'followup_note_summary',
]);

export const AI_INTERACTION_RULES = {
  memory: 'AI may use only compressed memory snapshots.',
  followup: 'No AI for simple button outcomes; only meaningful note summarization and never during safety issues.',
  plan: 'AI reasons only over safe candidates and cannot invent actions or change safety level.',
  doctorSummary: 'AI organizes compressed notes only; no diagnosis or interpretation.',
  ask: 'AI structures intake only after safety precheck.',
} as const;

function blockedDecision(
  task: EvaluateAIPolicyInput['task'],
  blockReason: AIBlockReason,
  reason: string,
): AIPolicyDecision {
  return {
    allowed: false,
    task: task as AIPolicyDecision['task'],
    blockReason,
    reason,
    maxTokens: 0,
    requiresCompressedContext: true,
    requiresPostValidation: true,
    allowMemoryContext: false,
    allowFollowUpContext: false,
    allowDoctorSummaryContext: false,
  };
}

export function evaluateAIPolicy(input: EvaluateAIPolicyInput): AIPolicyDecision {
  const configured = getAIConfig();
  const task = input.task;

  if (input.safetyLevel === 'urgent') {
    return blockedDecision(task, 'urgent_safety', 'Urgent safety blocks AI execution.');
  }

  if (DISALLOWED_TASKS.has(task)) {
    return blockedDecision(task, 'medical_boundary', 'Task is disallowed by medical boundary policy.');
  }

  if (!ALLOWED_TASKS.has(task as AIAllowedTask)) {
    return blockedDecision(task, 'medical_boundary', 'Task is not authorized.');
  }

  if (!validateSourceAuthorization(input.source)) {
    return blockedDecision(task, 'invalid_context', 'Source is not authorized for AI.');
  }

  if (input.sessionState.sessionAIUsageCount >= MAX_AI_CALLS_PER_SESSION) {
    return blockedDecision(task, 'session_limit_reached', 'Session AI limit reached.');
  }

  if (input.sessionState.requestAIUsageCount >= MAX_AI_CALLS_PER_REQUEST) {
    return blockedDecision(task, 'request_limit_reached', 'Request AI limit reached.');
  }

  if (input.cacheStatus.hasCached) {
    return blockedDecision(task, 'cache_available', 'Cached result available.');
  }

  if (task === 'next_action_reasoning' && input.candidateCount <= 1) {
    return blockedDecision(task, 'rule_based_sufficient', 'Single-candidate plan can be handled by rules.');
  }

  if (!input.hasApiKey || !configured.enabled) {
    return blockedDecision(task, 'missing_api_key', 'API key is unavailable.');
  }

  const compressed = validateCompressedContext({
    ...input.compressedContext,
    compressedContextOnly: true,
  });
  if (!compressed.valid) {
    return blockedDecision(task, 'user_privacy_limit', 'Only compressed context is allowed.');
  }

  if (!input.userConsentState.consentCompleted) {
    return blockedDecision(task, 'user_privacy_limit', 'User consent is required for AI context usage.');
  }

  const budget = getAIBudgetState();
  if (budget.sessionCallCount >= MAX_AI_CALLS_PER_SESSION) {
    return blockedDecision(task, 'session_limit_reached', 'Session budget reached.');
  }

  return {
    allowed: true,
    task: task as AIAllowedTask,
    reason: 'Policy allows AI for this request.',
    maxTokens: getTaskTokenLimit(task as AIAllowedTask),
    requiresCompressedContext: true,
    requiresPostValidation: true,
    allowMemoryContext: task === 'memory_compression' || task === 'doctor_summary',
    allowFollowUpContext: task === 'followup_note_summary',
    allowDoctorSummaryContext: task === 'doctor_summary',
  };
}
