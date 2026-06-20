import { appendDecisionTrace } from '../../data/operationalDataService';
import type { AIDecisionTrace } from './aiObservabilityTypes';

export function recordAIDecisionTrace(trace: AIDecisionTrace) {
  appendDecisionTrace(trace);
}
