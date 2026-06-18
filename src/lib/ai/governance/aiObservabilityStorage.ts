import { APP_STORAGE_KEYS } from '../../data/storageKeys';
import { safeRead, safeWrite } from '../../../utils/healthStorage';
import type { AIDecisionTrace, AIObservabilitySummary } from './aiObservabilityTypes';

export function safeReadAIStorage<T>(key: string, fallback: T): T {
  return safeRead<T>(key, fallback);
}

export function safeWriteAIStorage(key: string, value: unknown) {
  safeWrite(key, value);
}

export function trimDecisionTraces(traces: AIDecisionTrace[]): AIDecisionTrace[] {
  return traces.slice(0, 100);
}

export function readDecisionTraces(): AIDecisionTrace[] {
  return safeReadAIStorage<AIDecisionTrace[]>(APP_STORAGE_KEYS.aiDecisionTraces, []);
}

export function writeDecisionTraces(traces: AIDecisionTrace[]) {
  safeWriteAIStorage(APP_STORAGE_KEYS.aiDecisionTraces, trimDecisionTraces(traces));
}

export function readObservabilitySummary(): AIObservabilitySummary | null {
  return safeReadAIStorage<AIObservabilitySummary | null>(APP_STORAGE_KEYS.aiObservabilitySummary, null);
}

export function writeObservabilitySummary(summary: AIObservabilitySummary) {
  safeWriteAIStorage(APP_STORAGE_KEYS.aiObservabilitySummary, summary);
}

export function clearAIObservabilityData() {
  safeWriteAIStorage(APP_STORAGE_KEYS.aiDecisionTraces, []);
  safeWriteAIStorage(APP_STORAGE_KEYS.aiObservabilitySummary, null);
  safeWriteAIStorage(APP_STORAGE_KEYS.aiPolicyState, null);
  safeWriteAIStorage(APP_STORAGE_KEYS.aiBudgetState, null);
}
