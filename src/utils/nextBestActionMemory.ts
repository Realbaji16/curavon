import type { AskHistoryEntry } from '../types/askIntake';
import type { DoctorSummaryItem, RedFlagLog } from '../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../types/health';
import type { PersonalizationMemorySnapshot } from '../types/nextBestAction';
import {
  createDefaultHealthProfile,
  HEALTH_STORAGE_KEYS,
  normalizeCheckIn,
  safeRead,
} from './healthStorage';

const ASK_HISTORY_KEY = 'curavon_ask_history';
const DOCTOR_ITEMS_KEY = 'curavon_doctor_summary_items';
const RED_FLAGS_KEY = 'curavon_red_flag_logs';

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function readCuravonMemorySnapshot(): PersonalizationMemorySnapshot {
  const healthProfile = safeRead<HealthProfile>(
    HEALTH_STORAGE_KEYS.healthProfile,
    createDefaultHealthProfile(),
  );

  const rawCheckins = safeRead<unknown>(HEALTH_STORAGE_KEYS.dailyCheckins, []);
  const dailyCheckins = asArray<DailyCheckIn>(rawCheckins).map(normalizeCheckIn);

  const nextActionState = safeRead<NextActionState | null>(
    HEALTH_STORAGE_KEYS.nextActionState,
    null,
  );

  const doctorSummaryItems = asArray<DoctorSummaryItem>(safeRead<unknown>(DOCTOR_ITEMS_KEY, []));
  const askHistory = asArray<AskHistoryEntry>(safeRead<unknown>(ASK_HISTORY_KEY, []));
  const redFlagLogs = asArray<RedFlagLog>(safeRead<unknown>(RED_FLAGS_KEY, []));

  return {
    healthProfile,
    dailyCheckins,
    nextActionState,
    doctorSummaryItems,
    askHistory,
    redFlagLogs,
  };
}
