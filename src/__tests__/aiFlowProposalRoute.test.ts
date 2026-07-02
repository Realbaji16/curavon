import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAIFlowProposalPost } from '../lib/server/aiFlowProposalHandler';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { serializeIntelligenceForFlowProposal } from '../lib/health-intelligence/services/intelligenceContextSerializer';
import { DataPermissionError } from '../lib/data/dataErrors';
import { getServerAIConfig } from '../lib/server/aiConfig';

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

const mockAdapter = {
  getAskIntakeSession: vi.fn(),
  getGuideResult: vi.fn(),
  createDraftHealthFlow: vi.fn(),
  updateHealthFlowStatus: vi.fn(),
  createRedFlagLog: vi.fn(),
  createAgentEvent: vi.fn(),
};

const ENV_KEYS = [
  'NEXT_PUBLIC_AUTH_MODE',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'OPENAI_API_KEY',
  'AI_ENABLED',
] as const;

const originalEnv: Record<string, string | undefined> = {};

function saveEnv() {
  for (const key of ENV_KEYS) originalEnv[key] = process.env[key];
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}

function configureSupabaseEnv() {
  process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';
}

function mockAuthenticatedUser(userId = 'user-test-123') {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: userId } } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as never);
}

function postFlowProposal(body: Record<string, unknown>) {
  return handleAIFlowProposalPost(
    new Request('http://localhost/api/ai/flow-proposal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

const safeStructuredBody = {
  concernSummary: {
    concernType: 'Physical symptom',
    timeline: 'A few days',
    goal: 'One next step',
  },
  safetyResult: {
    safetyCheckText: 'Mild headache and fatigue for a few days',
  },
  proposedAction: {
    title: 'Track symptoms',
    instruction: 'Write down when symptoms started and what changed.',
    reason: 'Organize notes first.',
    category: 'track',
    safetyLevel: 'normal',
  },
};

describe('AI flow-proposal route', () => {
  beforeEach(() => {
    saveEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(getDataAdapter).mockReturnValue(mockAdapter as never);
    vi.clearAllMocks();

    mockAdapter.createDraftHealthFlow.mockResolvedValue({
      id: 'flow-draft-1',
      userId: 'user-test-123',
      status: 'draft',
      stage: 'intake',
      riskLevel: 'low',
      privacyLevel: 'private',
      moduleVersion: 'health_flow_v1',
      payload: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockAdapter.updateHealthFlowStatus.mockImplementation((_id, patch) =>
      Promise.resolve({
        id: 'flow-draft-1',
        userId: 'user-test-123',
        status: patch.status ?? 'awaiting_user_approval',
        stage: patch.stage ?? 'intake_complete',
        riskLevel: patch.riskLevel ?? 'low',
        privacyLevel: 'private',
        moduleVersion: 'health_flow_v1',
        payload: patch.payload ?? {},
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    mockAdapter.createRedFlagLog.mockResolvedValue({});
    mockAdapter.createAgentEvent.mockResolvedValue({});
  });

  afterEach(() => {
    restoreEnv();
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    configureSupabaseEnv();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const { status, body } = await postFlowProposal(safeStructuredBody);
    expect(status).toBe(401);
    expect(body.error?.code).toBe('unauthenticated');
  });

  it('rejects malformed structured body', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();

    const { status, body } = await postFlowProposal({ concernSummary: { concernType: 'x' } });
    expect(status).toBe(400);
    expect(body.error?.code).toBe('invalid_body');
  });

  it('creates draft flow only for safe proposals', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';

    const { status, body } = await postFlowProposal(safeStructuredBody);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.flowId).toBe('flow-draft-1');
    expect(body.flowStatus).toBe('awaiting_user_approval');
    expect(body.proposedAction?.instruction).toContain('Write down');
    expect(mockAdapter.createDraftHealthFlow).toHaveBeenCalledTimes(1);
    expect(mockAdapter.createDraftHealthFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.not.objectContaining({
          intelligenceContext: expect.anything(),
        }),
      }),
    );
    expect(mockAdapter.updateHealthFlowStatus).toHaveBeenCalledWith(
      'flow-draft-1',
      expect.objectContaining({ status: 'awaiting_user_approval', stage: 'intake_complete' }),
    );
    expect(mockAdapter.createAgentEvent).toHaveBeenCalled();
  });

  it('stores intelligenceContext on draft flow payload when provided', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';

    const intelligenceContext = serializeIntelligenceForFlowProposal(
      runHealthIntelligencePipeline({
        rawText: 'my body hot since yesterday and took malaria drug',
      }),
    );

    const { status, body } = await postFlowProposal({
      ...safeStructuredBody,
      intelligenceContext,
    });

    expect(status).toBe(200);
    expect(body.proposedAction?.title).toMatch(/fever timeline|follow up/i);
    expect(body.proposedAction?.instruction.toLowerCase()).toMatch(/fever|medicine|symptom|worsen|persist/);
    expect(mockAdapter.createDraftHealthFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          intelligenceContext,
          actionPreview: expect.objectContaining({
            actionId: expect.stringMatching(/save_symptom_timeline|follow_up_if_worse_or_persistent/),
          }),
        }),
      }),
    );
  });

  it('does not activate flow automatically', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';

    await postFlowProposal(safeStructuredBody);

    expect(mockAdapter.updateHealthFlowStatus).not.toHaveBeenCalledWith(
      'flow-draft-1',
      expect.objectContaining({ status: 'active' }),
    );
  });

  it('blocks urgent red-flag proposals without normal self-care action', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';

    mockAdapter.updateHealthFlowStatus.mockImplementation((_id, patch) =>
      Promise.resolve({
        id: 'flow-blocked-1',
        status: patch.status ?? 'safety_blocked',
        stage: patch.stage ?? 'safety_escalation',
        riskLevel: 'urgent',
        privacyLevel: 'private',
        moduleVersion: 'health_flow_v1',
        payload: patch.payload ?? {},
        userId: 'user-test-123',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    mockAdapter.createDraftHealthFlow.mockResolvedValue({
      id: 'flow-blocked-1',
      userId: 'user-test-123',
      status: 'draft',
      stage: 'intake',
      riskLevel: 'urgent',
      privacyLevel: 'private',
      moduleVersion: 'health_flow_v1',
      payload: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });

    const rawSafetyText = 'I have chest pain and cannot breathe';
    const { status, body } = await postFlowProposal({
      ...safeStructuredBody,
      safetyResult: { safetyCheckText: rawSafetyText },
    });
    const serialized = JSON.stringify(body);

    expect(status).toBe(422);
    expect(body.safety.allowed).toBe(false);
    expect(body.error?.code).toBe('safety_blocked');
    expect(body.flowStatus).toBe('safety_blocked');
    expect(body.proposedAction).toBeUndefined();
    expect(mockAdapter.createRedFlagLog).toHaveBeenCalled();
    expect(serialized).not.toContain(rawSafetyText);
    expect(serialized).not.toContain('OPENAI_API_KEY');
  });

  it('returns controlled 503 when AI_ENABLED=true but key is missing', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    const { status, body } = await postFlowProposal(safeStructuredBody);
    expect(status).toBe(503);
    expect(body.error?.code).toBe('ai_unavailable');
  });

  it('returns data_permission when Supabase table grants are missing', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';
    mockAdapter.createDraftHealthFlow.mockRejectedValueOnce(new DataPermissionError());

    const { status, body } = await postFlowProposal(safeStructuredBody);
    expect(status).toBe(503);
    expect(body.error?.code).toBe('data_permission');
  });

  it('never exposes provider key in response when AI is disabled', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';
    process.env.OPENAI_API_KEY = 'sk-test-secret-key-value';

    const { body } = await postFlowProposal(safeStructuredBody);
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain('sk-test-secret-key-value');
    expect(serialized).not.toContain('OPENAI_API_KEY');
    expect(getServerAIConfig().apiKey).toBe('sk-test-secret-key-value');
    expect(serialized).not.toContain(getServerAIConfig().apiKey);
  });

  it('route files do not import localStorage modules', () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const routePath = path.resolve(__dirname, '../../app/api/ai/flow-proposal/route.ts');
    const handlerPath = path.resolve(__dirname, '../lib/server/aiFlowProposalHandler.ts');
    const pattern = /\blocalStorage\b|healthStorage|storageKeys/;
    expect(pattern.test(readFileSync(routePath, 'utf8'))).toBe(false);
    expect(pattern.test(readFileSync(handlerPath, 'utf8'))).toBe(false);
  });
});
