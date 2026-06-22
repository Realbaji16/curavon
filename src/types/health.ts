export type SmartSilencePreference =
  | 'gentle-reminders'
  | 'daily-digest-only'
  | 'minimal-notifications';

export type AgeRange =
  | ''
  | 'under-18'
  | '18-24'
  | '25-34'
  | '35-44'
  | '45-54'
  | '55-64'
  | '65-plus';

export type ProfileSex = '' | 'female' | 'male' | 'intersex' | 'prefer-not-to-say';

export type PregnancyStatus =
  | ''
  | 'not-pregnant'
  | 'pregnant'
  | 'trying'
  | 'postpartum'
  | 'not-applicable'
  | 'prefer-not-to-say';

export type LanguageStyle = '' | 'plain' | 'warm' | 'clinical' | 'brief';

export type ActionStatus = 'pending' | 'done' | 'blocked' | 'adjusted';

export type HealthBlockedReason = 'tired' | 'time' | 'unsure' | 'symptoms' | 'other';

export type AdjustOption = 'two-minutes' | 'later-today' | 'note' | 'different-step';

export interface HealthProfile {
  preferredName: string;
  primaryGoals: string[];
  sensitiveMode: boolean;
  smartSilencePreference: SmartSilencePreference;
  /** Minimal context — optional at signup, fills gradually */
  ageRange: AgeRange;
  sex: ProfileSex;
  pregnancyStatus: PregnancyStatus;
  stateOrRegion: string;
  languageStyle: LanguageStyle;
  conditions: string[];
  medications: string[];
  allergies: string[];
  healthNotes: string[];
  doctorQuestions: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
}

export interface DailyCheckIn {
  id: string;
  date: string;
  sleepQuality: string;
  energyLevel: string;
  stressLevel: string;
  mood: string;
  symptoms: string;
  painLevel: number;
  hydration: string;
  medicationTaken: string;
  notes: string;
  steps: number;
  stepsBand: string;
  createdAt: string;
}

export interface DailyStepsState {
  date: string;
  steps: number;
  goal: number;
  updatedAt: string;
}

export interface NextActionState {
  currentAction: string;
  title?: string;
  reason?: string;
  source: string;
  sourceSignals?: string[];
  sourceChips?: string[];
  effort?: 'very_low' | 'low' | 'medium';
  category?:
    | 'stabilize'
    | 'track'
    | 'prepare'
    | 'reduce_friction'
    | 'escalate'
    | 'checkin'
    | 'stress'
    | 'medication'
    | 'doctor_prep'
    | 'symptom_tracking'
    | 'sleep_energy'
    | 'profile'
    | 'general';
  relatedGuide?: string;
  relatedGuideFlowId?:
    | 'something-feels-off'
    | 'doctor-visit-prep'
    | 'mood-stress-checkin'
    | 'headache'
    | 'stomach-pain'
    | 'medication-review';
  relatedDoctorSummaryPrompt?: string;
  watchFor?: string;
  followUpPrompt?: string;
  selectedBy?: 'ai' | 'rules';
  aiReasoned?: boolean;
  fallbackUsed?: boolean;
  safetyLevel?: 'normal' | 'caution' | 'urgent';
  actionId?: string;
  status: ActionStatus;
  updatedAt: string;
  completedAt?: string;
  /** Supabase health_flow id when action originated from Ask Curavon lifecycle. */
  healthFlowId?: string;
  /** Supabase flow_actions id — source of truth alongside next_action_state cache. */
  flowActionId?: string;
  /** Persisted health_flow privacy level when action originated from Ask lifecycle. */
  privacyLevel?: 'private' | 'sensitive' | 'care_circle_later' | 'shared';
  blockedReason?: HealthBlockedReason;
  blockedLabel?: string;
  adjustNote?: string;
  adjustLabel?: string;
}

export type CheckInDraft = Partial<
  Omit<DailyCheckIn, 'id' | 'date' | 'createdAt'>
>;
