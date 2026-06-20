import type { DailyCheckIn, DailyStepsState, HealthProfile } from '../types/health';
import { DEFAULT_STEPS_GOAL } from './stepsUtils';

export function createDefaultHealthProfile(): HealthProfile {
  return {
    preferredName: '',
    primaryGoals: [],
    sensitiveMode: false,
    smartSilencePreference: 'gentle-reminders',
    conditions: [],
    medications: [],
    allergies: [],
    healthNotes: [],
    doctorQuestions: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
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
