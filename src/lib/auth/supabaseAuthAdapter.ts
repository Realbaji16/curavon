import type { User } from '@supabase/supabase-js';
import { getAppShellState } from '../app/appShellState';
import { getBrowserSupabaseClient } from '../supabase/browserClient';
import {
  clearLocalSupabaseSession,
  isFetchFailure,
  isRecoverableAuthError,
  SUPABASE_NETWORK_ERROR_MESSAGE,
} from '../supabase/supabaseAuthHelpers';
import { syncSupabaseProfileRow } from '../supabase/profileSync';
import type { AuthAdapter, AuthMode, AuthSession, CuravonUser } from './authTypes';

const SUPABASE_MODE: AuthMode = 'supabase';

export const SUPABASE_EMAIL_CONFIRMATION_MESSAGE =
  'Account created. Check your email to confirm your Curavon account, then sign in.';

function mapSupabaseUser(user: User): CuravonUser {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  const displayNameFromMeta =
    (typeof metadata?.display_name === 'string' && metadata.display_name) ||
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    user.email?.split('@')[0] ||
    'Curavon user';
  const shell = getAppShellState();

  return {
    id: user.id,
    email: user.email ?? '',
    displayName: displayNameFromMeta,
    createdAt: user.created_at,
    updatedAt: user.updated_at ?? user.created_at,
    authMode: SUPABASE_MODE,
    consentCompleted: shell.consentComplete,
    setupCompleted: shell.setupComplete,
  };
}

function asSession(
  user: CuravonUser | null,
  error: string | null = null,
): AuthSession {
  const shell = getAppShellState();
  const freshUser = user
    ? {
        ...user,
        consentCompleted: shell.consentComplete,
        setupCompleted: shell.setupComplete,
      }
    : null;

  return {
    user: freshUser,
    isAuthenticated: Boolean(freshUser),
    authMode: SUPABASE_MODE,
    loading: false,
    error,
  };
}

function missingClientSession(): AuthSession {
  return asSession(null, 'Supabase is not configured. Using local demo fallback.');
}

async function syncProfileRow(user: User): Promise<void> {
  try {
    await syncSupabaseProfileRow(user);
  } catch {
    // Non-blocking: local app flow continues if Supabase tables are missing.
  }
}

async function loadAuthenticatedSession(
  client: NonNullable<ReturnType<typeof getBrowserSupabaseClient>>,
): Promise<AuthSession> {
  try {
    const {
      data: { user },
      error,
    } = await client.auth.getUser();

    if (error) {
      if (isRecoverableAuthError(error) || isFetchFailure(error)) {
        await clearLocalSupabaseSession(client);
      }
      if (isFetchFailure(error)) {
        return asSession(null, SUPABASE_NETWORK_ERROR_MESSAGE);
      }
      return asSession(null, error.message);
    }

    if (!user) return asSession(null);

    await syncProfileRow(user);
    return asSession(mapSupabaseUser(user));
  } catch (error) {
    if (isFetchFailure(error)) {
      await clearLocalSupabaseSession(client);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Curavon Supabase auth unreachable; cleared local session.', error);
      }
      return asSession(null, SUPABASE_NETWORK_ERROR_MESSAGE);
    }
    return asSession(null, 'Could not load Supabase session.');
  }
}

export function createSupabaseAuthAdapter(): AuthAdapter {
  return {
    async getSession() {
      const client = getBrowserSupabaseClient();
      if (!client) return missingClientSession();
      return loadAuthenticatedSession(client);
    },

    async signInWithEmail(email, password) {
      const client = getBrowserSupabaseClient();
      if (!client) return missingClientSession();

      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) return asSession(null, error.message);
      if (!data.user) return asSession(null, 'Sign in failed. Please try again.');

      await syncProfileRow(data.user);
      return asSession(mapSupabaseUser(data.user));
    },

    async signUpWithEmail(email, password, displayName) {
      const client = getBrowserSupabaseClient();
      if (!client) return missingClientSession();

      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await client.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            display_name: displayName?.trim() || normalizedEmail.split('@')[0] || 'Curavon user',
          },
        },
      });

      if (error) return asSession(null, error.message);

      if (!data.session?.user) {
        return asSession(null, SUPABASE_EMAIL_CONFIRMATION_MESSAGE);
      }

      await syncProfileRow(data.session.user);
      return asSession(mapSupabaseUser(data.session.user));
    },

    async signOut() {
      const client = getBrowserSupabaseClient();
      if (!client) return;
      try {
        await client.auth.signOut();
      } catch (error) {
        if (isFetchFailure(error)) {
          await clearLocalSupabaseSession(client);
        }
      }
    },

    async resetPassword(email) {
      const client = getBrowserSupabaseClient();
      if (!client) {
        throw new Error('Supabase is not configured.');
      }

      const redirectTo =
        typeof window !== 'undefined'
          ? `${window.location.origin}/`
          : undefined;

      const { error } = await client.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        redirectTo ? { redirectTo } : undefined,
      );

      if (error) throw new Error(error.message);
    },

    async updateProfile(patch) {
      const client = getBrowserSupabaseClient();
      if (!client) return missingClientSession();

      const { data: sessionData, error: sessionError } = await client.auth.getUser();
      if (sessionError) return asSession(null, sessionError.message);
      if (!sessionData.user) {
        return asSession(null, 'No authenticated user.');
      }

      const current = mapSupabaseUser(sessionData.user);
      const nextDisplayName = patch.displayName ?? current.displayName;
      const nextEmail = (patch.email ?? current.email).trim().toLowerCase();

      const { data, error } = await client.auth.updateUser({
        email: patch.email ? nextEmail : undefined,
        data: { display_name: nextDisplayName },
      });

      if (error) return asSession(null, error.message);
      if (!data.user) return asSession(null, 'Profile update failed.');

      await syncProfileRow(data.user);
      return asSession(mapSupabaseUser(data.user));
    },

    async deleteLocalAccount() {
      const client = getBrowserSupabaseClient();
      if (!client) {
        throw new Error('Supabase is not configured.');
      }
      await client.auth.signOut();
    },
  };
}
