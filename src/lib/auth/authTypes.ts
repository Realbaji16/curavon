export type AuthMode = 'local_demo';

export interface CuravonUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  updatedAt: string;
  authMode: AuthMode;
  consentCompleted: boolean;
  setupCompleted: boolean;
}

export interface AuthSession {
  user: CuravonUser | null;
  isAuthenticated: boolean;
  authMode: AuthMode;
  loading: boolean;
  error: string | null;
}

export interface AuthAdapter {
  getSession(): Promise<AuthSession>;
  signInWithEmail(email: string, password: string): Promise<AuthSession>;
  signUpWithEmail(email: string, password: string, displayName?: string): Promise<AuthSession>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  updateProfile(patch: Partial<Pick<CuravonUser, 'displayName' | 'email'>>): Promise<AuthSession>;
  deleteLocalAccount(): Promise<void>;
}
