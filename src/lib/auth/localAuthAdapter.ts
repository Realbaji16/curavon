import { APP_STORAGE_KEYS } from '../data/storageKeys';
import { safeRead, safeRemove, safeWrite } from '../../utils/healthStorage';
import type { AuthAdapter, AuthMode, AuthSession, CuravonUser } from './authTypes';

type LocalAuthCredential = {
  email: string;
  /** Local demo auth only. Passwords are not production-secure. Replace with backend auth before public launch. */
  password: string;
  displayName: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

function makeDemoUser(input: {
  email: string;
  displayName: string;
  mode: AuthMode;
  createdAt?: string;
  userId?: string;
}): CuravonUser {
  const now = new Date().toISOString();
  return {
    id: input.userId ?? `demo-user-${Math.random().toString(36).slice(2, 8)}`,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim() || 'Curavon member',
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    authMode: input.mode,
    consentCompleted: safeRead<boolean>(APP_STORAGE_KEYS.consentComplete, false),
    setupCompleted: safeRead<boolean>(APP_STORAGE_KEYS.setupComplete, false),
  };
}

function readCurrentUser(mode: AuthMode): CuravonUser | null {
  const stored = safeRead<{ fullName: string; email: string } | null>(APP_STORAGE_KEYS.authDemoUser, null);
  if (!stored) return null;
  return makeDemoUser({
    email: stored.email,
    displayName: stored.fullName,
    mode,
    userId: safeRead<string>(APP_STORAGE_KEYS.authDemoUserId, ''),
  });
}

function writeCurrentUser(user: CuravonUser) {
  safeWrite(APP_STORAGE_KEYS.authDemoUser, {
    fullName: user.displayName,
    email: user.email,
  });
  safeWrite(APP_STORAGE_KEYS.authDemoUserId, user.id);
}

function asSession(user: CuravonUser | null, mode: AuthMode, error: string | null = null): AuthSession {
  const freshUser = user
    ? {
        ...user,
        consentCompleted: safeRead<boolean>(APP_STORAGE_KEYS.consentComplete, false),
        setupCompleted: safeRead<boolean>(APP_STORAGE_KEYS.setupComplete, false),
      }
    : null;
  return {
    user: freshUser,
    isAuthenticated: Boolean(freshUser),
    authMode: mode,
    loading: false,
    error,
  };
}

export function createLocalAuthAdapter(mode: AuthMode = 'local_demo'): AuthAdapter {
  // Local demo auth only. Passwords are not production-secure. Replace with backend auth before public launch.
  return {
    async getSession() {
      return asSession(readCurrentUser(mode), mode);
    },

    async signInWithEmail(email, password) {
      // Demo-only auth behavior. Real backend authentication should replace this adapter later.
      const normalizedEmail = email.trim().toLowerCase();
      const users = safeRead<LocalAuthCredential[]>(APP_STORAGE_KEYS.authDemoUsers, []);
      const existing = users.find((user) => user.email === normalizedEmail);

      if (existing && existing.password !== password) {
        return asSession(null, mode, 'Incorrect password for this demo account.');
      }

      const displayName =
        existing?.displayName ||
        normalizedEmail.split('@')[0].replace(/[._-]+/g, ' ').trim() ||
        'Curavon member';
      const user = makeDemoUser({
        email: normalizedEmail,
        displayName: displayName.charAt(0).toUpperCase() + displayName.slice(1),
        mode,
        createdAt: existing?.createdAt,
        userId: existing?.userId,
      });

      if (!existing) {
        safeWrite(APP_STORAGE_KEYS.authDemoUsers, [
          ...users,
          {
            email: normalizedEmail,
            password,
            displayName: user.displayName,
            userId: user.id,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        ]);
      }
      writeCurrentUser(user);
      return asSession(user, mode);
    },

    async signUpWithEmail(email, password, displayName) {
      const normalizedEmail = email.trim().toLowerCase();
      const users = safeRead<LocalAuthCredential[]>(APP_STORAGE_KEYS.authDemoUsers, []);
      const existing = users.find((user) => user.email === normalizedEmail);
      if (existing) {
        return this.signInWithEmail(normalizedEmail, password);
      }

      const user = makeDemoUser({
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split('@')[0] || 'Curavon member',
        mode,
      });
      const nextUsers: LocalAuthCredential[] = [
        ...users,
        {
          email: normalizedEmail,
          password,
          displayName: user.displayName,
          userId: user.id,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      ];
      safeWrite(APP_STORAGE_KEYS.authDemoUsers, nextUsers);
      writeCurrentUser(user);
      return asSession(user, mode);
    },

    async signOut() {
      safeRemove(APP_STORAGE_KEYS.authDemoUser);
      safeRemove(APP_STORAGE_KEYS.authDemoUserId);
    },

    async resetPassword(email) {
      // Demo-only no-op reset path for local mode.
      const normalizedEmail = email.trim().toLowerCase();
      const users = safeRead<LocalAuthCredential[]>(APP_STORAGE_KEYS.authDemoUsers, []);
      if (!users.some((user) => user.email === normalizedEmail)) {
        throw new Error('Account not found for this email.');
      }
    },

    async updateProfile(patch) {
      const current = readCurrentUser(mode);
      if (!current) return asSession(null, mode, 'No authenticated user.');
      const next = {
        ...current,
        displayName: patch.displayName ?? current.displayName,
        email: (patch.email ?? current.email).trim().toLowerCase(),
        updatedAt: new Date().toISOString(),
      };
      writeCurrentUser(next);
      return asSession(next, mode);
    },

    async deleteLocalAccount() {
      const current = readCurrentUser(mode);
      if (!current) return;
      const users = safeRead<LocalAuthCredential[]>(APP_STORAGE_KEYS.authDemoUsers, []);
      const nextUsers = users.filter((user) => user.userId !== current.id);
      safeWrite(APP_STORAGE_KEYS.authDemoUsers, nextUsers);
      safeRemove(APP_STORAGE_KEYS.authDemoUser);
      safeRemove(APP_STORAGE_KEYS.authDemoUserId);
      safeRemove(APP_STORAGE_KEYS.consentComplete);
      safeRemove(APP_STORAGE_KEYS.setupComplete);
      safeRemove(APP_STORAGE_KEYS.profileSetup);
    },
  };
}
