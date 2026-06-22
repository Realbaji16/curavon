import { describe, expect, it } from 'vitest';
import { createDefaultHealthProfile } from '../utils/healthUtils';
import {
  isHealthProfileSetupComplete,
  profileSetupFromHealthProfile,
} from '../lib/app/profileSetupSync';

describe('profile setup sync', () => {
  it('detects completed profile setup from preferred name only', () => {
    const profile = {
      ...createDefaultHealthProfile(),
      preferredName: 'Alex',
    };
    expect(isHealthProfileSetupComplete(profile)).toBe(true);
    expect(profileSetupFromHealthProfile(profile).preferredName).toBe('Alex');
  });

  it('detects completed profile with full light context', () => {
    const profile = {
      ...createDefaultHealthProfile(),
      preferredName: 'Alex',
      primaryGoals: ['Track symptoms clearly'],
      ageRange: '25-34' as const,
      sex: 'female' as const,
      conditions: ['Migraine'],
    };
    expect(isHealthProfileSetupComplete(profile)).toBe(true);
    expect(profileSetupFromHealthProfile(profile).ageRange).toBe('25-34');
  });

  it('treats empty profile as incomplete setup', () => {
    expect(isHealthProfileSetupComplete(createDefaultHealthProfile())).toBe(false);
  });
});
