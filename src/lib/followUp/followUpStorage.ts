import type { FollowUpOutcome, FollowUpRecord } from './followUpTypes';
import { safeRead, safeWrite, todayDateKey } from '../../utils/healthStorage';
import { APP_STORAGE_KEYS } from '../data/storageKeys';
import { queueSyncForCurrentUser } from '../sync/syncQueue';

const FOLLOW_UPS_KEY = APP_STORAGE_KEYS.followUps;
const FOLLOW_UP_DEBUG_KEY = APP_STORAGE_KEYS.followUpDebugLog;

type FollowUpDebugLog = {
  event: 'created' | 'completed';
  id: string;
  actionId: string;
  outcome?: FollowUpOutcome;
  nextState?: string;
  safetyEscalated?: boolean;
  createdAt: string;
};

function logDebug(event: FollowUpDebugLog) {
  const logs = safeRead<FollowUpDebugLog[]>(FOLLOW_UP_DEBUG_KEY, []);
  safeWrite(FOLLOW_UP_DEBUG_KEY, [event, ...logs].slice(0, 300));
}

export function getFollowUps(): FollowUpRecord[] {
  return safeRead<FollowUpRecord[]>(FOLLOW_UPS_KEY, []);
}

export function saveFollowUp(record: FollowUpRecord) {
  if (record.linkedSafetyLevel === 'urgent' || record.linkedActionCategory === 'escalate') {
    // Safety-first: avoid casual follow-up records for urgent/escalation actions.
    return null;
  }
  const existing = getFollowUps();
  const sameDay = new Date(record.createdAt).toISOString().slice(0, 10);
  const duplicate = existing.find(
    (item) =>
      item.actionId === record.actionId &&
      item.createdAt.slice(0, 10) === sameDay &&
      item.status === 'pending',
  );
  if (duplicate) return duplicate;
  const next = [record, ...existing].slice(0, 200);
  safeWrite(FOLLOW_UPS_KEY, next);
  queueSyncForCurrentUser({
    entityType: 'follow_ups',
    operationType: 'create',
    payload: {
      id: record.id,
      actionId: record.actionId,
      status: record.status,
      createdAt: record.createdAt,
    },
  });
  logDebug({
    event: 'created',
    id: record.id,
    actionId: record.actionId,
    createdAt: new Date().toISOString(),
  });
  return record;
}

export function updateFollowUp(id: string, patch: Partial<FollowUpRecord>) {
  const next = getFollowUps().map((item) => (item.id === id ? { ...item, ...patch } : item));
  safeWrite(FOLLOW_UPS_KEY, next);
  queueSyncForCurrentUser({
    entityType: 'follow_ups',
    operationType: 'update',
    payload: {
      id,
      patchKeys: Object.keys(patch),
      updatedAt: new Date().toISOString(),
    },
  });
}

export function getPendingFollowUps(): FollowUpRecord[] {
  return getFollowUps().filter((item) => item.status === 'pending');
}

export function getDueFollowUps(nowIso = new Date().toISOString()): FollowUpRecord[] {
  const now = new Date(nowIso).getTime();
  return getPendingFollowUps().filter((item) => new Date(item.dueAt).getTime() <= now);
}

export function markFollowUpCompleted(id: string, outcome: FollowUpOutcome, userNote?: string) {
  let actionId = '';
  const next = getFollowUps().map((item) => {
    if (item.id !== id) return item;
    actionId = item.actionId;
    return {
      ...item,
      status: 'completed' as const,
      outcome,
      userNote: userNote?.trim() || undefined,
    };
  });
  safeWrite(FOLLOW_UPS_KEY, next);
  queueSyncForCurrentUser({
    entityType: 'follow_ups',
    operationType: 'update',
    payload: {
      id,
      outcome,
      hasUserNote: Boolean(userNote?.trim()),
      updatedAt: new Date().toISOString(),
    },
  });
  logDebug({
    event: 'completed',
    id,
    actionId,
    outcome,
    createdAt: new Date().toISOString(),
  });
}

export function clearFollowUps() {
  safeWrite(FOLLOW_UPS_KEY, []);
}

export function dueAtForCategory(
  category: string | undefined,
  safetyLevel: 'normal' | 'caution' | 'urgent' | undefined,
): string {
  const now = new Date(`${todayDateKey()}T09:00:00`);
  if (safetyLevel === 'urgent' || category === 'escalate') return now.toISOString();
  if (category === 'prepare') {
    now.setDate(now.getDate() + 2);
    return now.toISOString();
  }
  if (category === 'reduce_friction') {
    now.setHours(now.getHours() + 6);
    return now.toISOString();
  }
  now.setDate(now.getDate() + 1);
  return now.toISOString();
}
