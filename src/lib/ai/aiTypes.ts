export type AIKernelTask =
  | 'intake'
  | 'plan_explain'
  | 'summary'
  | 'next_action_reasoning'
  | 'next_action_synthesis'
  | 'doctor_summary';

export interface AIKernelRequest {
  task: AIKernelTask;
  input: string;
  context?: Record<string, unknown>;
  source?: 'ask' | 'today' | 'guides' | 'doctor_summary' | 'followup' | 'memory';
  requestId?: string;
  policyDecisionId?: string;
  maxTokens?: number;
}

export interface AIKernelResponse {
  refinedConcern: string;
  missingQuestions: string[];
  severityGuess: 'low' | 'medium' | 'unknown';
  tags: string[];
  selectedCandidateId?: string;
  reasoning?: string;
  whyNotOthers?: string;
  followUpPrompt?: string;
  watchFor?: string;
  confidence?: 'low' | 'medium' | 'high';
  selectedMode?: 'use_existing_candidate' | 'synthesize_custom_action';
  synthesizedAction?: {
    title?: string;
    actionText?: string;
    reason?: string;
    category?: string;
    safetyLevel?: string;
    primitiveUsed?: string;
    followUpPrompt?: string;
    watchFor?: string;
  };
  safetyNotes?: string;
  summaryTitle?: string;
  mainConcerns?: string[];
  symptomTimeline?: string[];
  recentPatterns?: string[];
  actionsTried?: string[];
  questionsForClinician?: string[];
  redFlagNotes?: string[];
  medicationNotes?: string[];
  userGoals?: string[];
  footer?: string;
  fallbackUsed: boolean;
}

// Backward-compatible legacy task types for existing guarded files.
export type AIHealthTask =
  | 'intake_summary'
  | 'next_action_draft'
  | 'doctor_summary_draft'
  | 'memory_snapshot'
  | 'guide_recommendation';

export interface AIRequest {
  task: AIHealthTask;
  userInput: string;
  context?: Record<string, unknown>;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  allowedOutput: string[];
  blockedOutput: string[];
}

export interface AIResponse {
  success: boolean;
  text: string;
  structuredData?: Record<string, unknown>;
  warnings: string[];
  fallbackUsed: boolean;
}

export interface AIClientRequest {
  model: string;
  systemPrompt: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
}

export interface AIClientResponse {
  success: boolean;
  text: string;
  warnings: string[];
}
