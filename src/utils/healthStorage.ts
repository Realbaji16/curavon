import type { DailyCheckIn, DailyStepsState, HealthProfile } from '../types/health';
import { DEFAULT_STEPS_GOAL } from './stepsUtils';
import { APP_STORAGE_KEYS } from '../lib/data/storageKeys';

export const HEALTH_STORAGE_KEYS = {
  healthProfile: APP_STORAGE_KEYS.healthProfile,
  dailyCheckins: APP_STORAGE_KEYS.dailyCheckins,
  nextActionState: APP_STORAGE_KEYS.nextActionState,
  dailySteps: APP_STORAGE_KEYS.dailySteps,
} as const;

export function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeWrite(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function safeRemove(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

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

export function loadTodaySteps(): DailyStepsState {
  const stored = safeRead<DailyStepsState | null>(HEALTH_STORAGE_KEYS.dailySteps, null);
  const today = todayDateKey();
  if (!stored || stored.date !== today) {
    return createDefaultDailySteps();
  }
  return {
    ...stored,
    goal: stored.goal || DEFAULT_STEPS_GOAL,
  };
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

export function clearHealthStorage() {
  Object.values(HEALTH_STORAGE_KEYS).forEach(safeRemove);
}
