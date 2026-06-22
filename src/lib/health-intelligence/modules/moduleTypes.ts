import type { HealthModuleId } from './moduleIds';

export type HealthModuleRiskLevel = 'low' | 'medium' | 'medium_high' | 'high' | 'urgent';

export type HealthModuleStatus = 'draft' | 'review' | 'approved' | 'retired';

export type ModuleRedFlagSeverity = 'watch' | 'urgent' | 'emergency';

/** Rule or phrase that should escalate or block self-care within a module. */
export type ModuleRedFlag = {
  id: string;
  label: string;
  terms: string[];
  severity: ModuleRedFlagSeverity;
  escalateImmediately?: boolean;
};

/** Keyword or pattern that suggests routing into this module. */
export type ModuleEntryTrigger = {
  id: string;
  label: string;
  terms: string[];
  weight?: number;
};

export type ModuleQuestionKind = 'required' | 'conditional' | 'optional';

export type ModuleQuestion = {
  id: string;
  prompt: string;
  kind: ModuleQuestionKind;
  /** When set, ask only if this prior question id was answered affirmatively or with a given value. */
  showWhen?: string;
};

export type AIGeneratedQuestionPolicy = {
  /** Whether the module allows any AI-generated follow-up questions. */
  enabled: boolean;
  maxAdditionalQuestions: number;
  mustStayWithinModuleScope: boolean;
  forbiddenTopics: string[];
  notes?: string;
};

export type ModuleActionCategory =
  | 'stabilize'
  | 'track'
  | 'prepare'
  | 'reduce_friction'
  | 'escalate'
  | 'seek_care';

export type ModuleAllowedAction = {
  id: string;
  title: string;
  instruction: string;
  category: ModuleActionCategory;
  safetyLevel: HealthModuleRiskLevel;
};

export type ModuleSummaryFieldKind =
  | 'concern'
  | 'timeline'
  | 'symptom'
  | 'medication'
  | 'red_flag'
  | 'question_for_clinician'
  | 'user_goal'
  | 'other';

export type ModuleSummaryField = {
  id: string;
  label: string;
  kind: ModuleSummaryFieldKind;
  required: boolean;
};

export type HealthModule = {
  module_id: HealthModuleId;
  name: string;
  country_context: string;
  risk_level: HealthModuleRiskLevel;
  status: HealthModuleStatus;
  version: string;
  purpose: string;
  not_allowed: string[];
  entry_triggers: ModuleEntryTrigger[];
  overlapping_modules: HealthModuleId[];
  red_flags: ModuleRedFlag[];
  required_questions: ModuleQuestion[];
  ai_generated_question_policy: AIGeneratedQuestionPolicy;
  allowed_actions: ModuleAllowedAction[];
  summary_fields: ModuleSummaryField[];
};
