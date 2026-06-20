import type { GuideResultRecord } from '../types/guideResult';
import { fetchGuideResults, saveGuideResultRecord } from '../lib/data/productDataService';

export type { GuideResultRecord } from '../types/guideResult';

let guideResultsCache: GuideResultRecord[] = [];

export async function hydrateGuideResults(): Promise<GuideResultRecord[]> {
  guideResultsCache = await fetchGuideResults();
  return guideResultsCache;
}

export function resetGuideResultsCacheForTests(): void {
  guideResultsCache = [];
}

export function loadGuideResults(): GuideResultRecord[] {
  return guideResultsCache;
}

export function saveGuideResult(record: GuideResultRecord): void {
  guideResultsCache = [record, ...guideResultsCache.filter((item) => item.guideId !== record.guideId || item.completedAt !== record.completedAt)].slice(0, 50);
  void saveGuideResultRecord(record).catch(() => {
    /* surfaced via context refresh */
  });
}
