import { APP_STORAGE_KEYS } from './storageKeys';
import type { CuravonCollection } from './dataTypes';
import { safeRead, safeWrite } from '../../utils/healthStorage';

const COLLECTION_TO_KEY: Record<CuravonCollection, string> = {
  health_profile: APP_STORAGE_KEYS.healthProfile,
  daily_checkins: APP_STORAGE_KEYS.dailyCheckins,
  ask_history: APP_STORAGE_KEYS.askHistory,
  doctor_summary_items: APP_STORAGE_KEYS.doctorSummaryItems,
  doctor_summary_drafts: APP_STORAGE_KEYS.doctorSummaryDrafts,
  next_action_state: APP_STORAGE_KEYS.nextActionState,
  red_flag_logs: APP_STORAGE_KEYS.redFlagLogs,
  follow_ups: APP_STORAGE_KEYS.followUps,
  memory_snapshot: APP_STORAGE_KEYS.healthSnapshot,
  ai_usage_log: APP_STORAGE_KEYS.aiUsageLog,
  guide_results: APP_STORAGE_KEYS.guideResults,
  user_preferences: APP_STORAGE_KEYS.userPreferences,
};

const ARRAY_COLLECTIONS = new Set<CuravonCollection>([
  'daily_checkins',
  'ask_history',
  'doctor_summary_items',
  'doctor_summary_drafts',
  'red_flag_logs',
  'follow_ups',
  'ai_usage_log',
  'guide_results',
]);

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // swallow for safety in local-only mode
  }
}

export function safeJsonParse<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify(null);
  }
}

export function validateCollectionShape(collection: CuravonCollection, value: unknown): boolean {
  if (ARRAY_COLLECTIONS.has(collection)) return Array.isArray(value);
  if (collection === 'next_action_state' || collection === 'memory_snapshot' || collection === 'health_profile') {
    return value === null || (typeof value === 'object' && !Array.isArray(value));
  }
  if (collection === 'user_preferences') {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
  return true;
}

export function repairCollection(collection: CuravonCollection, value: unknown): unknown {
  if (validateCollectionShape(collection, value)) return value;
  if (ARRAY_COLLECTIONS.has(collection)) return [];
  if (collection === 'next_action_state') return null;
  if (collection === 'memory_snapshot') return null;
  if (collection === 'health_profile') return null;
  if (collection === 'user_preferences') return {};
  return null;
}

export function detectCorruptedKeys(): string[] {
  const corrupted: string[] = [];
  (Object.keys(COLLECTION_TO_KEY) as CuravonCollection[]).forEach((collection) => {
    const key = COLLECTION_TO_KEY[collection];
    const raw = readRaw(key);
    if (!raw) return;
    const parsed = safeJsonParse<unknown>(raw, '__corrupted__');
    if (parsed === '__corrupted__') {
      const backup = safeRead<Record<string, string>>(APP_STORAGE_KEYS.corruptedDataBackup, {});
      backup[key] = raw;
      safeWrite(APP_STORAGE_KEYS.corruptedDataBackup, backup);
      corrupted.push(key);
      console.warn(`[Curavon] Corrupted localStorage key repaired: ${key}`);
      const fallback = repairCollection(collection, null);
      writeRaw(key, safeJsonStringify(fallback));
      return;
    }
    if (!validateCollectionShape(collection, parsed)) {
      corrupted.push(key);
      const repaired = repairCollection(collection, parsed);
      writeRaw(key, safeJsonStringify(repaired));
      console.warn(`[Curavon] Invalid shape repaired for key: ${key}`);
    }
  });
  return corrupted;
}
