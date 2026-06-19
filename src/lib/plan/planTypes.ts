import type { AskHistoryEntry } from '../../types/askIntake';
import type { RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import type { HealthSnapshot } from '../../types/healthSnapshot';

export type PlanCategory = 'stabilize' | 'track' | 'prepare' | 'reduce_friction' | 'escalate';

export type PlanSafetyLevel = 'normal' | 'caution' | 'urgent';

export type PlanActionPrimitive =
  | 'breathing pause'
  | 'reduce immediate pressure'
  | 'choose lighter task'
  | 'write one feeling'
  | 'create calm reset'
  | 'record timing'
  | 'record intensity'
  | 'record changes'
  | 'record triggers'
  | 'record what helped/worsened'
  | 'write clinician question'
  | 'prepare medication note without advice'
  | 'organize appointment notes'
  | 'collect symptom timeline'
  | 'save doctor summary item'
  | 'make action smaller'
  | 'identify blocker'
  | 'choose 2-minute version'
  | 'remove one step'
  | 'retry later with simpler step'
  | 'prepare urgent note'
  | 'contact clinician/emergency support'
  | 'return to safety guidance'
  | 'save red-flag summary';

export type PlanSynthesisMode = 'use_existing_candidate' | 'synthesize_custom_action';

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
  aiSynthesized?: boolean;
  boundaryValidated?: boolean;
  primitiveUsed?: string;
}

export interface SynthesizedPlanAction {
  id: string;
  title: string;
  actionText: string;
  reason: string;
  category: PlanCategory;
  safetyLevel: PlanSafetyLevel;
  primitiveUsed: string;
  relatedGuide?: string;
  followUpPrompt?: string;
  watchFor?: string;
  sourceSignals: string[];
  aiSynthesized: boolean;
  aiReasoned: boolean;
  fallbackUsed: boolean;
  boundaryValidated: boolean;
}

export interface PlanSynthesisInput {
  compressedSnapshot: string;
  currentConcernSummary: string;
  source: 'today' | 'ask' | 'guides' | 'followup';
  safetyLevel: PlanSafetyLevel;
  baselineCandidates: PlanCandidate[];
  recentBlockers: string[];
  followUpSignals: {
    recentHelped: number;
    recentBlocked: number;
    recentWorse: number;
    repeatedBlocked: boolean;
    repeatedWorse: boolean;
  };
  guideActivity: {
    recentGuideTitles: string[];
    recentGuideCount: number;
  };
  profileContext: {
    goalCount: number;
    hasMedications: boolean;
    hasConditions: boolean;
    primaryGoalsSummary: string;
  };
  allowedCategories: PlanCategory[];
  allowedPrimitives: PlanActionPrimitive[];
  disallowedActions: string[];
  sourceSignals: string[];
  medicationConcern: boolean;
}

export interface PlanSynthesisResult {
  selectedMode: PlanSynthesisMode;
  selectedCandidateId?: string;
  synthesizedAction?: SynthesizedPlanAction;
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  safetyNotes: string;
  valid: boolean;
  validationErrors?: string[];
  fallbackUsed: boolean;
  aiUsed: boolean;
  boundaryValidated: boolean;
  aiSynthesized: boolean;
  blockReason?: string;
}

export interface PlanEngineV3Result extends PlanEngineResult {
  synthesis?: PlanSynthesisResult;
}

export interface PlanEngineResult {
  action: PlanAction;
  reasoningResult: PlanReasoningResult;
  candidates: PlanCandidate[];
  safetyOverride: boolean;
}
