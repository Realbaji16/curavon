import type { DoctorSummaryDraft, DoctorSummaryItem, RedFlagLog } from '../types/doctorSummary';
import { safeRead, safeRemove, safeWrite } from './healthStorage';
import { collectSafetyFromRedFlag } from './metaSystem';
import { APP_STORAGE_KEYS } from '../lib/data/storageKeys';
import { queueSyncForCurrentUser } from '../lib/sync/syncQueue';

export const DOCTOR_SUMMARY_STORAGE_KEYS = {
  items: APP_STORAGE_KEYS.doctorSummaryItems,
  drafts: APP_STORAGE_KEYS.doctorSummaryDrafts,
  redFlagLogs: APP_STORAGE_KEYS.redFlagLogs,
} as const;

export function loadDoctorSummaryItems(): DoctorSummaryItem[] {
  return safeRead<DoctorSummaryItem[]>(DOCTOR_SUMMARY_STORAGE_KEYS.items, []);
}

export function saveDoctorSummaryItems(items: DoctorSummaryItem[]) {
  safeWrite(DOCTOR_SUMMARY_STORAGE_KEYS.items, items);
  queueSyncForCurrentUser({
    entityType: 'doctor_summary',
    operationType: 'update',
    payload: {
      itemCount: items.length,
      latestId: items[0]?.id ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function loadDoctorSummaryDrafts(): DoctorSummaryDraft[] {
  return safeRead<DoctorSummaryDraft[]>(DOCTOR_SUMMARY_STORAGE_KEYS.drafts, []);
}

export function saveDoctorSummaryDrafts(drafts: DoctorSummaryDraft[]) {
  safeWrite(DOCTOR_SUMMARY_STORAGE_KEYS.drafts, drafts);
  queueSyncForCurrentUser({
    entityType: 'doctor_summary',
    operationType: 'update',
    payload: {
      draftCount: drafts.length,
      latestDraftDate: drafts[0]?.updatedAt ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function loadRedFlagLogs(): RedFlagLog[] {
  return safeRead<RedFlagLog[]>(DOCTOR_SUMMARY_STORAGE_KEYS.redFlagLogs, []);
}

export function saveRedFlagLogs(logs: RedFlagLog[]) {
  safeWrite(DOCTOR_SUMMARY_STORAGE_KEYS.redFlagLogs, logs);
  queueSyncForCurrentUser({
    entityType: 'red_flag_logs',
    operationType: 'update',
    payload: {
      count: logs.length,
      latestId: logs[0]?.id ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function clearDoctorSummaryStorage() {
  Object.values(DOCTOR_SUMMARY_STORAGE_KEYS).forEach(safeRemove);
}

export function addDoctorSummaryItem(
  item: Omit<DoctorSummaryItem, 'id' | 'createdAt'>,
): DoctorSummaryItem {
  const entry: DoctorSummaryItem = {
    ...item,
    id: `dsi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadDoctorSummaryItems()];
  saveDoctorSummaryItems(next);
  return entry;
}

export function addRedFlagLog(
  log: Omit<RedFlagLog, 'id' | 'createdAt'>,
): RedFlagLog {
  const entry: RedFlagLog = {
    ...log,
    id: `rfl-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const next = [entry, ...loadRedFlagLogs()];
  saveRedFlagLogs(next);
  collectSafetyFromRedFlag(entry);
  return entry;
}
