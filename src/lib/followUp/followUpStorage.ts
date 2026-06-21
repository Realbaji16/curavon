import type { FollowUpOutcome, FollowUpRecord } from './followUpTypes';

import { todayDateKey } from '../../utils/healthUtils';

import {

  fetchFollowUps,

  patchFollowUpRecord,

  saveFollowUpRecord,

} from '../data/productDataService';



let followUpsCache: FollowUpRecord[] = [];



export async function hydrateFollowUps(): Promise<FollowUpRecord[]> {

  followUpsCache = await fetchFollowUps();

  return followUpsCache;

}



export function resetFollowUpsCacheForTests(): void {

  followUpsCache = [];

}



export function getFollowUps(): FollowUpRecord[] {

  return followUpsCache;

}



export function saveFollowUp(record: FollowUpRecord): FollowUpRecord | null {

  if (record.linkedSafetyLevel === 'urgent' || record.linkedActionCategory === 'escalate') {

    return null;

  }

  const sameDay = new Date(record.createdAt).toISOString().slice(0, 10);

  const duplicate = followUpsCache.find(

    (item) =>

      item.actionId === record.actionId &&

      item.createdAt.slice(0, 10) === sameDay &&

      item.status === 'pending',

  );

  if (duplicate) return duplicate;



  followUpsCache = [record, ...followUpsCache].slice(0, 200);

  void saveFollowUpRecord(record).catch(() => {

    /* surfaced via context refresh */

  });

  return record;

}



export function updateFollowUp(id: string, patch: Partial<FollowUpRecord>) {

  followUpsCache = followUpsCache.map((item) => (item.id === id ? { ...item, ...patch } : item));

  void patchFollowUpRecord(id, patch).catch(() => {

    /* surfaced via context refresh */

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

  followUpsCache = followUpsCache.map((item) => {

    if (item.id !== id) return item;

    return {

      ...item,

      status: 'completed' as const,

      outcome,

      userNote: userNote?.trim() || undefined,

    };

  });

  void patchFollowUpRecord(id, {

    status: 'completed',

    outcome,

    userNote: userNote?.trim() || undefined,

  }).catch(() => {

    /* surfaced via context refresh */

  });

}



export async function clearFollowUps(): Promise<void> {

  followUpsCache = [];

  const { softDeleteUserRows } = await import('../data/supabaseDataClient');

  await softDeleteUserRows('follow_ups');

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


