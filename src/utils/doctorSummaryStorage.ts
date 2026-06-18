import type { DoctorSummaryDraft, DoctorSummaryItem, RedFlagLog } from '../types/doctorSummary';
import { safeRead, safeRemove, safeWrite } from './healthStorage';

export const DOCTOR_SUMMARY_STORAGE_KEYS = {
  items: 'curavon_doctor_summary_items',
  drafts: 'curavon_doctor_summary_drafts',
  redFlagLogs: 'curavon_red_flag_logs',
} as const;

export function loadDoctorSummaryItems(): DoctorSummaryItem[] {
  return safeRead<DoctorSummaryItem[]>(DOCTOR_SUMMARY_STORAGE_KEYS.items, []);
}

export function saveDoctorSummaryItems(items: DoctorSummaryItem[]) {
  safeWrite(DOCTOR_SUMMARY_STORAGE_KEYS.items, items);
}

export function loadDoctorSummaryDrafts(): DoctorSummaryDraft[] {
  return safeRead<DoctorSummaryDraft[]>(DOCTOR_SUMMARY_STORAGE_KEYS.drafts, []);
}

export function saveDoctorSummaryDrafts(drafts: DoctorSummaryDraft[]) {
  safeWrite(DOCTOR_SUMMARY_STORAGE_KEYS.drafts, drafts);
}

export function loadRedFlagLogs(): RedFlagLog[] {
  return safeRead<RedFlagLog[]>(DOCTOR_SUMMARY_STORAGE_KEYS.redFlagLogs, []);
}

export function saveRedFlagLogs(logs: RedFlagLog[]) {
  safeWrite(DOCTOR_SUMMARY_STORAGE_KEYS.redFlagLogs, logs);
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
  return entry;
}
