import {
  extractSafeFlowId,
  sanitizeTelemetryProperties,
} from './redactTelemetry';

export const SAFE_ANALYTICS_MODULE_VERSION = 'safe_analytics_v1';

export const SAFE_ANALYTICS_EVENT_NAMES = [
  'profile_completed',
  'ask_submitted',
  'red_flag_triggered',
  'flow_created',
  'flow_activated',
  'action_done',
  'action_blocked',
  'action_adjusted',
  'summary_export_requested',
  'data_export_requested',
  'data_deletion_requested',
  'unsafe_response_blocked',
  'ai_route_called',
  'ai_route_blocked',
  'care_circle_invite_created',
  'sensitive_mode_enabled',
] as const;

export type SafeAnalyticsEventName = (typeof SAFE_ANALYTICS_EVENT_NAMES)[number];

const ALLOWED_EVENT_NAME_SET = new Set<string>(SAFE_ANALYTICS_EVENT_NAMES);

function resolveEnvironment(): string {
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_APP_ENV) {
    return process.env.NEXT_PUBLIC_APP_ENV;
  }
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  return 'unknown';
}

function persistSafeEvent(
  eventName: SafeAnalyticsEventName,
  payload: Record<string, string | number | boolean>,
  flowId: string | null,
): void {
  void (async () => {
    try {
      const { getDataAdapter } = await import('../data/getDataAdapter');
      await getDataAdapter().createAgentEvent({
        eventType: eventName,
        source: 'safe_analytics',
        summary: eventName,
        status: String(payload.status ?? 'recorded'),
        flowId,
        payload,
        occurredAt: new Date().toISOString(),
      });
    } catch {
      // Analytics must never break user flows.
    }
  })();
}

/**
 * Track a pilot-safe analytics event. Drops banned keys, redacts suspicious strings,
 * persists to Supabase agent_events when authenticated, and never throws.
 */
export function trackSafeEvent(
  eventName: SafeAnalyticsEventName,
  properties?: Record<string, unknown>,
): void {
  try {
    if (!ALLOWED_EVENT_NAME_SET.has(eventName)) return;

    const sanitized = sanitizeTelemetryProperties(properties);
    const flowId = extractSafeFlowId(properties);

    const payload: Record<string, string | number | boolean> = {
      ...sanitized,
      event_type: eventName,
      module_version: SAFE_ANALYTICS_MODULE_VERSION,
      environment: resolveEnvironment(),
    };

    persistSafeEvent(eventName, payload, flowId);

    if (typeof process !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.debug('[safe-analytics]', eventName, payload);
    }
  } catch {
    // Never throw in user-facing runtime.
  }
}

/** Test helper — no-op placeholder; persistence is fire-and-forget. */
export function resetSafeAnalyticsForTests(): void {
  // Intentionally empty — agent_events are remote-only.
}
