import type { AskHistoryEntry } from '../../types/askIntake';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import {
  createDefaultHealthProfile,
  normalizeCheckIn,
  normalizeHealthProfile,
} from '../../utils/healthUtils';
import { DataAuthError, DataPermissionError, DataValidationError, DataUnavailableError } from './dataErrors';
import { getDataAdapter } from './getDataAdapter';
import { softDeleteUserRows } from './supabaseDataClient';

export const CORE_HEALTH_DATA_MESSAGES = {
  auth: 'Sign in to load and save your health data.',
  permission:
    'Your account cannot reach Curavon health tables yet. Apply Supabase migration 20250618100004 (table grants) or run supabase db push.',
  unavailable: 'Your health data is temporarily unavailable. Try again soon.',
} as const;

export type CoreHealthDataLoadResult = {
  healthProfile: HealthProfile;
  dailyCheckins: DailyCheckIn[];
  nextActionState: NextActionState | null;
  askHistory: AskHistoryEntry[];
  error: string | null;
};

function emptyCoreLoad(error: string | null): CoreHealthDataLoadResult {
  return {
    healthProfile: createDefaultHealthProfile(),
    dailyCheckins: [],
    nextActionState: null,
    askHistory: [],
    error,
  };
}

function mapLoadError(error: unknown): CoreHealthDataLoadResult {
  if (error instanceof DataAuthError) {
    return emptyCoreLoad(CORE_HEALTH_DATA_MESSAGES.auth);
  }
  if (error instanceof DataPermissionError) {
    return emptyCoreLoad(CORE_HEALTH_DATA_MESSAGES.permission);
  }
  if (error instanceof DataUnavailableError) {
    return emptyCoreLoad(CORE_HEALTH_DATA_MESSAGES.unavailable);
  }
  return emptyCoreLoad(CORE_HEALTH_DATA_MESSAGES.unavailable);
}

export async function loadCoreHealthData(): Promise<CoreHealthDataLoadResult> {
  const adapter = getDataAdapter();
  try {
    const [healthProfile, dailyCheckins, nextActionState, askHistory] = await Promise.all([
      adapter.getHealthProfile(),
      adapter.listDailyCheckins(),
      adapter.getNextActionState(),
      adapter.listAskHistory(),
    ]);

    return {
      healthProfile: normalizeHealthProfile(healthProfile),
      dailyCheckins: dailyCheckins.map(normalizeCheckIn),
      nextActionState,
      askHistory,
      error: null,
    };
  } catch (error) {
    return mapLoadError(error);
  }
}

export async function saveHealthProfileRecord(profile: HealthProfile): Promise<void> {
  await getDataAdapter().upsertHealthProfile(profile);
}

export async function saveDailyCheckinRecord(checkin: DailyCheckIn): Promise<void> {
  await getDataAdapter().createDailyCheckin(checkin);
}

export async function saveNextActionStateRecord(state: NextActionState | null): Promise<void> {
  if (!state) {
    await softDeleteUserRows('next_action_state');
    return;
  }
  await getDataAdapter().upsertNextActionState(state);
}

export async function fetchAskHistory(): Promise<AskHistoryEntry[]> {
  return getDataAdapter().listAskHistory();
}

export async function saveAskHistoryEntry(entry: AskHistoryEntry): Promise<void> {
  await getDataAdapter().createAskHistoryItem(entry);
}

export async function markAskHistorySaved(id: string): Promise<void> {
  const entries = await getDataAdapter().listAskHistory();
  const match = entries.find((entry) => entry.id === id);
  if (!match) return;
  await getDataAdapter().createAskHistoryItem({ ...match, savedToDoctorSummary: true });
}

export async function clearAskHistory(): Promise<void> {
  await softDeleteUserRows('ask_history');
}

export function toDataErrorMessage(error: unknown): string {
  if (error instanceof DataAuthError) return CORE_HEALTH_DATA_MESSAGES.auth;
  if (error instanceof DataPermissionError) return CORE_HEALTH_DATA_MESSAGES.permission;
  if (error instanceof DataValidationError) return error.message;
  if (error instanceof DataUnavailableError) return CORE_HEALTH_DATA_MESSAGES.unavailable;
  return CORE_HEALTH_DATA_MESSAGES.unavailable;
}
