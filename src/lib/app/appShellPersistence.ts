import type { ProfileSetupData } from '../../types/appShell';

export type PersistedAppShell = {
  onboardingSeen: boolean;
  consentComplete: boolean;
  setupComplete: boolean;
  profileSetup: ProfileSetupData | null;
};

const STORAGE_PREFIX = 'curavon:app-shell:';
const ONBOARDING_SEEN_KEY = 'curavon:onboarding-seen';

export function readOnboardingSeen(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ONBOARDING_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeOnboardingSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ONBOARDING_SEEN_KEY, '1');
  } catch {
    // ignore
  }
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

export function readPersistedAppShell(userId: string): PersistedAppShell | null {
  if (typeof window === 'undefined' || !userId) return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedAppShell>;
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      onboardingSeen: Boolean(parsed.onboardingSeen),
      consentComplete: Boolean(parsed.consentComplete),
      setupComplete: Boolean(parsed.setupComplete),
      profileSetup: parsed.profileSetup ?? null,
    };
  } catch {
    return null;
  }
}

export function writePersistedAppShell(userId: string, shell: PersistedAppShell): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(shell));
  } catch {
    // Non-blocking — in-memory shell still works for this session.
  }
}

export function clearPersistedAppShell(userId: string): void {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.removeItem(storageKey(userId));
  } catch {
    // ignore
  }
}
