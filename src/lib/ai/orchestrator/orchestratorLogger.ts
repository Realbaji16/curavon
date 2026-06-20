import { recordOrchestratorAgentEvent } from '../../data/operationalDataService';
import type { AIStage } from './orchestratorTypes';

type OrchestratorLog = {
  timestamp: string;
  source: 'ask' | 'today' | 'guides' | 'doctor_summary' | 'followup' | 'memory';
  stage: AIStage;
  aiUsed: boolean;
  moduleSelected: string;
  reason: string;
  cache: 'hit' | 'miss';
  fallbackUsed: boolean;
};

export function logOrchestratorEvent(entry: OrchestratorLog) {
  recordOrchestratorAgentEvent(entry);
}

export function getOrchestratorLogs(): OrchestratorLog[] {
  return [];
}

export function clearOrchestratorLogs() {
  // Orchestrator events are persisted via Supabase agent_events; no local log buffer.
}
