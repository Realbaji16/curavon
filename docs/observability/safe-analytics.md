# Safe analytics (pilot)

Curavon product and safety observability uses an allowlisted analytics layer. **No raw health content** is sent to analytics, agent events, or error reporters.

## Module locations

- `src/lib/observability/safeAnalytics.ts` — `trackSafeEvent(eventName, properties)`
- `src/lib/observability/redactTelemetry.ts` — property allowlist and redaction
- `src/lib/observability/errorReporter.ts` — `reportSafeError` (console by default)

Events persist to Supabase `agent_events` via the data adapter when the user is authenticated. There is **no localStorage** queue.

## Allowed event names

| Event | When fired |
| --- | --- |
| `profile_completed` | Onboarding / profile setup finished |
| `ask_submitted` | Ask Curavon intake completed (non-urgent) |
| `red_flag_triggered` | Urgent red-flag path (category only) |
| `flow_created` | Draft health flow created |
| `flow_activated` | User approves flow / adds to Today |
| `action_done` | Next action marked done |
| `action_blocked` | Next action blocked |
| `action_adjusted` | Next action adjusted |
| `summary_export_requested` | Doctor summary export API request |
| `data_export_requested` | Account export API request |
| `data_deletion_requested` | Deletion API request |
| `unsafe_response_blocked` | Server blocked unsafe AI output |
| `ai_route_called` | Server AI route succeeded |
| `ai_route_blocked` | Server AI route blocked (safety/auth) |
| `care_circle_invite_created` | Care Circle invite row created |
| `sensitive_mode_enabled` | User enables Sensitive Mode |

## Allowed property keys

`event_type`, `flow_id` (UUID only), `risk_level`, `privacy_level`, `status`, `route_name`, `safety_flag`, `blocked_reason`, `module_version`, `environment`, `error_code`, `duration_ms`, `tool_count`, `action_status`, `request_status`

## Banned property keys (dropped)

`concern`, `symptom`, `symptoms`, `medication`, `medication_name`, `doctor_summary`, `summary_body`, `notes`, `title`, `description`, `raw_text`, `prompt`, `response`, `free_text`, `user_message`, `blocker_notes`, and related health-text aliases.

Strings longer than 80 characters or failing enum patterns for coded fields are replaced with `[redacted]`.

## Safe payload examples

```json
{
  "event_type": "red_flag_triggered",
  "blocked_reason": "chest_pain",
  "risk_level": "urgent",
  "safety_flag": true,
  "route_name": "ask_curavon",
  "module_version": "safe_analytics_v1",
  "environment": "production"
}
```

```json
{
  "event_type": "flow_created",
  "flow_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "privacy_level": "sensitive",
  "risk_level": "low",
  "status": "awaiting_user_approval"
}
```

```json
{
  "event_type": "ai_route_blocked",
  "route_name": "ai_intake",
  "error_code": "safety_blocked",
  "safety_flag": true,
  "risk_level": "urgent"
}
```

## Unsafe payload examples (never send)

```json
{
  "concern": "burning pain after intercourse",
  "symptoms": "discharge and fever",
  "medication_name": "estradiol",
  "title": "Track pelvic pain daily",
  "prompt": "User said: ...",
  "response": "Try rest and ..."
}
```

## Enabling Sentry or PostHog later

1. Install the SDK (`@sentry/nextjs` or `posthog-js`).
2. Set `NEXT_PUBLIC_SENTRY_DSN` or PostHog project key in environment.
3. Wire capture calls **only** through `reportSafeError` / `trackSafeEvent` — never pass raw request bodies or health fields.
4. For third-party tools, hash or omit `flow_id`; keep Supabase `agent_events` as the internal correlation store.
5. Disable session replay on health screens unless explicitly approved and scrubbed.

## Pilot monitoring checklist

- [ ] `agent_events` rows contain only allowlisted keys (spot-check in Supabase)
- [ ] Red-flag events include category + risk, never user free text
- [ ] Sensitive Mode events omit flow titles
- [ ] AI route blocked events fire on 422 safety responses
- [ ] Export/deletion requests log `request_status: pending` only
- [ ] No localStorage analytics buffers in production builds
- [ ] Error reporter never logs full Error messages over 120 chars
- [ ] Third-party analytics (if added) use hashed IDs only
