import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAIIntakePost } from '../lib/server/aiIntakeHandler';
import { getServerAIConfig } from '../lib/server/aiConfig';

vi.mock('../lib/supabase/serverClient', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '../lib/supabase/serverClient';

const ENV_KEYS = [
  'NEXT_PUBLIC_AUTH_MODE',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'OPENAI_API_KEY',
  'AI_ENABLED',
] as const;

const originalEnv: Record<string, string | undefined> = {};

function saveEnv() {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
  }
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

function postIntake(body: Record<string, unknown>) {
  return handleAIIntakePost(
    new Request('http://localhost/api/ai/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  );
}

describe('AI intake route (Fix 7)', () => {
  beforeEach(() => {
    saveEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    vi.mocked(createSupabaseServerClient).mockReset();
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

    const { status, body } = await postIntake({ input: 'mild headache for two days' });

    expect(status).toBe(401);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('unauthenticated');
  });

  it('rejects empty input with 400', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();

    const { status, body } = await postIntake({ input: '   ' });

    expect(status).toBe(400);
    expect(body.error?.code).toBe('empty_input');
  });

  it('returns safe mock response when AI_ENABLED=false', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';
    process.env.OPENAI_API_KEY = 'sk-should-not-appear';

    const concern = 'mild headache for two days';
    const { status, body } = await postIntake({ input: concern });

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.mode).toBe('intake');
    expect(body.result?.questions.length).toBeGreaterThan(0);
    expect(body.result?.nextStep).toBe('answer_questions');
    expect(body.safety.allowed).toBe(true);
  });

  it('returns controlled 503 when AI_ENABLED=true but server key is missing', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'true';
    delete process.env.OPENAI_API_KEY;

    const { status, body } = await postIntake({ input: 'mild headache for two days' });

    expect(status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('ai_unavailable');
  });

  it('never exposes OPENAI_API_KEY in the response', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';
    process.env.OPENAI_API_KEY = 'sk-test-secret-key-value';

    const { body } = await postIntake({ input: 'mild headache for two days' });
    const serialized = JSON.stringify(body);

    expect(serialized).not.toContain('sk-test-secret-key-value');
    expect(serialized).not.toContain('OPENAI_API_KEY');
    expect(getServerAIConfig().apiKey).toBe('sk-test-secret-key-value');
    expect(serialized).not.toContain(getServerAIConfig().apiKey);
  });

  it('blocks urgent language without echoing raw input', async () => {
    configureSupabaseEnv();
    mockAuthenticatedUser();
    process.env.AI_ENABLED = 'false';

    const rawInput = 'I have chest pain and trouble breathing';
    const { status, body } = await postIntake({ input: rawInput });
    const serialized = JSON.stringify(body);

    expect(status).toBe(422);
    expect(body.safety.allowed).toBe(false);
    expect(body.safety.riskLevel).toBe('urgent');
    expect(body.error?.code).toBe('safety_blocked');
    expect(serialized).not.toContain(rawInput);
  });
});
