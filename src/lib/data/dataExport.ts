import { APP_STORAGE_KEYS, EXPORT_HEALTH_DATA_KEYS } from './storageKeys';
import { safeRead } from '../../utils/healthStorage';

export type CuravonExportPayload = {
  exportedAt: string;
  appName: 'Curavon';
  userId: string;
  authMode: 'local_demo';
  exportScope: 'health_records';
  healthProfile: unknown;
  dailyCheckins: unknown[];
  askHistory: unknown[];
  doctorSummaryItems: unknown[];
  doctorSummaryDrafts: unknown[];
  redFlagLogs: unknown[];
  nextActionState: unknown;
  followUps: unknown[];
  memorySnapshot: unknown;
  guideResults: unknown[];
  userPreferences: unknown;
  dailySteps: unknown;
  aiUsageLog: unknown[];
};

const EXPORT_READERS: Record<string, () => unknown> = {
  [APP_STORAGE_KEYS.healthProfile]: () => safeRead(APP_STORAGE_KEYS.healthProfile, null),
  [APP_STORAGE_KEYS.dailyCheckins]: () => safeRead(APP_STORAGE_KEYS.dailyCheckins, []),
  [APP_STORAGE_KEYS.askHistory]: () => safeRead(APP_STORAGE_KEYS.askHistory, []),
  [APP_STORAGE_KEYS.doctorSummaryItems]: () => safeRead(APP_STORAGE_KEYS.doctorSummaryItems, []),
  [APP_STORAGE_KEYS.doctorSummaryDrafts]: () => safeRead(APP_STORAGE_KEYS.doctorSummaryDrafts, []),
  [APP_STORAGE_KEYS.redFlagLogs]: () => safeRead(APP_STORAGE_KEYS.redFlagLogs, []),
  [APP_STORAGE_KEYS.nextActionState]: () => safeRead(APP_STORAGE_KEYS.nextActionState, null),
  [APP_STORAGE_KEYS.followUps]: () => safeRead(APP_STORAGE_KEYS.followUps, []),
  [APP_STORAGE_KEYS.healthSnapshot]: () => safeRead(APP_STORAGE_KEYS.healthSnapshot, null),
  [APP_STORAGE_KEYS.guideResults]: () => safeRead(APP_STORAGE_KEYS.guideResults, []),
  [APP_STORAGE_KEYS.userPreferences]: () => safeRead(APP_STORAGE_KEYS.userPreferences, {}),
  [APP_STORAGE_KEYS.dailySteps]: () => safeRead(APP_STORAGE_KEYS.dailySteps, null),
  [APP_STORAGE_KEYS.aiUsageLog]: () => safeRead(APP_STORAGE_KEYS.aiUsageLog, []),
};

export function exportCuravonData(userId: string): CuravonExportPayload {
  const values = Object.fromEntries(
    EXPORT_HEALTH_DATA_KEYS.map((key) => [key, EXPORT_READERS[key]?.() ?? null]),
  );

  return {
    exportedAt: new Date().toISOString(),
    appName: 'Curavon',
    userId,
    authMode: 'local_demo',
    exportScope: 'health_records',
    healthProfile: values[APP_STORAGE_KEYS.healthProfile],
    dailyCheckins: values[APP_STORAGE_KEYS.dailyCheckins] as unknown[],
    askHistory: values[APP_STORAGE_KEYS.askHistory] as unknown[],
    doctorSummaryItems: values[APP_STORAGE_KEYS.doctorSummaryItems] as unknown[],
    doctorSummaryDrafts: values[APP_STORAGE_KEYS.doctorSummaryDrafts] as unknown[],
    redFlagLogs: values[APP_STORAGE_KEYS.redFlagLogs] as unknown[],
    nextActionState: values[APP_STORAGE_KEYS.nextActionState],
    followUps: values[APP_STORAGE_KEYS.followUps] as unknown[],
    memorySnapshot: values[APP_STORAGE_KEYS.healthSnapshot],
    guideResults: values[APP_STORAGE_KEYS.guideResults] as unknown[],
    userPreferences: values[APP_STORAGE_KEYS.userPreferences],
    dailySteps: values[APP_STORAGE_KEYS.dailySteps],
    aiUsageLog: values[APP_STORAGE_KEYS.aiUsageLog] as unknown[],
  };
}
