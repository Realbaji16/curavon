import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createAuthAdapter } from './authAdapter';
import type { AuthMode, AuthSession, CuravonUser } from './authTypes';

type CuravonAuthContextValue = {
  user: CuravonUser | null;
  session: AuthSession;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (patch: Partial<Pick<CuravonUser, 'displayName' | 'email'>>) => Promise<void>;
  deleteLocalAccount: () => Promise<void>;
};

const CuravonAuthContext = createContext<CuravonAuthContextValue | null>(null);

export function CuravonAuthProvider({
  children,
  mode = 'local_demo',
}: {
  children: ReactNode;
  mode?: AuthMode;
}) {
  const adapter = useMemo(() => createAuthAdapter(mode), [mode]);
  const [session, setSession] = useState<AuthSession>({
    user: null,
    isAuthenticated: false,
    authMode: mode,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setSession((prev) => ({ ...prev, loading: true }));
    const next = await adapter.getSession();
    setSession(next);
  }, [adapter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setSession((prev) => ({ ...prev, loading: true, error: null }));
      const next = await adapter.signInWithEmail(email, password);
      setSession(next);
    },
    [adapter],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setSession((prev) => ({ ...prev, loading: true, error: null }));
      const next = await adapter.signUpWithEmail(email, password, displayName);
      setSession(next);
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
    async (patch: Partial<Pick<CuravonUser, 'displayName' | 'email'>>) => {
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

export function useCuravonAuth() {
  const ctx = useContext(CuravonAuthContext);
  if (!ctx) throw new Error('useCuravonAuth must be used within CuravonAuthProvider');
  return ctx;
}
