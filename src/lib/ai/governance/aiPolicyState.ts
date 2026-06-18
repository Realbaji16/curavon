import { APP_STORAGE_KEYS } from '../../data/storageKeys';
import { safeRead, safeWrite } from '../../../utils/healthStorage';
import type { AIAllowedTask, AIBlockReason } from './aiPolicyTypes';

type SourceType = 'ask' | 'today' | 'guides' | 'doctor_summary' | 'followup' | 'memory';

export type AIPolicyState = {
  aiEnabled: boolean;
  apiKeyPresent: boolean;
  sessionCallCount: number;
  dailyCallCount: number;
  lastAIUsedAt: string | null;
  blockedCount: number;
  fallbackCount: number;
  safetyOverrideCount: number;
  taskCounts: Partial<Record<AIAllowedTask, number>>;
  sourceCounts: Partial<Record<SourceType, number>>;
  lastBlockReason?: AIBlockReason;
};

const DEFAULT_POLICY_STATE: AIPolicyState = {
  aiEnabled: true,
  apiKeyPresent: false,
  sessionCallCount: 0,
  dailyCallCount: 0,
  lastAIUsedAt: null,
  blockedCount: 0,
  fallbackCount: 0,
  safetyOverrideCount: 0,
  taskCounts: {},
  sourceCounts: {},
};

export function getAIState(): AIPolicyState {
  return safeRead<AIPolicyState>(APP_STORAGE_KEYS.aiPolicyState, DEFAULT_POLICY_STATE);
}

export function updateAIState(patch: Partial<AIPolicyState>) {
  const state = getAIState();
  safeWrite(APP_STORAGE_KEYS.aiPolicyState, { ...state, ...patch });
}

export function recordAIAllowed(task: AIAllowedTask, source: SourceType) {
  const state = getAIState();
  updateAIState({
    sessionCallCount: state.sessionCallCount + 1,
    dailyCallCount: state.dailyCallCount + 1,
    lastAIUsedAt: new Date().toISOString(),
    taskCounts: { ...state.taskCounts, [task]: (state.taskCounts[task] ?? 0) + 1 },
    sourceCounts: { ...state.sourceCounts, [source]: (state.sourceCounts[source] ?? 0) + 1 },
  });
}

export function recordAIBlocked(blockReason: AIBlockReason, source: SourceType) {
  const state = getAIState();
  updateAIState({
    blockedCount: state.blockedCount + 1,
    lastBlockReason: blockReason,
    sourceCounts: { ...state.sourceCounts, [source]: (state.sourceCounts[source] ?? 0) + 1 },
  });
}

export function recordFallback(_task: AIAllowedTask, source: SourceType) {
  const state = getAIState();
  updateAIState({
    fallbackCount: state.fallbackCount + 1,
    sourceCounts: { ...state.sourceCounts, [source]: (state.sourceCounts[source] ?? 0) + 1 },
  });
}

export function recordSafetyOverride(source: SourceType) {
  const state = getAIState();
  updateAIState({
    safetyOverrideCount: state.safetyOverrideCount + 1,
    sourceCounts: { ...state.sourceCounts, [source]: (state.sourceCounts[source] ?? 0) + 1 },
  });
}

export function getAIDebugStatus() {
  const state = getAIState();
  return {
    aiEnabled: state.aiEnabled,
    callsUsedThisSession: state.sessionCallCount,
    fallbackCount: state.fallbackCount,
    blockedCount: state.blockedCount,
    lastBlockReason: state.lastBlockReason ?? null,
  };
}
