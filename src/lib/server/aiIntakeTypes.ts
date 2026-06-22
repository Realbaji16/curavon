import type { HealthIntelligenceResult } from '../health-intelligence/types';

export type AIIntakeRiskLevel = 'low' | 'medium' | 'high' | 'urgent';

export type AIIntakeSafety = {
  allowed: boolean;
  riskLevel: AIIntakeRiskLevel;
  blockedReason?: string;
};

export type AIIntakeResult = {
  message: string;
  questions: string[];
  nextStep: string;
  intelligence?: HealthIntelligenceResult;
};

export type AIIntakeError = {
  code: string;
  message: string;
};

export type AIIntakeResponse = {
  ok: boolean;
  mode: 'intake';
  safety: AIIntakeSafety;
  result?: AIIntakeResult;
  error?: AIIntakeError;
};

export type IntakeRequestBody = {
  input?: unknown;
  /** @deprecated Use `input` — kept for backward compatibility. */
  concernText?: unknown;
  context?: unknown;
};
