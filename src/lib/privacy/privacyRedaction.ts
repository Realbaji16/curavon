/** Shared redaction for analytics, agent events, and privacy API payloads. */

export const SENSITIVE_PAYLOAD_KEYS = new Set([
  'prompt',
  'rawprompt',
  'userinput',
  'symptoms',
  'symptom',
  'medications',
  'medication',
  'medicationnames',
  'doctorsummary',
  'summarybody',
  'body',
  'notes',
  'usernotes',
  'concern',
  'currentconcern',
  'mainconcern',
  'maintconcern',
  'concerntype',
  'compressedsnapshot',
  'healthtext',
  'title',
  'flowtitle',
  'flow_title',
  'privatetitle',
  'private_title',
  'instruction',
  'actiontext',
  'summarytext',
  'watchfor',
  'sexualhealth',
  'sexual_health',
  'sexual',
  'reason',
  'details',
  'user_text',
  'usertext',
  'guidanceshown',
  'matchedconcern',
]);

const MAX_SAFE_STRING_LENGTH = 120;

export function redactPrivacyPayload(
  payload: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!payload) return {};
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SENSITIVE_PAYLOAD_KEYS.has(key.toLowerCase())) continue;
    if (typeof value === 'string' && value.length > MAX_SAFE_STRING_LENGTH) {
      safe[key] = `[redacted:${value.length}chars]`;
      continue;
    }
    if (Array.isArray(value)) {
      safe[key] = value.map((entry) =>
        typeof entry === 'string' && entry.length > MAX_SAFE_STRING_LENGTH
          ? `[redacted:${entry.length}chars]`
          : entry,
      );
      continue;
    }
    safe[key] = value;
  }
  return safe;
}

export function buildSafeAgentEventPayload(input: {
  eventType: string;
  riskLevel?: string;
  privacyLevel?: string;
  status?: string;
  moduleVersion?: string;
  outputType?: string;
  safetyFlag?: boolean;
  toolsCalled?: string[];
  cache?: string;
  stage?: string;
}): Record<string, unknown> {
  return {
    event_type: input.eventType,
    ...(input.riskLevel ? { risk_level: input.riskLevel } : {}),
    ...(input.privacyLevel ? { privacy_level: input.privacyLevel } : {}),
    ...(input.status ? { status: input.status } : {}),
    ...(input.moduleVersion ? { module_version: input.moduleVersion } : {}),
    ...(input.outputType ? { output_type: input.outputType } : {}),
    ...(input.safetyFlag !== undefined ? { safety_flag: input.safetyFlag } : {}),
    ...(input.toolsCalled ? { tools_called: input.toolsCalled } : {}),
    ...(input.cache ? { cache: input.cache } : {}),
    ...(input.stage ? { stage: input.stage } : {}),
  };
}

export function sanitizeAgentEventSummary(summary: string | null | undefined): string | null {
  if (!summary || !summary.trim()) return null;
  const trimmed = summary.trim();
  if (trimmed.length > 160) {
    return `[redacted:${trimmed.length}chars]`;
  }
  return trimmed;
}
