import type { AIDecisionTrace, AIObservabilitySummary } from '../ai/governance/aiObservabilityTypes';
import type { AIStage } from '../ai/orchestrator/orchestratorTypes';
import {
  buildSafeAgentEventPayload,
  redactPrivacyPayload,
} from '../privacy/privacyRedaction';
import type {
  CreateAiUsageLogInput,
  DataDeletionRequest,
  DataExportRequest,
} from './dataTypes';
import { DataAuthError, DataUnavailableError } from './dataErrors';
import { getDataAdapter } from './getDataAdapter';

const MAX_SESSION_TRACES = 100;

let sessionTraces: AIDecisionTrace[] = [];
let sessionObservabilitySummary: AIObservabilitySummary | null = null;

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
  const payload = redactPrivacyPayload(input.payload);
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
      payload: buildSafeAgentEventPayload({
        eventType: 'orchestrator_step',
        stage: entry.stage,
        status: entry.fallbackUsed ? 'fallback' : entry.aiUsed ? 'completed' : 'skipped',
        moduleVersion: entry.moduleSelected,
        cache: entry.cache,
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
  const response = await fetch('/api/data/export-request', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requestType: payload.exportScope === 'doctor_summary' ? 'doctor_summary_export' : 'account_export',
    }),
  });

  const body = (await response.json()) as {
    ok?: boolean;
    request?: { id: string; status: string; requestType?: string };
    error?: { message?: string };
  };

  if (!response.ok || !body.ok || !body.request) {
    throw new DataUnavailableError(body.error?.message ?? OPERATIONAL_DATA_MESSAGES.unavailable);
  }

  const now = new Date().toISOString();
  return {
    id: body.request.id,
    userId: '',
    requestStatus: body.request.status,
    requestedAt: now,
    payload: redactPrivacyPayload({
      request_type: body.request.requestType ?? 'account_export',
      requestedVia: 'settings',
    }),
    createdAt: now,
    updatedAt: now,
  };
}

export async function requestAccountDataDeletion(input: {
  deletionScope?: string;
  payload?: Record<string, unknown>;
}): Promise<DataDeletionRequest> {
  const requestType =
    input.deletionScope === 'full_account' ? 'full_account_deletion' : 'health_data_deletion';

  const response = await fetch('/api/data/deletion-request', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestType }),
  });

  const body = (await response.json()) as {
    ok?: boolean;
    request?: { id: string; status: string; requestType?: string };
    error?: { message?: string };
  };

  if (!response.ok || !body.ok || !body.request) {
    throw new DataUnavailableError(body.error?.message ?? OPERATIONAL_DATA_MESSAGES.unavailable);
  }

  const now = new Date().toISOString();
  return {
    id: body.request.id,
    userId: '',
    requestStatus: body.request.status,
    deletionScope: requestType === 'full_account_deletion' ? 'full_account' : 'health_data',
    requestedAt: now,
    payload: redactPrivacyPayload({
      request_type: body.request.requestType ?? requestType,
      requestedVia: 'settings',
      account_deleted: false,
      ...input.payload,
    }),
    createdAt: now,
    updatedAt: now,
  };
}

/** Test helper — reset in-memory operational telemetry between cases. */
export function resetOperationalDataForTests() {
  sessionTraces = [];
  sessionObservabilitySummary = null;
}

/** Exported for static redaction tests. */
export function redactTelemetryPayload(payload: Record<string, unknown> | undefined): Record<string, unknown> {
  return redactPrivacyPayload(payload);
}

export type SafeAiUsageLogInput = CreateAiUsageLogInput;
