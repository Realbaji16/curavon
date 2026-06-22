import type { HealthModuleId } from './modules/moduleIds';
import type {
  HealthModule,
  HealthModuleRiskLevel,
  ModuleAllowedAction,
} from './modules/moduleTypes';

export type IntelligenceRiskLevel = HealthModuleRiskLevel;

export type IntelligenceSafety = {
  allowed: boolean;
  riskLevel: IntelligenceRiskLevel;
  blockedReason?: string;
};

export type SelectedModuleMatch = {
  moduleId: HealthModuleId;
  /** Relative routing confidence from entry triggers (0–1). */
  confidence: number;
  matchedTriggers: string[];
};

export type IntelligenceRedFlagHit = {
  id: string;
  label: string;
  severity: 'watch' | 'urgent' | 'emergency';
  sourceModuleId?: HealthModuleId;
  matchedTerm?: string;
};

export type IntelligenceQuestion = {
  id: string;
  prompt: string;
  source: 'module_required' | 'module_conditional' | 'ai_generated';
  moduleId?: HealthModuleId;
};

export type IntelligenceSummaryPreview = {
  title: string;
  fields: Array<{
    fieldId: string;
    label: string;
    value: string;
  }>;
  footer?: string;
};

export type HealthIntelligenceResult = {
  message: string;
  normalizedTerms: string[];
  selectedModules: SelectedModuleMatch[];
  primaryModuleId: HealthModuleId | null;
  riskLevel: IntelligenceRiskLevel;
  redFlags: IntelligenceRedFlagHit[];
  questions: IntelligenceQuestion[];
  allowedActions: ModuleAllowedAction[];
  nextStep: string;
  summaryPreview: IntelligenceSummaryPreview;
  safety: IntelligenceSafety;
};

export type HealthIntelligenceInput = {
  concernText: string;
  countryContext?: string;
  locale?: string;
};

/** Registry shape for loading approved modules into the intelligence layer. */
export type HealthModuleRegistry = Partial<Record<HealthModuleId, HealthModule>>;
