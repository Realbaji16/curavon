import { APP_STORAGE_KEYS } from '../../data/storageKeys';
import { safeRead, safeWrite } from '../../../utils/healthStorage';
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

const ORCHESTRATOR_LOG_KEY = APP_STORAGE_KEYS.orchestratorLogs;
const MAX_LOGS = 250;

export function logOrchestratorEvent(entry: OrchestratorLog) {
  const logs = safeRead<OrchestratorLog[]>(ORCHESTRATOR_LOG_KEY, []);
  safeWrite(ORCHESTRATOR_LOG_KEY, [entry, ...logs].slice(0, MAX_LOGS));
}

export function getOrchestratorLogs(): OrchestratorLog[] {
  return safeRead<OrchestratorLog[]>(ORCHESTRATOR_LOG_KEY, []);
}

export function clearOrchestratorLogs() {
  safeWrite(ORCHESTRATOR_LOG_KEY, []);
}
