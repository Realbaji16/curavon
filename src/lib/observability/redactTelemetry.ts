/** Allowlist/banned-key sanitizer for safe product analytics. */

export const ALLOWED_TELEMETRY_PROPERTY_KEYS = new Set([
  'event_type',
  'flow_id',
  'risk_level',
  'privacy_level',
  'status',
  'route_name',
  'safety_flag',
  'blocked_reason',
  'module_version',
  'environment',
  'error_code',
  'duration_ms',
  'tool_count',
  'action_status',
  'request_status',
]);

export const BANNED_TELEMETRY_PROPERTY_KEYS = new Set([
  'concern',
  'symptom',
  'symptoms',
  'medication',
  'medication_name',
  'doctor_summary',
  'summary_body',
  'notes',
  'title',
  'description',
  'raw_text',
  'prompt',
  'response',
  'free_text',
  'user_message',
  'blocker_notes',
  'userinput',
  'user_text',
  'instruction',
  'body',
  'guidanceshown',
  'matchedconcern',
  'mainconcern',
  'concerntype',
]);

const ENUM_LIKE_KEYS = new Set([
  'event_type',
  'risk_level',
  'privacy_level',
  'status',
  'route_name',
  'blocked_reason',
  'error_code',
  'action_status',
  'request_status',
]);

const SAFE_ENUM_PATTERN = /^[a-z][a-z0-9_:-]{0,63}$/i;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_SAFE_STRING_LENGTH = 80;

export function isBannedTelemetryKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return BANNED_TELEMETRY_PROPERTY_KEYS.has(normalized);
}

export function isAllowedTelemetryKey(key: string): boolean {
  return ALLOWED_TELEMETRY_PROPERTY_KEYS.has(key.toLowerCase());
}

export function redactSuspiciousString(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '[redacted]';
  if (trimmed.length > MAX_SAFE_STRING_LENGTH) return '[redacted]';
  return trimmed;
}

function sanitizeStringProperty(key: string, value: string): string | number | boolean | undefined {
  const normalizedKey = key.toLowerCase();
  if (normalizedKey === 'flow_id') {
    return UUID_PATTERN.test(value.trim()) ? value.trim() : undefined;
  }
  if (ENUM_LIKE_KEYS.has(normalizedKey)) {
    const trimmed = value.trim();
    return SAFE_ENUM_PATTERN.test(trimmed) ? trimmed : '[redacted]';
  }
  return redactSuspiciousString(value);
}

function sanitizePropertyValue(
  key: string,
  value: unknown,
): string | number | boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return sanitizeStringProperty(key, value);
  return undefined;
}

export function sanitizeTelemetryProperties(
  properties: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  if (!properties) return {};
  const safe: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (isBannedTelemetryKey(key)) continue;
    if (!isAllowedTelemetryKey(key)) continue;
    const sanitized = sanitizePropertyValue(key, value);
    if (sanitized !== undefined) {
      safe[key.toLowerCase()] = sanitized;
    }
  }

  return safe;
}

export function extractSafeFlowId(
  properties: Record<string, unknown> | undefined,
): string | null {
  const flowId = properties?.flow_id;
  if (typeof flowId !== 'string') return null;
  const trimmed = flowId.trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}
