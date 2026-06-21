import type { ActivityInsight, ActivityInsightStore } from '../../types/activityInsights';

import {

  fetchActivityInsightStore,

  saveActivityInsightStoreRecord,

} from '../data/productDataService';



const EMPTY_STORE: ActivityInsightStore = {

  insights: [],

  ruleGeneratedAt: null,

  lastAiRunAt: null,

  summaryHash: null,

};



let activityInsightStoreCache: ActivityInsightStore = EMPTY_STORE;



export async function hydrateActivityInsightStore(): Promise<ActivityInsightStore> {

  activityInsightStoreCache = await fetchActivityInsightStore();

  return activityInsightStoreCache;

}



export function resetActivityInsightStoreCacheForTests(): void {

  activityInsightStoreCache = EMPTY_STORE;

}



export function loadActivityInsightStore(): ActivityInsightStore {

  return activityInsightStoreCache;

}



export function loadActivityInsights(): ActivityInsight[] {

  return activityInsightStoreCache.insights;

}



export function saveActivityInsights(insights: ActivityInsight[], patch?: Partial<ActivityInsightStore>) {

  activityInsightStoreCache = {

    ...activityInsightStoreCache,

    ...patch,

    insights: insights.slice(0, 8),

  };

  void saveActivityInsightStoreRecord(activityInsightStoreCache).catch(() => {

    /* surfaced via UI refresh */

  });

}



export async function clearActivityInsights(): Promise<void> {

  activityInsightStoreCache = EMPTY_STORE;

  const { softDeleteUserRows } = await import('../data/supabaseDataClient');

  await softDeleteUserRows('activity_insights');

}



export function getActivityInsightLastAiRunAt(): string | null {

  return activityInsightStoreCache.lastAiRunAt;

}



export function getActivityInsightSummaryHash(): string | null {

  return activityInsightStoreCache.summaryHash;

}


