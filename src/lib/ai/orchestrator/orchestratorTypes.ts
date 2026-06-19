export type AIStage =
  | 'idle'
  | 'intake'
  | 'plan_generation'
  | 'plan_reasoning'
  | 'plan_synthesis'
  | 'summary_generation'
  | 'followup_analysis';

export interface AIRequest {
  userInput: string;
  contextSnapshot: Record<string, unknown>;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  stageHint?: AIStage | 'ask_input' | 'plan_generation' | 'plan_synthesis' | 'followup' | 'summary' | 'guides';
  source: 'ask' | 'today' | 'guides' | 'doctor_summary' | 'followup' | 'memory';
}

export interface AIResponse {
  result: Record<string, unknown>;
  moduleUsed: 'none' | 'ai_kernel';
  cached: boolean;
  blockedBySafety: boolean;
  fallbackUsed: boolean;
}

export interface OrchestratorDecision {
  allowAI: boolean;
  selectedModule: 'none' | 'ai_kernel_intake' | 'ai_kernel_plan_reasoning' | 'ai_kernel_summary' | 'ai_kernel_followup';
  reason: string;
  blockedReason?: string;
  cachedResult?: Record<string, unknown>;
  estimatedCostImpact: 'none' | 'low';
}

export interface OrchestratorRoute {
  requestType: 'ask_input' | 'plan_generation' | 'followup' | 'summary' | 'guides';
  stage: AIStage;
}
