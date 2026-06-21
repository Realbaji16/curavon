import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

describe('Next.js proxy auth protection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    mockGetUser.mockReset();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses proxy.ts at repo root with canonical export and matcher', async () => {
    expect(readFileSync(path.join(REPO_ROOT, 'proxy.ts'), 'utf8')).toMatch(/export async function proxy/);
    expect(readFileSync(path.join(REPO_ROOT, 'proxy.ts'), 'utf8')).toMatch(/matcher:\s*\['\/app\/:path\*'\]/);
    expect(() => readFileSync(path.join(REPO_ROOT, 'middleware.ts'), 'utf8')).toThrow();
  });

  it('does not protect routes when Supabase auth is not configured', async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'local_demo';
    const { proxy, shouldProtectAppRoutes } = await import('../../proxy');

    expect(shouldProtectAppRoutes()).toBe(false);

    const response = await proxy(new NextRequest('http://localhost/app'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('allows public routes without redirect in Supabase mode', async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { proxy } = await import('../../proxy');
    const response = await proxy(new NextRequest('http://localhost/'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated /app access to home', async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { proxy } = await import('../../proxy');
    const response = await proxy(new NextRequest('http://localhost/app/today'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/');
  });

  it('allows authenticated /app access', async () => {
    process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });

    const { proxy } = await import('../../proxy');
    const response = await proxy(new NextRequest('http://localhost/app'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(mockGetUser).toHaveBeenCalled();
  });
});
