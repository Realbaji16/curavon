import type { SyncOperation, SyncResult, SyncStatus } from './syncTypes';

export interface CuravonSyncAdapter {
  connect(userId: string): Promise<void>;
  disconnect(): Promise<void>;
  queueOperation(operation: SyncOperation): Promise<void>;
  processQueue(): Promise<SyncResult>;
  getSyncStatus(): SyncStatus;
  resolveConflict(local: SyncOperation, remote: SyncOperation): SyncOperation;
  pushLocalChanges(): Promise<SyncResult>;
  pullRemoteChanges(): Promise<SyncResult>;
  clearQueue(): Promise<void>;
  retryFailed(): Promise<SyncResult>;
}

// Contract only.
// A future sync engine will implement this adapter interface for whichever backend is chosen later.

export function resolveConflictByPolicy(local: SyncOperation, remote: SyncOperation): SyncOperation {
  if (local.entityType === 'red_flag_logs') {
    return local;
  }
  const localTs = new Date(local.timestamp).getTime();
  const remoteTs = new Date(remote.timestamp).getTime();
  if (!Number.isFinite(localTs)) return remote;
  if (!Number.isFinite(remoteTs)) return local;
  return localTs >= remoteTs ? local : remote;
}
