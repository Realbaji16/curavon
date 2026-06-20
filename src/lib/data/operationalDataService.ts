import type { AIDecisionTrace, AIObservabilitySummary } from '../ai/governance/aiObservabilityTypes';
import type { AIStage } from '../ai/orchestrator/orchestratorTypes';
import type {
  CreateAiUsageLogInput,
  DataDeletionRequest,
  DataExportRequest,
} from './dataTypes';
import { DataAuthError, DataUnavailableError } from './dataErrors';
import { getDataAdapter } from './getDataAdapter';

const MAX_SESSION_TRACES = 100;
const SENSITIVE_PAYLOAD_KEYS = new Set([
  'prompt',
  'rawprompt',
  'userinput',
  'symptoms',
  'medications',
  'medication',
  'medicationnames',
  'doctorsummary',
  'body',
  'notes',
  'usernotes',
  'concern',
  'currentconcern',
  'compressedsnapshot',
  'healthtext',
  'summarybody',
]);

let sessionTraces: AIDecisionTrace[] = [];
let sessionObservabilitySummary: AIObservabilitySummary | null = null;

function redactPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!payload) return {};
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_PAYLOAD_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === 'string' && value.length > 160) {
      safe[key] = `[redacted:${value.length}chars]`;
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

function sanitizeDecisionTrace(trace: AIDecisionTrace): AIDecisionTrace {
  return {
    ...trace,
    reason: trace.reason.length > 240 ? `${trace.reason.slice(0, 240)}…` : trace.reason,
  };
}

function persistAdapterCall(task: () => Promise<unknown>) {
  void task().catch(() => {
    // Supabase-only: do not fall back to localStorage on telemetry failures.
  });
}

export function readSessionDecisionTraces(): AIDecisionTrace[] {
  return sessionTraces;
}

export function readSessionObservabilitySummary(): AIObservabilitySummary | null {
  return sessionObservabilitySummary;
}

export function writeSessionObservabilitySummary(summary: AIObservabilitySummary) {
  sessionObservabilitySummary = summary;
}

export function clearSessionObservability() {
  sessionTraces = [];
  sessionObservabilitySummary = null;
}

export function appendDecisionTrace(trace: AIDecisionTrace) {
  const safeTrace = sanitizeDecisionTrace(trace);
  sessionTraces = [safeTrace, ...sessionTraces].slice(0, MAX_SESSION_TRACES);
  persistAdapterCall(async () => {
    await getDataAdapter().createAiDecisionTrace(safeTrace);
  });
}

export function recordSafeAiUsageLog(input: CreateAiUsageLogInput) {
  const payload = redactPayload(input.payload);
  persistAdapterCall(async () => {
    await getDataAdapter().createAiUsageLog({
      ...input,
      payload,
    });
  });
}

export function recordOrchestratorAgentEvent(entry: {
  source: 'ask' | 'today' | 'guides' | 'doctor_summary' | 'followup' | 'memory';
  stage: AIStage;
  aiUsed: boolean;
  moduleSelected: string;
  reason: string;
  cache: 'hit' | 'miss';
  fallbackUsed: boolean;
}) {
  const summary = [
    entry.source,
    entry.stage,
    entry.aiUsed ? 'ai_used' : 'no_ai',
    entry.fallbackUsed ? 'fallback' : 'primary',
    entry.cache === 'hit' ? 'cache_hit' : 'cache_miss',
  ].join(':');

  persistAdapterCall(async () => {
    await getDataAdapter().createAgentEvent({
      eventType: 'orchestrator_step',
      source: entry.source,
      summary,
      status: entry.fallbackUsed ? 'fallback' : entry.aiUsed ? 'completed' : 'skipped',
      payload: redactPayload({
        stage: entry.stage,
        moduleSelected: entry.moduleSelected,
        cache: entry.cache,
        reason: entry.reason.length > 200 ? `${entry.reason.slice(0, 200)}…` : entry.reason,
      }),
      occurredAt: new Date().toISOString(),
    });
  });
}

export function clearOrchestratorAgentEventsForSession() {
  // Orchestrator events are persisted remotely; session has no local queue to clear.
}

export const OPERATIONAL_DATA_MESSAGES = {
  auth: 'Sign in to submit account data requests.',
  unavailable: 'Your request could not be recorded. Try again soon.',
  exportSubmitted: 'Export request submitted. We will notify you when it is ready.',
  deletionSubmitted: 'Deletion request submitted. Your account team will process it.',
} as const;

export function toOperationalDataErrorMessage(error: unknown): string {
  if (error instanceof DataAuthError) return OPERATIONAL_DATA_MESSAGES.auth;
  if (error instanceof DataUnavailableError) return OPERATIONAL_DATA_MESSAGES.unavailable;
  return OPERATIONAL_DATA_MESSAGES.unavailable;
}

export async function requestAccountDataExport(
  payload: Record<string, unknown> = {},
): Promise<DataExportRequest> {
  return getDataAdapter().createDataExportRequest({
    requestStatus: 'requested',
    payload: redactPayload({
      ...payload,
      requestedVia: 'settings',
      requestedAt: new Date().toISOString(),
    }),
  });
}

export async function requestAccountDataDeletion(input: {
  deletionScope?: string;
  payload?: Record<string, unknown>;
}): Promise<DataDeletionRequest> {
  return getDataAdapter().createDataDeletionRequest({
    requestStatus: 'requested',
    deletionScope: input.deletionScope ?? 'health_data',
    payload: redactPayload({
      ...input.payload,
      requestedVia: 'settings',
      requestedAt: new Date().toISOString(),
    }),
  });
}

/** Test helper — reset in-memory operational telemetry between cases. */
export function resetOperationalDataForTests() {
  sessionTraces = [];
  sessionObservabilitySummary = null;
}

/** Exported for static redaction tests. */
export function redactTelemetryPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  return redactPayload(payload);
}

export type SafeAiUsageLogInput = CreateAiUsageLogInput;
