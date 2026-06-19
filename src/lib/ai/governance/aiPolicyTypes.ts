export type AIAllowedTask =
  | 'intake_structuring'
  | 'next_action_reasoning'
  | 'next_action_synthesis'
  | 'doctor_summary'
  | 'memory_compression'
  | 'followup_note_summary';

export type AIDisallowedTask =
  | 'diagnosis'
  | 'medication_instruction'
  | 'emergency_reassurance'
  | 'treatment_plan'
  | 'lab_interpretation'
  | 'autonomous_followup'
  | 'raw_chat_companion';

export type AIBlockReason =
  | 'urgent_safety'
  | 'session_limit_reached'
  | 'request_limit_reached'
  | 'cache_available'
  | 'rule_based_sufficient'
  | 'missing_api_key'
  | 'invalid_context'
  | 'medical_boundary'
  | 'duplicate_request'
  | 'user_privacy_limit';

export interface AIPolicyDecision {
  allowed: boolean;
  task: AIAllowedTask | AIDisallowedTask;
  blockReason?: AIBlockReason;
  reason: string;
  maxTokens: number;
  requiresCompressedContext: boolean;
  requiresPostValidation: boolean;
  allowMemoryContext: boolean;
  allowFollowUpContext: boolean;
  allowDoctorSummaryContext: boolean;
}
