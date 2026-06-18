import { detectUrgentConcern } from '../../../utils/healthSafety';
import type { AIAllowedTask } from './aiPolicyTypes';

const ALLOWED_TASKS: AIAllowedTask[] = [
  'intake_structuring',
  'next_action_reasoning',
  'doctor_summary',
  'memory_compression',
  'followup_note_summary',
];

const ALLOWED_SOURCES = ['ask', 'today', 'guides', 'doctor_summary', 'followup', 'memory'] as const;

export function validateCompressedContext(
  context: Record<string, unknown> | undefined,
): { valid: boolean; reason?: string } {
  if (!context) return { valid: true };
  if (context.rawChatHistory || context.fullConversation || context.messages) {
    return { valid: false, reason: 'raw_chat_not_allowed' };
  }
  if (context.compressedContextOnly === false) {
    return { valid: false, reason: 'compressed_context_required' };
  }
  return { valid: true };
}

export function validateTaskAuthorization(task: string): boolean {
  return ALLOWED_TASKS.includes(task as AIAllowedTask);
}

export function validateSourceAuthorization(source: string): boolean {
  return ALLOWED_SOURCES.includes(source as (typeof ALLOWED_SOURCES)[number]);
}

export function safetyOverrideRequired(input: string, safetyLevel: 'normal' | 'caution' | 'urgent') {
  if (safetyLevel === 'urgent') return true;
  return detectUrgentConcern(input).hasUrgent;
}

export function warnIfKernelCalledWithoutGovernance(governanceMeta?: Record<string, unknown>) {
  if (!governanceMeta?.policyDecisionId || !governanceMeta?.requestId) {
    console.warn('[Curavon AI Governance] AI Kernel called without governance metadata.');
  }
}
