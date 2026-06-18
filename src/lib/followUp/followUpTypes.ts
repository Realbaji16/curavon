export type FollowUpStatus =
  | 'pending'
  | 'completed'
  | 'missed'
  | 'snoozed'
  | 'cancelled';

export type FollowUpOutcome =
  | 'helped'
  | 'partly_helped'
  | 'blocked'
  | 'worse'
  | 'not_done'
  | 'not_relevant';

export type FollowUpIntent =
  | 'check_action'
  | 'check_symptom_pattern'
  | 'check_stress_state'
  | 'check_doctor_prep'
  | 'check_medication_note'
  | 'check_safety_event';

export interface FollowUpRecord {
  id: string;
  actionId: string;
  createdAt: string;
  dueAt: string;
  status: FollowUpStatus;
  intent: FollowUpIntent;
  linkedActionTitle: string;
  linkedActionCategory: string;
  linkedSafetyLevel: 'normal' | 'caution' | 'urgent';
  prompt: string;
  outcome?: FollowUpOutcome;
  userNote?: string;
  sourceSignals: string[];
  escalationFlag: boolean;
  savedToDoctorSummary: boolean;
}

export interface FollowUpDecision {
  outcome: FollowUpOutcome;
  nextState: string;
  recommendedNextStep: string;
  shouldGenerateNewAction: boolean;
  shouldSaveToDoctorSummary: boolean;
  shouldEscalate: boolean;
  reason: string;
}
