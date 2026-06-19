import { describe, expect, it } from 'vitest';
import {
  APP_STORAGE_KEYS,
  AUTH_SESSION_KEYS,
  CORE_HEALTH_DATA_KEYS,
  DELETE_HEALTH_DATA_KEYS,
  EXPORT_HEALTH_DATA_KEYS,
  HEALTH_DERIVED_TELEMETRY_KEYS,
} from '../lib/data/storageKeys';
import { exportCuravonData } from '../lib/data/dataExport';

describe('data export/delete key scope', () => {
  const secretLikeKeys = [
    APP_STORAGE_KEYS.authDemoUser,
    APP_STORAGE_KEYS.authDemoUsers,
    APP_STORAGE_KEYS.authDemoUserId,
    APP_STORAGE_KEYS.orchestratorLogs,
    APP_STORAGE_KEYS.aiDecisionTraces,
    APP_STORAGE_KEYS.aiBudgetState,
    APP_STORAGE_KEYS.aiPolicyState,
    APP_STORAGE_KEYS.syncQueue,
  ];

  it('EXPORT_HEALTH_DATA_KEYS excludes auth and AI internals', () => {
    for (const key of secretLikeKeys) {
      expect(EXPORT_HEALTH_DATA_KEYS).not.toContain(key);
    }
    expect(EXPORT_HEALTH_DATA_KEYS).toContain(APP_STORAGE_KEYS.healthProfile);
    expect(EXPORT_HEALTH_DATA_KEYS).toContain(APP_STORAGE_KEYS.askHistory);
  });

  it('DELETE_HEALTH_DATA_KEYS includes core health and derived telemetry', () => {
    const required = [
      APP_STORAGE_KEYS.healthProfile,
      APP_STORAGE_KEYS.dailyCheckins,
      APP_STORAGE_KEYS.askHistory,
      APP_STORAGE_KEYS.doctorSummaryItems,
      APP_STORAGE_KEYS.doctorSummaryDrafts,
      APP_STORAGE_KEYS.redFlagLogs,
      APP_STORAGE_KEYS.nextActionState,
      APP_STORAGE_KEYS.followUps,
      APP_STORAGE_KEYS.healthSnapshot,
      APP_STORAGE_KEYS.guideResults,
      APP_STORAGE_KEYS.aiDecisionTraces,
      APP_STORAGE_KEYS.orchestratorLogs,
    ];

    for (const key of required) {
      expect(DELETE_HEALTH_DATA_KEYS).toContain(key);
    }
  });

  it('keeps auth/session keys separate from delete-health-data scope', () => {
    for (const key of AUTH_SESSION_KEYS) {
      expect(DELETE_HEALTH_DATA_KEYS).not.toContain(key);
    }
    expect(CORE_HEALTH_DATA_KEYS).not.toContain(APP_STORAGE_KEYS.authDemoUser);
  });

  it('export payload keys do not include secret-like storage keys', () => {
    const payload = exportCuravonData('test-user');
    const serialized = JSON.stringify(payload);
    for (const key of secretLikeKeys) {
      expect(serialized).not.toContain(key);
    }
    expect(payload.exportScope).toBe('health_records');
    expect(payload.healthProfile).toBeDefined();
  });

  it('health-derived telemetry keys are included in delete scope but not export scope', () => {
    for (const key of HEALTH_DERIVED_TELEMETRY_KEYS) {
      expect(DELETE_HEALTH_DATA_KEYS).toContain(key);
      expect(EXPORT_HEALTH_DATA_KEYS).not.toContain(key);
    }
  });
});
