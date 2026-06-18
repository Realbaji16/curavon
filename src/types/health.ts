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
  source: string;
  status: ActionStatus;
  updatedAt: string;
  blockedReason?: HealthBlockedReason;
  adjustNote?: string;
}

export type CheckInDraft = Partial<
  Omit<DailyCheckIn, 'id' | 'date' | 'createdAt'>
>;
