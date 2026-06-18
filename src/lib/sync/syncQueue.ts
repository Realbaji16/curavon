import { APP_STORAGE_KEYS } from '../data/storageKeys';
import { safeRead, safeWrite } from '../../utils/healthStorage';
import { logSyncEvent } from './syncLogger';
import { getSyncState, updateSyncState } from './syncState';
import {
  canRetry,
  isDuplicateSyncOperation,
  trimQueueToLimit,
  validateSyncOperation,
} from './syncGuards';
import type { SyncEntityType, SyncOperation, SyncOperationType, SyncResult } from './syncTypes';

const SYNC_QUEUE_KEY = APP_STORAGE_KEYS.syncQueue;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDelayMs() {
  return Math.floor(200 + Math.random() * 400);
}

export function getQueue(): SyncOperation[] {
  return safeRead<SyncOperation[]>(SYNC_QUEUE_KEY, []);
}

export function clearQueue() {
  safeWrite(SYNC_QUEUE_KEY, []);
  updateSyncState({ pendingCount: 0 });
}

export function addToQueue(operation: SyncOperation): { added: boolean; reason?: string } {
  const validation = validateSyncOperation(operation);
  if (!validation.valid) {
    logSyncEvent({
      operationType: operation.operationType,
      entityType: operation.entityType,
      success: false,
      retryCount: operation.retryCount,
      timestamp: new Date().toISOString(),
      note: validation.error,
    });
    return { added: false, reason: validation.error };
  }

  const queue = getQueue();
  if (isDuplicateSyncOperation(queue, operation)) {
    return { added: false, reason: 'Duplicate operation blocked.' };
  }

  const next = [operation, ...queue];
  const trimmed = trimQueueToLimit(next);
  if (trimmed.droppedCount > 0) {
    console.warn(`[Curavon] Sync queue trimmed by ${trimmed.droppedCount} items.`);
    logSyncEvent({
      operationType: operation.operationType,
      entityType: operation.entityType,
      success: true,
      retryCount: operation.retryCount,
      timestamp: new Date().toISOString(),
      note: `Queue trimmed by ${trimmed.droppedCount}.`,
    });
  }

  safeWrite(SYNC_QUEUE_KEY, trimmed.queue);
  updateSyncState({
    pendingCount: trimmed.queue.filter((item) => item.status === 'queued').length,
  });
  return { added: true };
}

export function removeFromQueue(id: string) {
  const next = getQueue().filter((item) => item.id !== id);
  safeWrite(SYNC_QUEUE_KEY, next);
  updateSyncState({
    pendingCount: next.filter((item) => item.status === 'queued').length,
  });
}

export function getPendingOperations(): SyncOperation[] {
  return getQueue().filter((item) => item.status === 'queued');
}

export function markAsSynced(id: string) {
  const next = getQueue().map((item) => (item.id === id ? { ...item, status: 'success' as const } : item));
  safeWrite(SYNC_QUEUE_KEY, next);
  updateSyncState({
    pendingCount: next.filter((item) => item.status === 'queued').length,
    lastSyncTime: new Date().toISOString(),
  });
}

export function markAsFailed(id: string, error: string) {
  const next = getQueue().map((item) =>
    item.id === id
      ? {
          ...item,
          status: 'failed' as const,
          retryCount: item.retryCount + 1,
          lastError: error,
        }
      : item,
  );
  safeWrite(SYNC_QUEUE_KEY, next);
  const state = getSyncState();
  updateSyncState({
    pendingCount: next.filter((item) => item.status === 'queued').length,
    syncErrors: [error, ...state.syncErrors].slice(0, 20),
  });
}

export function queueSyncOperation(input: {
  userId: string;
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
  source?: 'local' | 'future_backend';
}) {
  const op: SyncOperation = {
    id: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    entityType: input.entityType,
    operationType: input.operationType,
    payload: input.payload,
    timestamp: new Date().toISOString(),
    status: 'queued',
    retryCount: 0,
    source: input.source ?? 'local',
  };
  return addToQueue(op);
}

export function queueSyncForCurrentUser(input: {
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
  source?: 'local' | 'future_backend';
}) {
  const userId = safeRead<string>(APP_STORAGE_KEYS.authDemoUserId, 'local-anon-user');
  return queueSyncOperation({
    ...input,
    userId,
  });
}

export async function processQueue(): Promise<SyncResult> {
  const pending = getPendingOperations();
  if (pending.length === 0) {
    updateSyncState({ syncInProgress: false, pendingCount: 0 });
    return {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      conflictItems: 0,
      timestamp: new Date().toISOString(),
    };
  }

  updateSyncState({ syncInProgress: true });
  let syncedItems = 0;
  let failedItems = 0;
  let conflictItems = 0;

  for (const operation of pending) {
    await sleep(randomDelayMs());
    const random = Math.random();
    if (random <= 0.8) {
      markAsSynced(operation.id);
      syncedItems += 1;
      logSyncEvent({
        operationType: operation.operationType,
        entityType: operation.entityType,
        success: true,
        retryCount: operation.retryCount,
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    if (random > 0.95) {
      const nextQueue = getQueue().map((item) =>
        item.id === operation.id ? { ...item, status: 'conflict' as const, lastError: 'Conflict detected' } : item,
      );
      safeWrite(SYNC_QUEUE_KEY, nextQueue);
      conflictItems += 1;
      logSyncEvent({
        operationType: operation.operationType,
        entityType: operation.entityType,
        success: false,
        retryCount: operation.retryCount,
        timestamp: new Date().toISOString(),
        note: 'conflict',
      });
      continue;
    }

    if (canRetry(operation)) {
      markAsFailed(operation.id, 'Simulated sync failure');
      failedItems += 1;
      logSyncEvent({
        operationType: operation.operationType,
        entityType: operation.entityType,
        success: false,
        retryCount: operation.retryCount + 1,
        timestamp: new Date().toISOString(),
        note: 'retry_scheduled',
      });
    } else {
      markAsFailed(operation.id, 'Max retries exceeded');
      failedItems += 1;
      logSyncEvent({
        operationType: operation.operationType,
        entityType: operation.entityType,
        success: false,
        retryCount: operation.retryCount,
        timestamp: new Date().toISOString(),
        note: 'retry_limit_reached',
      });
    }
  }

  const queue = getQueue();
  updateSyncState({
    syncInProgress: false,
    lastSyncTime: new Date().toISOString(),
    pendingCount: queue.filter((item) => item.status === 'queued').length,
    conflictCount: queue.filter((item) => item.status === 'conflict').length,
  });

  return {
    success: failedItems === 0 && conflictItems === 0,
    syncedItems,
    failedItems,
    conflictItems,
    timestamp: new Date().toISOString(),
  };
}

export async function retryFailed(): Promise<SyncResult> {
  const queue = getQueue().map((item) =>
    item.status === 'failed'
      ? { ...item, status: 'queued' as const, lastError: undefined }
      : item,
  );
  safeWrite(SYNC_QUEUE_KEY, queue);
  updateSyncState({
    pendingCount: queue.filter((item) => item.status === 'queued').length,
  });
  return processQueue();
}
