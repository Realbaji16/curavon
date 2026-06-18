import type { AskHistoryEntry } from '../types/askIntake';
import { safeRead, safeRemove, safeWrite } from './healthStorage';
import { refreshHealthSnapshot } from './healthSnapshot';

export const ASK_HISTORY_KEY = 'curavon_ask_history';

export function loadAskHistory(): AskHistoryEntry[] {
  return safeRead<AskHistoryEntry[]>(ASK_HISTORY_KEY, []);
}

export function saveAskHistory(entries: AskHistoryEntry[]) {
  safeWrite(ASK_HISTORY_KEY, entries);
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
