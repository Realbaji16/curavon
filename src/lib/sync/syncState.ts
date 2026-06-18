import { APP_STORAGE_KEYS } from '../data/storageKeys';
import { safeRead, safeWrite } from '../../utils/healthStorage';

export type CuravonSyncState = {
  lastSyncTime: string | null;
  syncInProgress: boolean;
  syncErrors: string[];
  pendingCount: number;
  conflictCount: number;
};

const DEFAULT_SYNC_STATE: CuravonSyncState = {
  lastSyncTime: null,
  syncInProgress: false,
  syncErrors: [],
  pendingCount: 0,
  conflictCount: 0,
};

export function getSyncState(): CuravonSyncState {
  return safeRead<CuravonSyncState>(APP_STORAGE_KEYS.syncState, DEFAULT_SYNC_STATE);
}

export function updateSyncState(patch: Partial<CuravonSyncState>) {
  const current = getSyncState();
  safeWrite(APP_STORAGE_KEYS.syncState, {
    ...current,
    ...patch,
  });
}

export function resetSyncState() {
  safeWrite(APP_STORAGE_KEYS.syncState, DEFAULT_SYNC_STATE);
}
