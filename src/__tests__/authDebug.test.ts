import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAuthDebugState } from '../lib/auth/authDebug';

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

describe('auth debug utility', () => {
  beforeEach(() => {
    saveEnv();
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    restoreEnv();
  });

  it('returns safe debug state without exposing keys', () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';

    const state = getAuthDebugState();
    const serialized = JSON.stringify(state);

    expect(state.resolvedAuthMode).toBe('supabase');
    expect(state.hasSupabaseConfig).toBe(true);
    expect(state.usingSupabase).toBe(true);
    expect(state.safeSupabaseUrlHost).toBe('example.supabase.co');
    expect(state.publishableKeyPresent).toBe(true);
    expect(state.environmentSource).toBe('next_public');
    expect(serialized).not.toContain('sb_publishable_test_key');
  });

  it('shows local_demo fallback when Supabase env is missing', () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';

    const state = getAuthDebugState();
    expect(state.requestedAuthMode).toBe('supabase');
    expect(state.resolvedAuthMode).toBe('local_demo');
    expect(state.usingSupabase).toBe(false);
    expect(state.hasSupabaseConfig).toBe(false);
  });
});
