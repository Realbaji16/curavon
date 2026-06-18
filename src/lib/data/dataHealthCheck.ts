import { APP_STORAGE_KEYS } from './storageKeys';
import { detectCorruptedKeys, repairCollection, safeJsonParse } from './dataIntegrity';
import { CURAVON_DATA_SCHEMA_VERSION, getCurrentDataVersion, setCurrentDataVersion } from './dataVersioning';
import { safeRead, safeWrite } from '../../utils/healthStorage';

type HealthStatus = 'healthy' | 'repaired' | 'needs_attention';

export type LocalDataHealthCheckResult = {
  status: HealthStatus;
  repairedKeys: string[];
  corruptedKeys: string[];
  warnings: string[];
};

function readRaw(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // no-op for resilience
  }
}

export function runLocalDataHealthCheck(): LocalDataHealthCheckResult {
  const repairedKeys: string[] = [];
  const warnings: string[] = [];

  if (!getCurrentDataVersion()) {
    setCurrentDataVersion(CURAVON_DATA_SCHEMA_VERSION);
    repairedKeys.push(APP_STORAGE_KEYS.dataSchemaVersion);
    warnings.push('Missing local schema version was initialized.');
  }

  const corruptedKeys = detectCorruptedKeys();
  if (corruptedKeys.length > 0) repairedKeys.push(...corruptedKeys);

  const debugLogs = safeRead<unknown[]>(APP_STORAGE_KEYS.followUpDebugLog, []);
  if (Array.isArray(debugLogs) && debugLogs.length > 300) {
    safeWrite(APP_STORAGE_KEYS.followUpDebugLog, debugLogs.slice(0, 300));
    repairedKeys.push(APP_STORAGE_KEYS.followUpDebugLog);
    warnings.push('Oversized debug logs were trimmed.');
  }

  const followUpsRaw = readRaw(APP_STORAGE_KEYS.followUps);
  const followUps = safeJsonParse<unknown[]>(followUpsRaw, []);
  if (!Array.isArray(followUps)) {
    writeRaw(APP_STORAGE_KEYS.followUps, JSON.stringify(repairCollection('follow_ups', followUps)));
    repairedKeys.push(APP_STORAGE_KEYS.followUps);
    warnings.push('Follow-up records were repaired.');
  } else {
    const seen = new Set<string>();
    const deduped = followUps.filter((item) => {
      if (!item || typeof item !== 'object') return false;
      const maybeId = (item as Record<string, unknown>).id;
      if (typeof maybeId !== 'string') return false;
      if (seen.has(maybeId)) return false;
      seen.add(maybeId);
      return true;
    });
    if (deduped.length !== followUps.length) {
      writeRaw(APP_STORAGE_KEYS.followUps, JSON.stringify(deduped));
      repairedKeys.push(APP_STORAGE_KEYS.followUps);
      warnings.push('Duplicate follow-up entries were removed.');
    }
  }

  const missingUserScopedWarnings: string[] = [];
  const scopedKeys = [
    'curavon_collection_daily_checkins',
    'curavon_collection_ask_history',
    'curavon_collection_follow_ups',
  ];
  scopedKeys.forEach((key) => {
    const parsed = safeJsonParse<unknown>(readRaw(key), {});
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const asRecord = parsed as Record<string, unknown>;
      const hasAnonymous = Object.keys(asRecord).some((k) => !k.trim());
      if (hasAnonymous) {
        missingUserScopedWarnings.push(`${key} has entries without a userId bucket.`);
      }
    }
  });
  warnings.push(...missingUserScopedWarnings);

  const shapeWarningKeys: string[] = [];
  const keyShapeChecks: Array<[string, unknown, boolean]> = [
    [APP_STORAGE_KEYS.dailyCheckins, safeRead<unknown>(APP_STORAGE_KEYS.dailyCheckins, []), true],
    [APP_STORAGE_KEYS.askHistory, safeRead<unknown>(APP_STORAGE_KEYS.askHistory, []), true],
    [APP_STORAGE_KEYS.doctorSummaryItems, safeRead<unknown>(APP_STORAGE_KEYS.doctorSummaryItems, []), true],
  ];
  keyShapeChecks.forEach(([key, value, shouldBeArray]) => {
    if ((shouldBeArray && !Array.isArray(value)) || (!shouldBeArray && Array.isArray(value))) {
      shapeWarningKeys.push(key);
    }
  });
  if (shapeWarningKeys.length > 0) {
    warnings.push(`Some legacy key shapes need attention: ${shapeWarningKeys.join(', ')}`);
  }

  const status: HealthStatus =
    warnings.length > 0 && repairedKeys.length === 0
      ? 'needs_attention'
      : repairedKeys.length > 0
        ? 'repaired'
        : 'healthy';

  return {
    status,
    repairedKeys: Array.from(new Set(repairedKeys)),
    corruptedKeys,
    warnings,
  };
}
