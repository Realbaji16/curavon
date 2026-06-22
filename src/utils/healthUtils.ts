import type { DailyCheckIn, DailyStepsState, HealthProfile } from '../types/health';
import { DEFAULT_STEPS_GOAL } from './stepsUtils';

export function createDefaultHealthProfile(): HealthProfile {
  return {
    preferredName: '',
    primaryGoals: [],
    sensitiveMode: false,
    smartSilencePreference: 'gentle-reminders',
    ageRange: '',
    sex: '',
    pregnancyStatus: '',
    stateOrRegion: '',
    languageStyle: '',
    conditions: [],
    medications: [],
    allergies: [],
    healthNotes: [],
    doctorQuestions: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
  };
}

/** Merge stored payloads with defaults — older profiles may omit newer fields. */
export function normalizeHealthProfile(
  raw: Partial<HealthProfile> | null | undefined,
): HealthProfile {
  const defaults = createDefaultHealthProfile();
  if (!raw) return defaults;

  return {
    ...defaults,
    ...raw,
    preferredName: typeof raw.preferredName === 'string' ? raw.preferredName : defaults.preferredName,
    primaryGoals: Array.isArray(raw.primaryGoals) ? raw.primaryGoals : defaults.primaryGoals,
    sensitiveMode: typeof raw.sensitiveMode === 'boolean' ? raw.sensitiveMode : defaults.sensitiveMode,
    smartSilencePreference: raw.smartSilencePreference ?? defaults.smartSilencePreference,
    ageRange: raw.ageRange ?? defaults.ageRange,
    sex: raw.sex ?? defaults.sex,
    pregnancyStatus: raw.pregnancyStatus ?? defaults.pregnancyStatus,
    stateOrRegion: typeof raw.stateOrRegion === 'string' ? raw.stateOrRegion : defaults.stateOrRegion,
    languageStyle: raw.languageStyle ?? defaults.languageStyle,
    conditions: Array.isArray(raw.conditions) ? raw.conditions : defaults.conditions,
    medications: Array.isArray(raw.medications) ? raw.medications : defaults.medications,
    allergies: Array.isArray(raw.allergies) ? raw.allergies : defaults.allergies,
    healthNotes: Array.isArray(raw.healthNotes) ? raw.healthNotes : defaults.healthNotes,
    doctorQuestions: Array.isArray(raw.doctorQuestions) ? raw.doctorQuestions : defaults.doctorQuestions,
    emergencyContactName:
      typeof raw.emergencyContactName === 'string'
        ? raw.emergencyContactName
        : defaults.emergencyContactName,
    emergencyContactPhone:
      typeof raw.emergencyContactPhone === 'string'
        ? raw.emergencyContactPhone
        : defaults.emergencyContactPhone,
  };
}

export function todayDateKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function createDefaultDailySteps(): DailyStepsState {
  return {
    date: todayDateKey(),
    steps: 0,
    goal: DEFAULT_STEPS_GOAL,
    updatedAt: new Date().toISOString(),
  };
}

let dailyStepsCache: DailyStepsState | null = null;

export function loadTodaySteps(): DailyStepsState {
  const today = todayDateKey();
  if (!dailyStepsCache || dailyStepsCache.date !== today) {
    dailyStepsCache = createDefaultDailySteps();
  }
  return {
    ...dailyStepsCache,
    goal: dailyStepsCache.goal || DEFAULT_STEPS_GOAL,
  };
}

export function saveTodaySteps(state: DailyStepsState) {
  dailyStepsCache = state;
}

export function resetDailyStepsForTests() {
  dailyStepsCache = null;
}

export function normalizeCheckIn(raw: DailyCheckIn): DailyCheckIn {
  return {
    ...raw,
    steps: typeof raw.steps === 'number' ? raw.steps : 0,
    stepsBand: raw.stepsBand ?? '',
  };
}

export function getTodayCheckIn(checkins: DailyCheckIn[]): DailyCheckIn | null {
  const today = todayDateKey();
  const found = checkins.find((c) => c.date === today);
  return found ? normalizeCheckIn(found) : null;
}
