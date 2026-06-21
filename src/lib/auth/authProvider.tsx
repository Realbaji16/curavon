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
import { mapSupabaseClientSession } from './supabaseAuthAdapter';
import { getBrowserSupabaseClient } from '../supabase/browserClient';

const SUPABASE_AUTH_EVENTS = new Set([
  'INITIAL_SESSION',
  'SIGNED_IN',
  'SIGNED_OUT',
  'TOKEN_REFRESHED',
  'USER_UPDATED',
]);

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

  const applySession = useCallback((next: AuthSession) => {
    setSession(next);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    let bootstrapFallbackId: ReturnType<typeof setTimeout> | undefined;

    const finishBootstrap = (next: AuthSession) => {
      if (cancelled) return;
      if (bootstrapFallbackId) {
        clearTimeout(bootstrapFallbackId);
        bootstrapFallbackId = undefined;
      }
      applySession(next);
    };

    const bootstrap = async () => {
      if (mode !== 'supabase') {
        finishBootstrap(await adapter.getSession());
        return;
      }

      const client = getBrowserSupabaseClient();
      if (!client) {
        finishBootstrap(await adapter.getSession());
        return;
      }

      bootstrapFallbackId = setTimeout(() => {
        void adapter.getSession().then((next) => {
          finishBootstrap(next);
        });
      }, 3000);

      const {
        data: { subscription },
      } = client.auth.onAuthStateChange((event, supabaseSession) => {
        if (cancelled || !SUPABASE_AUTH_EVENTS.has(event)) return;
        finishBootstrap(mapSupabaseClientSession(supabaseSession));
      });

      unsubscribe = () => subscription.unsubscribe();
    };

    void bootstrap();

    return () => {
      cancelled = true;
      if (bootstrapFallbackId) clearTimeout(bootstrapFallbackId);
      unsubscribe?.();
    };
  }, [adapter, applySession, mode]);

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
    const next = await adapter.getSession();
    setSession(next);
  }, [adapter]);

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
    const next = await adapter.getSession();
    setSession(next);
  }, [adapter]);

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
