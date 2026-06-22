import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getConfiguredAuthMode } from '../lib/auth/authConfig';
import {
  getSupabaseClient,
  hasSupabaseConfig,
  resetSupabaseClientForTests,
} from '../lib/supabase/supabaseClient';
import {
  readSupabaseHealthProfile,
  SupabaseDataError,
} from '../lib/data/supabaseDataClient';

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
  resetSupabaseClientForTests();
}

describe('Supabase connection (Step 18)', () => {
  beforeEach(() => {
    saveEnv();
    clearSupabaseEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    restoreEnv();
    resetSupabaseClientForTests();
  });

  it('returns local_demo when Supabase env is missing', () => {
    expect(getConfiguredAuthMode()).toBe('local_demo');
    expect(hasSupabaseConfig()).toBe(false);
    expect(getSupabaseClient()).toBeNull();
  });

  it('falls back to local_demo when supabase mode is requested without config', () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    expect(getConfiguredAuthMode()).toBe('local_demo');
    expect(hasSupabaseConfig()).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('recognizes Supabase config without requiring service role key', () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';

    expect(getConfiguredAuthMode()).toBe('supabase');
    expect(hasSupabaseConfig()).toBe(true);

    const client = getSupabaseClient();
    expect(client).not.toBeNull();
    expect(typeof client?.auth.getSession).toBe('function');
  });

  it('returns safe error for unauthenticated Supabase data reads', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';

    await expect(readSupabaseHealthProfile()).rejects.toMatchObject({
      code: 'not_authenticated',
    } satisfies Partial<SupabaseDataError>);
  });

  it('includes required SQL and setup docs', () => {
    const repoRoot = path.resolve(__dirname, '../..');
    const required = [
      'supabase/migrations/20250618100001_curavon_app_schema.sql',
      'supabase/migrations/20250618100002_curavon_rls_policies.sql',
      'supabase/migrations/20250618100003_curavon_auth_profile_trigger.sql',
      'supabase/migrations/20250618100004_curavon_table_grants.sql',
      'docs/runbooks/supabase-migrations.md',
      'docs/backend/supabase-schema-v1.sql',
      'docs/backend/supabase-rls-v1.sql',
      'docs/backend/nextjs-supabase-setup.md',
      'docs/backend/nextjs-supabase-env-setup.md',
      'docs/backend/local-to-supabase-migration-plan.md',
    ];

    for (const relativePath of required) {
      const fullPath = path.join(repoRoot, relativePath);
      expect(existsSync(fullPath), `${relativePath} should exist`).toBe(true);
      const contents = readFileSync(fullPath, 'utf8');
      expect(contents.length).toBeGreaterThan(20);
    }

    const schema = readFileSync(path.join(repoRoot, 'docs/backend/supabase-schema-v1.sql'), 'utf8');
    expect(schema).toContain('health_profiles');
    expect(schema).toContain('red_flag_logs');
    expect(schema).not.toMatch(/service_role/i);

    const rls = readFileSync(path.join(repoRoot, 'docs/backend/supabase-rls-v1.sql'), 'utf8');
    expect(rls).toContain('enable row level security');
    expect(rls).toContain('auth.uid() = user_id');
  });
});
