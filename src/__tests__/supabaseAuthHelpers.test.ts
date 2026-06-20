import { describe, expect, it } from 'vitest';
import { isFetchFailure, isRecoverableAuthError } from '../lib/supabase/supabaseAuthHelpers';

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
});
