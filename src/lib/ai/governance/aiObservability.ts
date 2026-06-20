import { getAIBudgetState } from './aiBudget';
import {
  readSessionDecisionTraces,
  readSessionObservabilitySummary,
  writeSessionObservabilitySummary,
} from '../../data/operationalDataService';
import type { AIObservabilitySummary } from './aiObservabilityTypes';

function summarize(): AIObservabilitySummary {
  const traces = readSessionDecisionTraces();
  const blockReasons = new Map<string, number>();
  const taskBreakdown: Record<string, number> = {};
  const sourceBreakdown: Record<string, number> = {};

  let aiUsedCount = 0;
  let aiBlockedCount = 0;
  let fallbackCount = 0;
  let safetyOverrideCount = 0;
  let cacheHitCount = 0;
  let estimatedTokensUsed = 0;

  traces.forEach((trace) => {
    taskBreakdown[trace.task] = (taskBreakdown[trace.task] ?? 0) + 1;
    sourceBreakdown[trace.source] = (sourceBreakdown[trace.source] ?? 0) + 1;
    if (trace.aiUsed) aiUsedCount += 1;
    if (!trace.allowed) aiBlockedCount += 1;
    if (trace.fallbackUsed) fallbackCount += 1;
    if (trace.blockReason === 'urgent_safety') safetyOverrideCount += 1;
    if (trace.cacheHit) cacheHitCount += 1;
    estimatedTokensUsed += trace.estimatedTokens;
    if (trace.blockReason) {
      blockReasons.set(trace.blockReason, (blockReasons.get(trace.blockReason) ?? 0) + 1);
    }
  });

  const summary: AIObservabilitySummary = {
    totalRequests: traces.length,
    aiUsedCount,
    aiBlockedCount,
    fallbackCount,
    safetyOverrideCount,
    cacheHitCount,
    estimatedTokensUsed,
    mostCommonBlockReasons: Array.from(blockReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
    taskBreakdown,
    sourceBreakdown,
    lastUpdated: new Date().toISOString(),
  };
  writeSessionObservabilitySummary(summary);
  return summary;
}

export function getAIObservabilitySummary(): AIObservabilitySummary {
  return readSessionObservabilitySummary() ?? summarize();
}

export function refreshAIObservabilitySummary(): AIObservabilitySummary {
  return summarize();
}

export function getAISessionCostEstimate() {
  const budget = getAIBudgetState();
  const traces = readSessionDecisionTraces();
  const estimatedTokens = traces.reduce((sum, trace) => sum + trace.estimatedTokens, 0);
  const estimatedCalls = budget.sessionCallCount;
  const highUsageWarning = estimatedCalls >= 2 || estimatedTokens > 1200;
  return {
    estimatedTokens,
    estimatedCalls,
    highUsageWarning,
    recommendedAction: highUsageWarning
      ? 'Prefer deterministic fallback and cache reuse.'
      : 'Current AI usage is within conservative limits.',
  };
}
