import type { ProfileSetupData } from '../../types/appShell';
import type { HealthProfile } from '../../types/health';

/** Light setup is complete once the user has a name — nothing else is required. */
export function isHealthProfileSetupComplete(profile: HealthProfile): boolean {
  return Boolean(profile.preferredName?.trim());
}

export function profileSetupFromHealthProfile(profile: HealthProfile): ProfileSetupData {
  return {
    preferredName: profile.preferredName.trim(),
    primaryGoals: [...profile.primaryGoals],
    smartSilencePreference: profile.smartSilencePreference,
    sensitiveMode: profile.sensitiveMode,
    ageRange: profile.ageRange,
    sex: profile.sex,
    pregnancyStatus: profile.pregnancyStatus,
    stateOrRegion: profile.stateOrRegion,
    languageStyle: profile.languageStyle,
    conditions: [...profile.conditions],
    allergies: [...profile.allergies],
    medications: [...profile.medications],
  };
}

export function healthProfileFromProfileSetup(
  setup: ProfileSetupData & { sensitiveMode: boolean },
): HealthProfile {
  return {
    preferredName: setup.preferredName,
    primaryGoals: setup.primaryGoals,
    sensitiveMode: setup.sensitiveMode,
    smartSilencePreference: setup.smartSilencePreference,
    ageRange: setup.ageRange ?? '',
    sex: setup.sex ?? '',
    pregnancyStatus: setup.pregnancyStatus ?? '',
    stateOrRegion: setup.stateOrRegion?.trim() ?? '',
    languageStyle: setup.languageStyle ?? '',
    conditions: setup.conditions ?? [],
    medications: setup.medications ?? [],
    allergies: setup.allergies ?? [],
    healthNotes: [],
    doctorQuestions: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
  };
}

export const APP_SHELL_SYNC_EVENT = 'curavon:app-shell-sync';

export function notifyAppShellSync(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(APP_SHELL_SYNC_EVENT));
}
