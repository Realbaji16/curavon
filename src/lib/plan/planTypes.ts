import type { AskHistoryEntry } from '../../types/askIntake';
import type { RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import type { HealthSnapshot } from '../../types/healthSnapshot';

export type PlanCategory = 'stabilize' | 'track' | 'prepare' | 'reduce_friction' | 'escalate';

export type PlanSafetyLevel = 'normal' | 'caution' | 'urgent';

export interface PlanCandidate {
  id: string;
  title: string;
  actionText: string;
  category: PlanCategory;
  safetyLevel: PlanSafetyLevel;
  whyCandidateFits: string;
  whenToUse: string;
  relatedGuide?: string;
  disallowedIf?: string[];
}

export interface PlanEngineInput {
  snapshot: HealthSnapshot | null;
  intakeResult?: {
    concern?: string;
    concernType?: string;
    redFlags?: string[];
  } | null;
  latestCheckIn?: DailyCheckIn | null;
  askHistory?: AskHistoryEntry[];
  guideHistory?: Array<{ id: string; title: string; completedAt?: string }>;
  nextActionState?: NextActionState | null;
  redFlagLogs?: RedFlagLog[];
  profile?: HealthProfile | null;
  currentConcern?: string;
  sourceSignals?: string[];
}

export interface PlanReasoningResult {
  selectedCandidateId: string;
  reasoning: string;
  whyNotOthers: string;
  followUpPrompt: string;
  watchFor: string;
  confidence: 'low' | 'medium' | 'high';
  fallbackUsed: boolean;
  aiUsed: boolean;
}

export interface PlanAction {
  id: string;
  title: string;
  actionText: string;
  reason: string;
  category: PlanCategory;
  safetyLevel: PlanSafetyLevel;
  relatedGuide?: string;
  followUpPrompt: string;
  watchFor: string;
  sourceSignals: string[];
  selectedBy: 'ai' | 'rules';
  aiReasoned: boolean;
  fallbackUsed: boolean;
}

export interface PlanEngineResult {
  action: PlanAction;
  reasoningResult: PlanReasoningResult;
  candidates: PlanCandidate[];
  safetyOverride: boolean;
}
