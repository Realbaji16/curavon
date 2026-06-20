import type { AuthAdapter, AuthMode, AuthSession, CuravonUser } from './authTypes';
import {
  clearCurrentDemoUser,
  clearLocalDemoAccountData,
  getAppShellState,
  readCurrentDemoUser,
  readLocalDemoUsers,
  writeCurrentDemoUser,
  writeLocalDemoUsers,
} from '../app/appShellState';

function makeDemoUser(input: {
  email: string;
  displayName: string;
  mode: AuthMode;
  createdAt?: string;
  userId?: string;
}): CuravonUser {
  const now = new Date().toISOString();
  const shell = getAppShellState();
  return {
    id: input.userId ?? `demo-user-${Math.random().toString(36).slice(2, 8)}`,
    email: input.email.trim().toLowerCase(),
    displayName: input.displayName.trim() || 'Curavon member',
    createdAt: input.createdAt ?? now,
    updatedAt: now,
    authMode: input.mode,
    consentCompleted: shell.consentComplete,
    setupCompleted: shell.setupComplete,
  };
}

function readCurrentUser(mode: AuthMode): CuravonUser | null {
  const stored = readCurrentDemoUser();
  if (!stored) return null;
  const shell = getAppShellState();
  return makeDemoUser({
    email: stored.email,
    displayName: stored.fullName,
    mode,
    userId: shell.authDemoUserId ?? undefined,
  });
}

function asSession(user: CuravonUser | null, mode: AuthMode, error: string | null = null): AuthSession {
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
    authMode: mode,
    loading: false,
    error,
  };
}

export function createLocalAuthAdapter(mode: AuthMode = 'local_demo'): AuthAdapter {
  return {
    async getSession() {
      return asSession(readCurrentUser(mode), mode);
    },

    async signInWithEmail(email, password) {
      const normalizedEmail = email.trim().toLowerCase();
      const users = readLocalDemoUsers();
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
        writeLocalDemoUsers([
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
      writeCurrentDemoUser({ fullName: user.displayName, email: user.email }, user.id);
      return asSession(user, mode);
    },

    async signUpWithEmail(email, password, displayName) {
      const normalizedEmail = email.trim().toLowerCase();
      const users = readLocalDemoUsers();
      const existing = users.find((user) => user.email === normalizedEmail);
      if (existing) {
        return this.signInWithEmail(normalizedEmail, password);
      }

      const user = makeDemoUser({
        email: normalizedEmail,
        displayName: displayName || normalizedEmail.split('@')[0] || 'Curavon member',
        mode,
      });
      writeLocalDemoUsers([
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
      writeCurrentDemoUser({ fullName: user.displayName, email: user.email }, user.id);
      return asSession(user, mode);
    },

    async signOut() {
      clearCurrentDemoUser();
    },

    async resetPassword(email) {
      const normalizedEmail = email.trim().toLowerCase();
      const users = readLocalDemoUsers();
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
      writeCurrentDemoUser({ fullName: next.displayName, email: next.email }, next.id);
      return asSession(next, mode);
    },

    async deleteLocalAccount() {
      const current = readCurrentUser(mode);
      if (!current) return;
      const users = readLocalDemoUsers();
      writeLocalDemoUsers(users.filter((user) => user.userId !== current.id));
      clearLocalDemoAccountData();
    },
  };
}
