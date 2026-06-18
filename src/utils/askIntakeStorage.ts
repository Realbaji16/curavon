import type { AskHistoryEntry } from '../types/askIntake';
import { safeRead, safeRemove, safeWrite } from './healthStorage';
import { refreshHealthSnapshot } from './healthSnapshot';
import { APP_STORAGE_KEYS } from '../lib/data/storageKeys';
import { queueSyncForCurrentUser } from '../lib/sync/syncQueue';

export const ASK_HISTORY_KEY = APP_STORAGE_KEYS.askHistory;

export function loadAskHistory(): AskHistoryEntry[] {
  return safeRead<AskHistoryEntry[]>(ASK_HISTORY_KEY, []);
}

export function saveAskHistory(entries: AskHistoryEntry[]) {
  safeWrite(ASK_HISTORY_KEY, entries);
  queueSyncForCurrentUser({
    entityType: 'ask_history',
    operationType: 'update',
    payload: {
      count: entries.length,
      latestId: entries[0]?.id ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function addAskHistoryEntry(
  entry: Omit<AskHistoryEntry, 'id' | 'createdAt' | 'savedToDoctorSummary'>,
): AskHistoryEntry {
  const item: AskHistoryEntry = {
    ...entry,
    id: `ask-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    savedToDoctorSummary: false,
  };
  const next = [item, ...loadAskHistory()].slice(0, 20);
  saveAskHistory(next);
  refreshHealthSnapshot();
  return item;
}

export function markAskHistorySaved(id: string) {
  const next = loadAskHistory().map((e) =>
    e.id === id ? { ...e, savedToDoctorSummary: true } : e,
  );
  saveAskHistory(next);
  refreshHealthSnapshot();
}

export function clearAskHistory() {
  safeRemove(ASK_HISTORY_KEY);
  refreshHealthSnapshot();
}
