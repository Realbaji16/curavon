import { APP_STORAGE_KEYS } from '../data/storageKeys';
import { safeRead, safeWrite } from '../../utils/healthStorage';
import type { SyncEntityType, SyncOperationType } from './syncTypes';

type SyncLogEntry = {
  operationType: SyncOperationType;
  entityType: SyncEntityType;
  success: boolean;
  retryCount: number;
  timestamp: string;
  note?: string;
};

const MAX_SYNC_LOGS = 250;

export function getSyncLogs(): SyncLogEntry[] {
  return safeRead<SyncLogEntry[]>(APP_STORAGE_KEYS.syncLogs, []);
}

export function logSyncEvent(entry: SyncLogEntry) {
  const logs = getSyncLogs();
  const next = [entry, ...logs].slice(0, MAX_SYNC_LOGS);
  safeWrite(APP_STORAGE_KEYS.syncLogs, next);
}

export function clearSyncLogs() {
  safeWrite(APP_STORAGE_KEYS.syncLogs, []);
}
