import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfiguredAuthMode } from '../lib/auth/authConfig';
import { buildHealthApiResponse } from '../lib/server/apiHealth';
import { buildSessionApiResponse } from '../lib/server/apiSession';
import {
  getBrowserSupabaseClient,
  resetBrowserSupabaseClientForTests,
} from '../lib/supabase/browserClient';
import { hasSupabasePublicConfig } from '../lib/supabase/supabaseEnv';
import { resetSupabaseClientForTests } from '../lib/supabase/supabaseClient';

vi.mock('../lib/supabase/serverClient', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '../lib/supabase/serverClient';

const ENV_KEYS = [
  'NEXT_PUBLIC_AUTH_MODE',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
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

function clearSupabaseEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
  resetBrowserSupabaseClientForTests();
  resetSupabaseClientForTests();
}

import { REQUIRED_CURAVON_TABLES } from '../lib/supabase/curavonSchemaTables';

describe('Supabase SSR/auth hardening (Step 19)', () => {
  beforeEach(() => {
    saveEnv();
    clearSupabaseEnv();
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  afterEach(() => {
    restoreEnv();
    resetBrowserSupabaseClientForTests();
    resetSupabaseClientForTests();
    vi.restoreAllMocks();
  });

  it('browser client returns null when env is missing', () => {
    expect(getBrowserSupabaseClient()).toBeNull();
    expect(hasSupabasePublicConfig()).toBe(false);
  });

  it('falls back to local_demo when Supabase config is missing', () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getConfiguredAuthMode()).toBe('local_demo');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('health API payload does not expose keys or secrets', () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_secret_like_value';

    const payload = buildHealthApiResponse();
    const serialized = JSON.stringify(payload);

    expect(payload).toMatchObject({
      ok: true,
      app: 'curavon',
      framework: 'next',
      supabaseConfigured: true,
      authMode: 'supabase',
    });
    expect(serialized).not.toContain('sb_publishable_secret_like_value');
    expect(serialized).not.toMatch(/service_role/i);
    expect(serialized).not.toContain('NEXT_PUBLIC');
  });

  it('session API returns safe unauthenticated response when server client is unavailable', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue(null);

    const session = await buildSessionApiResponse();
    expect(session).toEqual({
      authenticated: false,
      authMode: 'local_demo',
    });
  });

  it('session API returns safe unauthenticated supabase response without user', async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';

    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const session = await buildSessionApiResponse();
    expect(session).toEqual({
      authenticated: false,
      authMode: 'supabase',
    });
    expect(session).not.toHaveProperty('email');
  });

  it('browser client modules do not reference service_role', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const browserSource = readFileSync(
      path.join(repoRoot, 'src/lib/supabase/browserClient.ts'),
      'utf8',
    );
    const envSource = readFileSync(path.join(repoRoot, 'src/lib/supabase/supabaseEnv.ts'), 'utf8');

    expect(browserSource).not.toMatch(/service_role/i);
    expect(envSource).not.toMatch(/service_role/i);
    expect(browserSource).toContain('publishable');
  });

  it('RLS SQL enables policies for all required tables', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const rlsPath = path.join(repoRoot, 'supabase/migrations/20250618100002_curavon_rls_policies.sql');
    expect(existsSync(rlsPath)).toBe(true);

    const rls = readFileSync(rlsPath, 'utf8');
    for (const table of REQUIRED_CURAVON_TABLES) {
      expect(rls).toContain(`alter table public.${table} enable row level security`);
    }
    expect(rls).toContain('auth.uid() = id');
    expect(rls).toContain('auth.uid() = user_id');
    expect(rls).not.toMatch(/to anon/i);
  });
});
