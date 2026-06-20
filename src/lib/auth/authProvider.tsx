'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createAuthAdapter } from './authAdapter';
import { CuravonAuthContext } from './authContext';
import type { AuthMode, AuthSession } from './authTypes';
import { getBrowserSupabaseClient } from '../supabase/browserClient';

export function CuravonAuthProvider({
  children,
  mode = 'local_demo',
}: {
  children: ReactNode;
  mode?: AuthMode;
}) {
  const adapter = useMemo(() => createAuthAdapter(mode), [mode]);
  const [session, setSession] = useState<AuthSession>(() => ({
    user: null,
    isAuthenticated: false,
    authMode: mode,
    loading: true,
    error: null,
  }));

  const refresh = useCallback(async () => {
    setSession((prev) => ({ ...prev, loading: true }));
    const next = await adapter.getSession();
    setSession(next);
  }, [adapter]);

  useEffect(() => {
    // One-shot localStorage session hydration; adapter read is async and cannot run during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (mode !== 'supabase') return;
    const client = getBrowserSupabaseClient();
    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        void refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [mode, refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setSession((prev) => ({ ...prev, loading: true, error: null }));
      const next = await adapter.signInWithEmail(email, password);
      setSession(next);
      return next;
    },
    [adapter],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setSession((prev) => ({ ...prev, loading: true, error: null }));
      const next = await adapter.signUpWithEmail(email, password, displayName);
      setSession(next);
      return next;
    },
    [adapter],
  );

  const signOut = useCallback(async () => {
    await adapter.signOut();
    await refresh();
  }, [adapter, refresh]);

  const resetPassword = useCallback(
    async (email: string) => {
      await adapter.resetPassword(email);
    },
    [adapter],
  );

  const updateProfile = useCallback(
    async (patch: Partial<Pick<import('./authTypes').CuravonUser, 'displayName' | 'email'>>) => {
      const next = await adapter.updateProfile(patch);
      setSession(next);
    },
    [adapter],
  );

  const deleteLocalAccount = useCallback(async () => {
    await adapter.deleteLocalAccount();
    await refresh();
  }, [adapter, refresh]);

  return (
    <CuravonAuthContext.Provider
      value={{
        user: session.user,
        session,
        isAuthenticated: session.isAuthenticated,
        loading: session.loading,
        error: session.error,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile,
        deleteLocalAccount,
      }}
    >
      {children}
    </CuravonAuthContext.Provider>
  );
}
