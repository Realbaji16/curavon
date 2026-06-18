import { APP_STORAGE_KEYS } from '../lib/data/storageKeys';
import { safeRead, safeWrite } from './healthStorage';

export interface GuideResultRecord {
  guideId: string;
  guideTitle: string;
  completedAt: string;
  resultSummary: string;
  safeNextStep: string;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  sourceSignals: string[];
}

export function loadGuideResults(): GuideResultRecord[] {
  return safeRead<GuideResultRecord[]>(APP_STORAGE_KEYS.guideResults, []);
}

export function saveGuideResult(record: GuideResultRecord): void {
  const existing = loadGuideResults();
  const next = [record, ...existing].slice(0, 50);
  safeWrite(APP_STORAGE_KEYS.guideResults, next);
}
