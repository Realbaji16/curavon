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

let policyState: AIPolicyState = { ...DEFAULT_POLICY_STATE };

export function getAIState(): AIPolicyState {
  return policyState;
}

export function updateAIState(patch: Partial<AIPolicyState>) {
  policyState = { ...policyState, ...patch };
}

export function recordAIAllowed(task: AIAllowedTask, source: SourceType) {
  updateAIState({
    sessionCallCount: policyState.sessionCallCount + 1,
    dailyCallCount: policyState.dailyCallCount + 1,
    lastAIUsedAt: new Date().toISOString(),
    taskCounts: { ...policyState.taskCounts, [task]: (policyState.taskCounts[task] ?? 0) + 1 },
    sourceCounts: { ...policyState.sourceCounts, [source]: (policyState.sourceCounts[source] ?? 0) + 1 },
  });
}

export function recordAIBlocked(blockReason: AIBlockReason, source: SourceType) {
  updateAIState({
    blockedCount: policyState.blockedCount + 1,
    lastBlockReason: blockReason,
    sourceCounts: { ...policyState.sourceCounts, [source]: (policyState.sourceCounts[source] ?? 0) + 1 },
  });
}

export function recordFallback(_task: AIAllowedTask, source: SourceType) {
  updateAIState({
    fallbackCount: policyState.fallbackCount + 1,
    sourceCounts: { ...policyState.sourceCounts, [source]: (policyState.sourceCounts[source] ?? 0) + 1 },
  });
}

export function recordSafetyOverride(source: SourceType) {
  updateAIState({
    safetyOverrideCount: policyState.safetyOverrideCount + 1,
    sourceCounts: { ...policyState.sourceCounts, [source]: (policyState.sourceCounts[source] ?? 0) + 1 },
  });
}

export function getAIDebugStatus() {
  return {
    aiEnabled: policyState.aiEnabled,
    callsUsedThisSession: policyState.sessionCallCount,
    fallbackCount: policyState.fallbackCount,
    blockedCount: policyState.blockedCount,
    lastBlockReason: policyState.lastBlockReason ?? null,
  };
}

/** Test helper — reset in-memory policy counters between cases. */
export function resetAIPolicyStateForTests() {
  policyState = { ...DEFAULT_POLICY_STATE };
}
