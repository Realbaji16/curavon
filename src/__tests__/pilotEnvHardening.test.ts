import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAIConfig } from '../lib/ai/aiConfig';
import { getServerAIConfig } from '../lib/server/aiConfig';
import { getConfiguredAuthMode, isLocalDemoAuthAllowed } from '../lib/auth/authConfig';
import { getAppEnv } from '../lib/env/appEnv';

describe('pilot env hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_AUTH_MODE;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_ENABLED;
    delete process.env.APP_ENV;
    delete process.env.NEXT_PUBLIC_APP_ENV;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('blocks local demo auth outside development', () => {
    process.env.APP_ENV = 'production';
    process.env.NEXT_PUBLIC_AUTH_MODE = 'local_demo';
    expect(isLocalDemoAuthAllowed()).toBe(false);
    expect(getConfiguredAuthMode()).toBe('supabase');
  });

  it('allows local demo auth in development when configured', () => {
    process.env.APP_ENV = 'development';
    process.env.NEXT_PUBLIC_AUTH_MODE = 'local_demo';
    expect(isLocalDemoAuthAllowed()).toBe(true);
    expect(getConfiguredAuthMode()).toBe('local_demo');
  });

  it('uses server-only OpenAI key and never NEXT_PUBLIC OpenAI', () => {
    process.env.OPENAI_API_KEY = 'sk-test-server-key';
    process.env.AI_ENABLED = 'true';
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = 'should-not-be-used';

    const config = getServerAIConfig();
    expect(config.enabled).toBe(true);
    expect(config.apiKey).toBe('sk-test-server-key');

    const clientConfig = getAIConfig();
    expect(clientConfig.enabled).toBe(false);
    expect(clientConfig.apiKey).toBeUndefined();
  });

  it('defaults app env to development in vitest', () => {
    expect(getAppEnv()).toBe('test');
  });
});
