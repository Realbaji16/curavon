import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAISummaryPost } from '../lib/server/aiSummaryHandler';
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
  getHealthFlow: vi.fn(),
  listFlowActions: vi.fn(),
  listFlowBlockers: vi.fn(),
  listRedFlagLogs: vi.fn(),
  upsertDoctorSummaryDraft: vi.fn(),
  createDoctorSummaryItem: vi.fn(),
  createAgentEvent: vi.fn(),
};

const sampleFlow = {
  id: 'flow-owned-1',
  userId: 'user-test-123',
  status: 'awaiting_user_approval',
  stage: 'intake_complete',
  riskLevel: 'low' as const,
  privacyLevel: 'private' as const,
  moduleVersion: 'health_flow_v1',
  title: 'Track symptoms',
  payload: {
    concernType: 'Physical symptom',
    timeline: 'A few days',
    goal: 'One next step',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
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
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as never);
}

function postSummary(body: Record<string, unknown>) {
  return handleAISummaryPost(
    new Request('http://localhost/api/ai/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('AI summary route', () => {
  beforeEach(() => {
    saveEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    vi.mocked(createSupabaseServerClient).mockReset();
    vi.mocked(getDataAdapter).mockReturnValue(mockAdapter as never);
    vi.clearAllMocks();

    mockAdapter.getHealthFlow.mockResolvedValue(sampleFlow);
    mockAdapter.listFlowActions.mockResolvedValue([
      {
        id: 'action-1',
        userId: 'user-test-123',
        flowId: 'flow-owned-1',
        status: 'pending',
        stage: 'next_action',
        riskLevel: 'low',
        privacyLevel: 'private',
        moduleVersion: 'health_flow_v1',
        actionOrder: 0,
        payload: { instruction: 'Write down when symptoms started.' },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mockAdapter.listFlowBlockers.mockResolvedValue([]);
    mockAdapter.listRedFlagLogs.mockResolvedValue([]);
    mockAdapter.upsertDoctorSummaryDraft.mockResolvedValue({});
    mockAdapter.createDoctorSummaryItem.mockResolvedValue({
      id: 'summary-item-1',
      type: 'ask_intake',
      title: 'Flow summary',
      source: 'Ask Curavon',
      content: 'summary',
      tags: [],
      severity: 'normal',
      createdAt: '2026-01-01T00:00:00.000Z',
      includedInSummary: true,
    });
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
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const { status, body } = await postSummary({ healthFlowId: 'flow-owned-1' });
    expect(status).toBe(401);
    expect(body.error?.code).toBe('unauthenticated');
  });

  it('rejects malformed body', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();

    const { status, body } = await postSummary({});
    expect(status).toBe(400);
    expect(body.error?.code).toBe('empty_input');
  });

  it('rejects health flow not owned by user', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    mockAdapter.getHealthFlow.mockResolvedValue(null);

    const { status, body } = await postSummary({ healthFlowId: 'flow-other-user' });
    expect(status).toBe(404);
    expect(body.error?.code).toBe('flow_not_found');
  });

  it('persists safe summary draft and item when AI is disabled', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';

    const { status, body } = await postSummary({ healthFlowId: 'flow-owned-1' });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.aiUsed).toBe(false);
    expect(body.draftId).toBe('flow-summary-flow-owned-1');
    expect(body.itemId).toBe('summary-item-1');
    expect(body.disclaimer).toContain('not a diagnosis');
    expect(body.sections?.some((section) => section.heading === 'Actions tried')).toBe(true);
    expect(mockAdapter.upsertDoctorSummaryDraft).toHaveBeenCalled();
    expect(mockAdapter.createDoctorSummaryItem).toHaveBeenCalled();
    expect(mockAdapter.createAgentEvent).toHaveBeenCalled();
  });

  it('returns controlled 503 when AI_ENABLED=true but key is missing', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    const { status, body } = await postSummary({ healthFlowId: 'flow-owned-1' });
    expect(status).toBe(503);
    expect(body.error?.code).toBe('ai_unavailable');
  });

  it('never exposes provider key in response', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';
    process.env.OPENAI_API_KEY = 'sk-test-secret-key-value';

    const { body } = await postSummary({ healthFlowId: 'flow-owned-1' });
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain('sk-test-secret-key-value');
    expect(serialized).not.toContain('OPENAI_API_KEY');
    expect(getServerAIConfig().apiKey).toBe('sk-test-secret-key-value');
    expect(serialized).not.toContain(getServerAIConfig().apiKey);
  });

  it('route files do not import localStorage modules', () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const routePath = path.resolve(__dirname, '../../app/api/ai/summary/route.ts');
    const handlerPath = path.resolve(__dirname, '../lib/server/aiSummaryHandler.ts');
    const pattern = /\blocalStorage\b|healthStorage|storageKeys/;
    expect(pattern.test(readFileSync(routePath, 'utf8'))).toBe(false);
    expect(pattern.test(readFileSync(handlerPath, 'utf8'))).toBe(false);
  });
});
