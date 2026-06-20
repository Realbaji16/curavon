import type { AuthError, SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_NETWORK_ERROR_MESSAGE =
  'Could not reach Supabase. Check your connection or ad blocker, then sign in again.';

export function isFetchFailure(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') return true;
  if (error instanceof Error && /failed to fetch/i.test(error.message)) return true;
  return false;
}

export function isRecoverableAuthError(error: AuthError | null | undefined): boolean {
  if (!error) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('refresh token') ||
    message.includes('invalid') ||
    message.includes('expired') ||
    message.includes('session') ||
    error.status === 401 ||
    error.status === 403
  );
}

/** Clears persisted Supabase auth tokens without requiring a network round-trip. */
export async function clearLocalSupabaseSession(client: SupabaseClient): Promise<void> {
  try {
    await client.auth.signOut({ scope: 'local' });
  } catch {
    // ignore — best-effort local cleanup
  }
}
