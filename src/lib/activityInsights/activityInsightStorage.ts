import type { ActivityInsight, ActivityInsightStore } from '../../types/activityInsights';
import { safeRead, safeRemove, safeWrite } from '../../utils/healthStorage';

export const ACTIVITY_INSIGHTS_STORAGE_KEY = 'curavon_meta_activity_insights';

const EMPTY_STORE: ActivityInsightStore = {
  insights: [],
  ruleGeneratedAt: null,
  lastAiRunAt: null,
  summaryHash: null,
};

export function loadActivityInsightStore(): ActivityInsightStore {
  return safeRead<ActivityInsightStore>(ACTIVITY_INSIGHTS_STORAGE_KEY, EMPTY_STORE);
}

export function saveActivityInsightStore(store: ActivityInsightStore) {
  safeWrite(ACTIVITY_INSIGHTS_STORAGE_KEY, store);
}

export function loadActivityInsights(): ActivityInsight[] {
  return loadActivityInsightStore().insights;
}

export function saveActivityInsights(insights: ActivityInsight[], patch?: Partial<ActivityInsightStore>) {
  const current = loadActivityInsightStore();
  saveActivityInsightStore({
    ...current,
    ...patch,
    insights: insights.slice(0, 8),
  });
}

export function clearActivityInsights() {
  safeRemove(ACTIVITY_INSIGHTS_STORAGE_KEY);
}

export function getActivityInsightLastAiRunAt(): string | null {
  return loadActivityInsightStore().lastAiRunAt;
}

export function getActivityInsightSummaryHash(): string | null {
  return loadActivityInsightStore().summaryHash;
}
