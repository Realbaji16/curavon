import { patchAppShellState, getAppShellState } from './appShellState';
import { writePersistedAppShell } from './appShellPersistence';
import {
  isHealthProfileSetupComplete,
  notifyAppShellSync,
  profileSetupFromHealthProfile,
} from './profileSetupSync';
import type { HealthProfile } from '../../types/health';

/** Mark onboarding shell complete when Supabase health profile already has setup data. */
export function syncAppShellFromHealthProfile(profile: HealthProfile, userId?: string | null): boolean {
  if (!isHealthProfileSetupComplete(profile)) return false;

  const profileSetup = profileSetupFromHealthProfile(profile);
  patchAppShellState({
    consentComplete: true,
    setupComplete: true,
    profileSetup,
  });

  if (userId) {
    const shell = getAppShellState();
    writePersistedAppShell(userId, {
      onboardingSeen: shell.onboardingSeen,
      consentComplete: true,
      setupComplete: true,
      profileSetup,
    });
  }

  notifyAppShellSync();
  return true;
}
