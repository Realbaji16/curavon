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
  context?: unknown;
};
