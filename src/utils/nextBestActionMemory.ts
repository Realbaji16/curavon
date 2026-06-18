import type { AskHistoryEntry } from '../types/askIntake';
import type { DoctorSummaryItem, RedFlagLog } from '../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../types/health';
import type { FollowUpRecord } from '../lib/followUp/followUpTypes';
import type { PersonalizationMemorySnapshot } from '../types/nextBestAction';
import { loadGuideResults } from './guideResultStorage';
import {
  createDefaultHealthProfile,
  HEALTH_STORAGE_KEYS,
  normalizeCheckIn,
  safeRead,
} from './healthStorage';
import { APP_STORAGE_KEYS } from '../lib/data/storageKeys';

const ASK_HISTORY_KEY = APP_STORAGE_KEYS.askHistory;
const DOCTOR_ITEMS_KEY = APP_STORAGE_KEYS.doctorSummaryItems;
const RED_FLAGS_KEY = APP_STORAGE_KEYS.redFlagLogs;
const FOLLOW_UPS_KEY = APP_STORAGE_KEYS.followUps;

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
  const followUps = asArray<FollowUpRecord>(safeRead<unknown>(FOLLOW_UPS_KEY, []));
  const guideResults = loadGuideResults();

  return {
    healthProfile,
    dailyCheckins,
    nextActionState,
    doctorSummaryItems,
    askHistory,
    redFlagLogs,
    followUps,
    guideResults,
  };
}
