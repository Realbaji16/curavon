export type SyncStatus = 'idle' | 'queued' | 'syncing' | 'success' | 'failed' | 'conflict';

export type SyncOperationType = 'create' | 'update' | 'delete' | 'bulk_export' | 'bulk_import';

export type SyncEntityType =
  | 'health_profile'
  | 'daily_checkins'
  | 'ask_history'
  | 'doctor_summary'
  | 'next_action_state'
  | 'red_flag_logs'
  | 'follow_ups'
  | 'memory_snapshot'
  | 'guide_results'
  | 'user_preferences';

export interface SyncOperation {
  id: string;
  userId: string;
  entityType: SyncEntityType;
  operationType: SyncOperationType;
  payload: Record<string, unknown>;
  timestamp: string;
  status: SyncStatus;
  retryCount: number;
  lastError?: string;
  source: 'local' | 'future_backend';
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  conflictItems: number;
  timestamp: string;
}
