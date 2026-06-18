import type { ActionStatus, DailyCheckIn, HealthProfile, NextActionState } from './health';
import type { AskHistoryEntry } from './askIntake';
import type { DoctorSummaryItem, RedFlagLog } from './doctorSummary';

export type PersonalizationSignal =
  | 'low_sleep'
  | 'low_energy'
  | 'high_stress'
  | 'mood_support'
  | 'symptom_tracking'
  | 'headache_pattern'
  | 'stomach_pattern'
  | 'medication_question'
  | 'doctor_prep_needed'
  | 'action_blocked'
  | 'recent_red_flag'
  | 'no_checkin_today'
  | 'profile_incomplete'
  | 'mental_health_support';

export type NextActionSafetyLevel = 'normal' | 'caution' | 'urgent';

export type NextActionEffort = 'very_low' | 'low' | 'medium';

export type NextActionCategory =
  | 'checkin'
  | 'stress'
  | 'medication'
  | 'doctor_prep'
  | 'symptom_tracking'
  | 'sleep_energy'
  | 'profile'
  | 'general';

export type ActionSourceChip =
  | "Today's Check-In"
  | 'Ask Curavon'
  | 'Guides'
  | 'Profile'
  | 'Doctor Summary'
  | 'Next Action';

export type RelatedGuideFlowId =
  | 'something-feels-off'
  | 'doctor-visit-prep'
  | 'mood-stress-checkin'
  | 'headache'
  | 'stomach-pain'
  | 'medication-review';

export interface NextBestActionRecommendation {
  id: string;
  title: string;
  actionText: string;
  reason: string;
  sourceSignals: PersonalizationSignal[];
  sourceChips: ActionSourceChip[];
  effort: NextActionEffort;
  category: NextActionCategory;
  relatedGuide?: string;
  relatedGuideFlowId?: RelatedGuideFlowId;
  relatedDoctorSummaryPrompt?: string;
  safetyLevel: NextActionSafetyLevel;
}

export interface SupportingInsightCard {
  id: string;
  title: string;
  lines: string[];
  actionLabel?: string;
  actionTarget?: 'checkin' | 'guides' | 'summary' | 'profile';
}

export interface PersonalizationMemorySnapshot {
  healthProfile: HealthProfile;
  dailyCheckins: DailyCheckIn[];
  nextActionState: NextActionState | null;
  doctorSummaryItems: DoctorSummaryItem[];
  askHistory: AskHistoryEntry[];
  redFlagLogs: RedFlagLog[];
}

export interface NextBestActionPlan {
  recommendation: NextBestActionRecommendation;
  signals: PersonalizationSignal[];
  supportingInsights: SupportingInsightCard[];
  patternLines: string[];
}

export interface NextActionStatusPayload {
  status: ActionStatus;
  blockedLabel?: string;
  adjustLabel?: string;
}
