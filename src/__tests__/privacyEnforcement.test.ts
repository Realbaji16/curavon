import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleDeleteFlowPost,
  handleExportRequestPost,
} from '../lib/server/dataPrivacyHandlers';
import { redactTelemetryPayload } from '../lib/data/operationalDataService';
import {
  getDiscreetActionPreview,
  getDiscreetActionTitle,
  shouldUseDiscreetDisplay,
} from '../lib/privacy/discreetDisplay';
import {
  canMemberAccessAskHistory,
  canMemberAccessDoctorSummaries,
  canMemberAccessHealthContent,
  DEFAULT_MEMBER_SHARING_RULES,
  mergeDefaultSharingRules,
} from '../lib/privacy/careCirclePrivacy';
import {
  GENERIC_SENSITIVE_NOTIFICATION_PREVIEW,
  resolveNotificationPreviewText,
  resolveSensitivePreviewPreference,
} from '../lib/privacy/notificationPreview';
import { buildSafeAgentEventPayload, redactPrivacyPayload } from '../lib/privacy/privacyRedaction';
import { resolveAskPrivacyLevel } from '../lib/data/healthFlowService';

vi.mock('../lib/supabase/serverClient', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('../lib/data/getDataAdapter', () => ({
  getDataAdapter: vi.fn(),
}));

vi.mock('../lib/server/serverDataContext', () => ({
  withServerDataAccess: (_userId: string, _client: unknown, fn: () => Promise<unknown>) => fn(),
}));

import { createSupabaseServerClient } from '../lib/supabase/serverClient';
import { getDataAdapter } from '../lib/data/getDataAdapter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function mockAuthenticatedUser(userId = 'user-privacy-1') {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as never);
}

describe('privacy enforcement', () => {
  describe('Sensitive Mode persistence', () => {
    it('creates health_flow privacy_level sensitive when Sensitive Mode is enabled', () => {
      expect(resolveAskPrivacyLevel(true)).toBe('sensitive');
      expect(resolveAskPrivacyLevel(false)).toBe('private');
    });
  });

  describe('discreet compact dashboard display', () => {
    it('uses discreet labels for sensitive flows in compact views', () => {
      expect(shouldUseDiscreetDisplay(true, 'private')).toBe(true);
      expect(shouldUseDiscreetDisplay(false, 'sensitive')).toBe(true);
      expect(getDiscreetActionTitle('Track pelvic pain daily', true)).toBe('Private health step');
      expect(getDiscreetActionPreview('Write down symptom timing', true)).toBe(
        'Your next step is ready — open to view.',
      );
    });
  });

  describe('Care Circle default permissions', () => {
    const activeMetadataMember = {
      status: 'active',
      permissionLevel: 'metadata_only',
      sharingRules: DEFAULT_MEMBER_SHARING_RULES,
    };

    it('does not grant raw health content access by default', () => {
      expect(canMemberAccessHealthContent(activeMetadataMember)).toBe(false);
      expect(canMemberAccessDoctorSummaries(activeMetadataMember)).toBe(false);
      expect(canMemberAccessAskHistory(activeMetadataMember)).toBe(false);
    });

    it('denies pending invite access', () => {
      const pending = { ...activeMetadataMember, status: 'pending' };
      expect(canMemberAccessHealthContent(pending)).toBe(false);
      expect(canMemberAccessDoctorSummaries(pending)).toBe(false);
      expect(canMemberAccessAskHistory(pending)).toBe(false);
    });

    it('denies removed and blocked member access', () => {
      for (const status of ['removed', 'blocked'] as const) {
        const member = { ...activeMetadataMember, status };
        expect(canMemberAccessHealthContent(member)).toBe(false);
        expect(canMemberAccessAskHistory(member)).toBe(false);
      }
    });

    it('defaults invite sharing rules to deny health details', () => {
      expect(mergeDefaultSharingRules()).toEqual(DEFAULT_MEMBER_SHARING_RULES);
      expect(mergeDefaultSharingRules({ health_flows: true }).health_flows).toBe(true);
      expect(mergeDefaultSharingRules({ health_flows: true }).doctor_summaries).toBe(false);
    });
  });

  describe('analytics and agent event redaction', () => {
    it('redacts raw concern, symptom, and medication text from payloads', () => {
      const redacted = redactPrivacyPayload({
        event_type: 'ask_intake',
        concern: 'burning pelvic pain after intercourse',
        symptoms: 'sharp pain and discharge',
        medications: ['metformin', 'estradiol'],
        privacy_level: 'sensitive',
        status: 'completed',
      });

      expect(redacted.event_type).toBe('ask_intake');
      expect(redacted.privacy_level).toBe('sensitive');
      expect(redacted.concern).toBeUndefined();
      expect(redacted.symptoms).toBeUndefined();
      expect(redacted.medications).toBeUndefined();
    });

    it('builds safe agent event metadata only', () => {
      const payload = buildSafeAgentEventPayload({
        eventType: 'ai_flow_proposal',
        riskLevel: 'low',
        privacyLevel: 'sensitive',
        status: 'completed',
        moduleVersion: 'health_flow_v1',
      });

      expect(payload).toEqual({
        event_type: 'ai_flow_proposal',
        risk_level: 'low',
        privacy_level: 'sensitive',
        status: 'completed',
        module_version: 'health_flow_v1',
      });
    });

    it('redacts orchestrator telemetry concern strings via shared helper', () => {
      const redacted = redactTelemetryPayload({
        taskName: 'ask_intake',
        prompt: 'User reports sexual health concern with medication list',
        symptoms: 'pelvic pain',
        moduleVersion: 'ask-v2',
      });

      expect(redacted.taskName).toBe('ask_intake');
      expect(redacted.prompt).toBeUndefined();
      expect(redacted.symptoms).toBeUndefined();
    });
  });

  describe('notification preview', () => {
    it('uses generic preview for sensitive flows when sensitive_preview is false', () => {
      expect(resolveSensitivePreviewPreference(null)).toBe(false);
      expect(resolveSensitivePreviewPreference({ sensitive_preview: false })).toBe(false);
      expect(
        resolveNotificationPreviewText({
          isSensitive: true,
          sensitivePreviewEnabled: false,
          rawPreview: 'Take ibuprofen for headache',
        }),
      ).toBe(GENERIC_SENSITIVE_NOTIFICATION_PREVIEW);
    });
  });

  describe('export and deletion responses', () => {
    const mockAdapter = {
      createDataExportRequest: vi.fn(),
      deleteHealthFlow: vi.fn(),
    };

    beforeEach(() => {
      process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';
      vi.mocked(getDataAdapter).mockReturnValue(mockAdapter as never);
      vi.clearAllMocks();
      mockAuthenticatedUser();
    });

    it('export request returns request metadata only', async () => {
      mockAdapter.createDataExportRequest.mockResolvedValue({
        id: 'export-req-privacy',
        requestStatus: 'pending',
      });

      const response = await handleExportRequestPost(
        new Request('http://localhost/api/data/export-request', {
          method: 'POST',
          body: JSON.stringify({ requestType: 'account_export' }),
        }),
      );
      const body = response.body as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body.ok).toBe(true);
      expect(JSON.stringify(body)).not.toMatch(/concern|symptom|medication/i);
      expect(body.request).toEqual({
        id: 'export-req-privacy',
        status: 'pending',
        requestType: 'account_export',
      });
    });

    it('delete flow response does not include title or payload details', async () => {
      mockAdapter.deleteHealthFlow.mockResolvedValue({
        flowId: 'flow-sensitive-1',
        status: 'deleted',
      });

      const response = await handleDeleteFlowPost(
        new Request('http://localhost/api/data/delete-flow', {
          method: 'POST',
          body: JSON.stringify({ healthFlowId: 'flow-sensitive-1' }),
        }),
      );
      const body = response.body as Record<string, unknown>;

      expect(response.status).toBe(200);
      expect(body).toEqual({
        ok: true,
        flowId: 'flow-sensitive-1',
        status: 'deleted',
        message: expect.any(String),
      });
      expect(JSON.stringify(body)).not.toMatch(/title|concern|instruction|payload/i);
    });
  });

  describe('no localStorage reintroduction in privacy paths', () => {
    const privacyPaths = [
      '../lib/privacy/privacyRedaction.ts',
      '../lib/privacy/discreetDisplay.ts',
      '../lib/privacy/careCirclePrivacy.ts',
      '../lib/privacy/notificationPreview.ts',
      '../lib/data/healthFlowService.ts',
      '../lib/server/dataPrivacyHandlers.ts',
      '../screens/Home.tsx',
      '../screens/CareCircle.tsx',
    ];

    it.each(privacyPaths)('%s does not use localStorage', (relativePath) => {
      const absolutePath = path.resolve(__dirname, relativePath);
      const source = readFileSync(absolutePath, 'utf8');
      expect(source.includes('localStorage')).toBe(false);
    });
  });
});
