import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  redactSuspiciousString,
  sanitizeTelemetryProperties,
} from '../lib/observability/redactTelemetry';
import { trackSafeEvent } from '../lib/observability/safeAnalytics';
import { reportSafeError } from '../lib/observability/errorReporter';

const mockCreateAgentEvent = vi.fn().mockResolvedValue({});

vi.mock('../lib/data/getDataAdapter', () => ({
  getDataAdapter: () => ({
    createAgentEvent: mockCreateAgentEvent,
  }),
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('safe analytics layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'debug').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('allows known events with safe properties', async () => {
    trackSafeEvent('flow_created', {
      flow_id: 'a1b2c3d4-e5f6-4780-8bcd-ef1234567890',
      privacy_level: 'sensitive',
      risk_level: 'low',
      status: 'awaiting_user_approval',
    });

    await vi.waitFor(() => expect(mockCreateAgentEvent).toHaveBeenCalledTimes(1));

    const call = mockCreateAgentEvent.mock.calls[0][0];
    expect(call.eventType).toBe('flow_created');
    expect(call.source).toBe('safe_analytics');
    expect(call.flowId).toBe('a1b2c3d4-e5f6-4780-8bcd-ef1234567890');
    expect(call.payload.privacy_level).toBe('sensitive');
    expect(call.payload.event_type).toBe('flow_created');
  });

  it('drops banned keys from properties', () => {
    const sanitized = sanitizeTelemetryProperties({
      concern: 'pelvic pain',
      symptoms: 'burning',
      medication_name: 'estradiol',
      doctor_summary: 'long clinical note',
      title: 'Private flow title',
      prompt: 'User said something sensitive',
      response: 'AI said something sensitive',
      risk_level: 'urgent',
      safety_flag: true,
    });

    expect(sanitized.concern).toBeUndefined();
    expect(sanitized.symptoms).toBeUndefined();
    expect(sanitized.medication_name).toBeUndefined();
    expect(sanitized.title).toBeUndefined();
    expect(sanitized.prompt).toBeUndefined();
    expect(sanitized.response).toBeUndefined();
    expect(sanitized.risk_level).toBe('urgent');
    expect(sanitized.safety_flag).toBe(true);
  });

  it('redacts suspicious long string values', () => {
    const longConcern = 'a'.repeat(200);
    expect(redactSuspiciousString(longConcern)).toBe('[redacted]');
    const sanitized = sanitizeTelemetryProperties({
      route_name: longConcern,
    });
    expect(sanitized.route_name).toBe('[redacted]');
  });

  it('logs red-flag events with category and risk only', async () => {
    trackSafeEvent('red_flag_triggered', {
      blocked_reason: 'chest_pain',
      risk_level: 'urgent',
      safety_flag: true,
      route_name: 'ask_curavon',
      concern: 'crushing chest pain radiating to arm',
      user_message: 'I have chest pain',
    });

    await vi.waitFor(() => expect(mockCreateAgentEvent).toHaveBeenCalled());

    const payload = mockCreateAgentEvent.mock.calls[0][0].payload;
    expect(payload.blocked_reason).toBe('chest_pain');
    expect(payload.risk_level).toBe('urgent');
    expect(payload.concern).toBeUndefined();
    expect(payload.user_message).toBeUndefined();
  });

  it('does not include raw flow title for sensitive mode events', async () => {
    trackSafeEvent('sensitive_mode_enabled', {
      privacy_level: 'sensitive',
      title: 'Track sexual health symptoms daily',
      status: 'enabled',
    });

    await vi.waitFor(() => expect(mockCreateAgentEvent).toHaveBeenCalled());

    const payload = mockCreateAgentEvent.mock.calls[0][0].payload;
    expect(payload.privacy_level).toBe('sensitive');
    expect(payload.title).toBeUndefined();
    expect(JSON.stringify(payload)).not.toMatch(/sexual|symptom/i);
  });

  it('does not pass raw prompt/response for AI route events', async () => {
    trackSafeEvent('ai_route_blocked', {
      route_name: 'ai_intake',
      error_code: 'safety_blocked',
      safety_flag: true,
      prompt: 'User typed private health concern',
      response: 'Model output with treatment suggestion',
    });

    await vi.waitFor(() => expect(mockCreateAgentEvent).toHaveBeenCalled());

    const payload = mockCreateAgentEvent.mock.calls[0][0].payload;
    expect(payload.route_name).toBe('ai_intake');
    expect(payload.error_code).toBe('safety_blocked');
    expect(payload.prompt).toBeUndefined();
    expect(payload.response).toBeUndefined();
  });

  it('never throws when persistence fails', () => {
    mockCreateAgentEvent.mockRejectedValueOnce(new Error('adapter unavailable'));
    expect(() =>
      trackSafeEvent('profile_completed', { status: 'completed' }),
    ).not.toThrow();
  });

  it('does not use localStorage', () => {
    const analyticsPath = path.resolve(__dirname, '../lib/observability/safeAnalytics.ts');
    const source = readFileSync(analyticsPath, 'utf8');
    expect(source.includes('localStorage')).toBe(false);
  });

  it('errorReporter redacts context and long messages', () => {
    reportSafeError(new Error('x'.repeat(200)), {
      concern: 'secret symptom text',
      error_code: 'adapter_failed',
      route_name: 'health_flow',
    });

    expect(console.error).toHaveBeenCalled();
    const args = vi.mocked(console.error).mock.calls[0];
    expect(String(args[1])).not.toMatch(/secret symptom/);
    expect(JSON.stringify(args)).toContain('adapter_failed');
  });
});
