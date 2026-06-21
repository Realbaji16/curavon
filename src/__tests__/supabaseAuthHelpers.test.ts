import { describe, expect, it } from 'vitest';
import {
  isAuthSessionTimeout,
  isFetchFailure,
  isRecoverableAuthError,
  withAuthSessionTimeout,
} from '../lib/supabase/supabaseAuthHelpers';

describe('supabaseAuthHelpers', () => {
  it('detects fetch failures', () => {
    expect(isFetchFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isFetchFailure(new Error('network Failed to fetch'))).toBe(true);
    expect(isFetchFailure(new Error('Invalid login'))).toBe(false);
  });

  it('detects recoverable auth errors', () => {
    expect(
      isRecoverableAuthError({
        message: 'Invalid Refresh Token: Refresh Token Not Found',
        status: 401,
        name: 'AuthApiError',
      }),
    ).toBe(true);
  });

  it('times out hung auth session calls', async () => {
    await expect(
      withAuthSessionTimeout(new Promise(() => undefined), 20),
    ).rejects.toThrow('auth_timeout');
    expect(isAuthSessionTimeout(new Error('auth_timeout'))).toBe(true);
  });
});
