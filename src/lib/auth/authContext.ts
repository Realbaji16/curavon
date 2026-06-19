import { createContext } from 'react';
import type { AuthMode, AuthSession, CuravonUser } from './authTypes';

export type CuravonAuthContextValue = {
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

export const CuravonAuthContext = createContext<CuravonAuthContextValue | null>(null);

export type { AuthMode };
