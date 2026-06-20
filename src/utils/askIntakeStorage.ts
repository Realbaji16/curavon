import type { AskHistoryEntry } from '../types/askIntake';
import {
  clearAskHistory as clearAskHistoryRemote,
  fetchAskHistory,
  markAskHistorySaved as markAskHistorySavedRemote,
  saveAskHistoryEntry,
} from '../lib/data/coreHealthDataService';

export async function loadAskHistory(): Promise<AskHistoryEntry[]> {
  return fetchAskHistory();
}

export async function addAskHistoryEntry(
  entry: Omit<AskHistoryEntry, 'id' | 'createdAt' | 'savedToDoctorSummary'>,
): Promise<AskHistoryEntry> {
  const item: AskHistoryEntry = {
    ...entry,
    id: `ask-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    savedToDoctorSummary: false,
  };
  await saveAskHistoryEntry(item);
  return item;
}

export async function markAskHistorySaved(id: string): Promise<void> {
  await markAskHistorySavedRemote(id);
}

export async function clearAskHistory(): Promise<void> {
  await clearAskHistoryRemote();
}
