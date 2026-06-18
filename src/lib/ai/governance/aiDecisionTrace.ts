import { readDecisionTraces, writeDecisionTraces } from './aiObservabilityStorage';
import type { AIDecisionTrace } from './aiObservabilityTypes';

export function recordAIDecisionTrace(trace: AIDecisionTrace) {
  const traces = readDecisionTraces();
  writeDecisionTraces([trace, ...traces].slice(0, 100));
}
