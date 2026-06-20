import { beforeEach, describe, expect, it } from 'vitest';
import { APP_STORAGE_KEYS, AUTH_SESSION_KEYS, HEALTH_DERIVED_DELETE_PREFIXES } from '../lib/data/storageKeys';
import { deleteAllHealthData, deletePrefixedLocalStorageKeys } from '../lib/data/dataDeletion';
import { restoreLocalBackup, validateBackupFile } from '../lib/data/dataRestore';
import { META_STORAGE_KEYS } from '../utils/metaSystem';
import { safeWrite } from '../utils/healthStorage';
import { clearLocalStorage } from './testUtils';
import type { CuravonLocalBackup } from '../lib/data/dataBackup';

function minimalBackup(): CuravonLocalBackup {
  return {
    appName: 'Curavon',
    backupVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    userId: 'local-test-user',
    authMode: 'local_demo',
    dataSchemaVersion: '1',
    collections: {
      healthProfile: { preferredName: 'Restored', primaryGoals: [], sensitiveMode: false, smartSilencePreference: 'gentle-reminders', conditions: [], medications: [], allergies: [], healthNotes: [], doctorQuestions: [], emergencyContactName: '', emergencyContactPhone: '' },
      dailyCheckins: [],
      askHistory: [],
      doctorSummaryItems: [],
      doctorSummaryDrafts: [],
      redFlagLogs: [],
      nextActionState: null,
      followUps: [],
      memorySnapshot: null,
      guideResults: [],
      userPreferences: {},
    },
  };
}

describe('deletePrefixedLocalStorageKeys', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('removes curavon_meta_* keys during health data delete', () => {
    safeWrite(META_STORAGE_KEYS.actionOutcomes, [{ id: '1', createdAt: new Date().toISOString() }]);
    safeWrite(META_STORAGE_KEYS.safetyEvents, []);
    safeWrite('curavon_meta_activity_insights', { insights: [{ id: 'x' }], ruleGeneratedAt: null, lastAiRunAt: null, summaryHash: null });
    safeWrite(APP_STORAGE_KEYS.authDemoUser, { email: 'a@b.com', fullName: 'Test' });

    deleteAllHealthData('local-test-user');

    expect(localStorage.getItem(META_STORAGE_KEYS.actionOutcomes)).toBeNull();
    expect(localStorage.getItem(META_STORAGE_KEYS.safetyEvents)).toBeNull();
    expect(localStorage.getItem('curavon_meta_activity_insights')).toBeNull();
    expect(localStorage.getItem(APP_STORAGE_KEYS.authDemoUser)).not.toBeNull();
  });

  it('only deletes approved prefixes', () => {
    safeWrite('curavon_meta_test_key', { ok: true });
    safeWrite('curavon_other_key', { keep: true });

    const removed = deletePrefixedLocalStorageKeys(HEALTH_DERIVED_DELETE_PREFIXES);

    expect(removed).toContain('curavon_meta_test_key');
    expect(localStorage.getItem('curavon_other_key')).not.toBeNull();
  });

  it('keeps auth session keys out of delete-health-data scope', () => {
    for (const key of AUTH_SESSION_KEYS) {
      safeWrite(key, { test: true });
    }
    deleteAllHealthData('local-test-user');
    for (const key of AUTH_SESSION_KEYS) {
      expect(localStorage.getItem(key)).not.toBeNull();
    }
  });
});

describe('restoreLocalBackup', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('merge restore writes health profile to localStorage', () => {
    const backup = minimalBackup();
    expect(validateBackupFile(backup).valid).toBe(true);

    const result = restoreLocalBackup(backup, { mode: 'merge' });
    expect(result.ok).toBe(true);

    const raw = localStorage.getItem(APP_STORAGE_KEYS.healthProfile);
    expect(raw).toContain('Restored');
  });

  it('replace restore requires explicit confirmation', () => {
    const backup = minimalBackup();
    const denied = restoreLocalBackup(backup, { mode: 'replace' });
    expect(denied.ok).toBe(false);

    const allowed = restoreLocalBackup(backup, { mode: 'replace', confirmReplace: true });
    expect(allowed.ok).toBe(true);
  });
});
