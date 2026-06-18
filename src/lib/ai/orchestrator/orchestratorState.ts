type OrchestratorRuntimeState = {
  sessionAIUsageCount: number;
  lastAIUsedTimestamp: string | null;
  cachedRequests: Map<string, Record<string, unknown>>;
  blockedRequests: string[];
  fallbackUsageCount: number;
};

const runtimeState: OrchestratorRuntimeState = {
  sessionAIUsageCount: 0,
  lastAIUsedTimestamp: null,
  cachedRequests: new Map<string, Record<string, unknown>>(),
  blockedRequests: [],
  fallbackUsageCount: 0,
};

export function getOrchestratorState() {
  return runtimeState;
}

export function incrementAIUsage() {
  runtimeState.sessionAIUsageCount += 1;
  runtimeState.lastAIUsedTimestamp = new Date().toISOString();
}

export function incrementFallbackUsage() {
  runtimeState.fallbackUsageCount += 1;
}

export function setCachedRequest(key: string, result: Record<string, unknown>) {
  runtimeState.cachedRequests.set(key, result);
}

export function getCachedRequest(key: string): Record<string, unknown> | null {
  return runtimeState.cachedRequests.get(key) ?? null;
}

export function addBlockedRequest(key: string) {
  if (!runtimeState.blockedRequests.includes(key)) {
    runtimeState.blockedRequests = [key, ...runtimeState.blockedRequests].slice(0, 100);
  }
}

export function hasBlockedRequest(key: string): boolean {
  return runtimeState.blockedRequests.includes(key);
}

export function resetOrchestratorSession() {
  runtimeState.sessionAIUsageCount = 0;
  runtimeState.lastAIUsedTimestamp = null;
  runtimeState.cachedRequests.clear();
  runtimeState.blockedRequests = [];
  runtimeState.fallbackUsageCount = 0;
}
