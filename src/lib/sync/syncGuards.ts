import type { SyncEntityType, SyncOperation, SyncOperationType } from './syncTypes';

export const MAX_RETRIES = 3;
export const MAX_QUEUE_SIZE = 200;

const VALID_ENTITY_TYPES: SyncEntityType[] = [
  'health_profile',
  'daily_checkins',
  'ask_history',
  'doctor_summary',
  'next_action_state',
  'red_flag_logs',
  'follow_ups',
  'memory_snapshot',
  'guide_results',
  'user_preferences',
];

const VALID_OPERATION_TYPES: SyncOperationType[] = [
  'create',
  'update',
  'delete',
  'bulk_export',
  'bulk_import',
];

function isPayloadEmpty(payload: Record<string, unknown>): boolean {
  if (!payload) return true;
  return Object.keys(payload).length === 0;
}

export function validateSyncOperation(operation: SyncOperation): { valid: boolean; error?: string } {
  if (!operation.userId?.trim()) return { valid: false, error: 'Missing userId.' };
  if (!VALID_ENTITY_TYPES.includes(operation.entityType)) {
    return { valid: false, error: 'Invalid entityType.' };
  }
  if (!VALID_OPERATION_TYPES.includes(operation.operationType)) {
    return { valid: false, error: 'Invalid operationType.' };
  }
  if (isPayloadEmpty(operation.payload)) {
    return { valid: false, error: 'Empty payload.' };
  }
  try {
    JSON.stringify(operation.payload);
  } catch {
    return { valid: false, error: 'Corrupted payload.' };
  }
  return { valid: true };
}

export function canRetry(operation: SyncOperation): boolean {
  return operation.retryCount < MAX_RETRIES;
}

export function isDuplicateSyncOperation(queue: SyncOperation[], operation: SyncOperation): boolean {
  return queue.some(
    (item) =>
      item.userId === operation.userId &&
      item.entityType === operation.entityType &&
      item.operationType === operation.operationType &&
      item.status === 'queued' &&
      JSON.stringify(item.payload) === JSON.stringify(operation.payload),
  );
}

export function trimQueueToLimit(queue: SyncOperation[]): {
  queue: SyncOperation[];
  droppedCount: number;
} {
  if (queue.length <= MAX_QUEUE_SIZE) return { queue, droppedCount: 0 };
  const critical = queue.filter((item) => item.entityType === 'red_flag_logs');
  const nonCritical = queue.filter((item) => item.entityType !== 'red_flag_logs');
  const allowedNonCritical = Math.max(0, MAX_QUEUE_SIZE - critical.length);
  const trimmed = [...critical, ...nonCritical.slice(0, allowedNonCritical)];
  return {
    queue: trimmed.slice(0, MAX_QUEUE_SIZE),
    droppedCount: Math.max(0, queue.length - trimmed.length),
  };
}
