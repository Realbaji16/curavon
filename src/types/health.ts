export type SmartSilencePreference =
  | 'gentle-reminders'
  | 'daily-digest-only'
  | 'minimal-notifications';

export type ActionStatus = 'pending' | 'done' | 'blocked' | 'adjusted';

export type HealthBlockedReason = 'tired' | 'time' | 'unsure' | 'symptoms' | 'other';

export type AdjustOption = 'two-minutes' | 'later-today' | 'note' | 'different-step';

export interface HealthProfile {
  preferredName: string;
  primaryGoals: string[];
  sensitiveMode: boolean;
  smartSilencePreference: SmartSilencePreference;
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
  blockedReason?: HealthBlockedReason;
  blockedLabel?: string;
  adjustNote?: string;
  adjustLabel?: string;
}

export type CheckInDraft = Partial<
  Omit<DailyCheckIn, 'id' | 'date' | 'createdAt'>
>;
