import { APP_STORAGE_KEYS } from './storageKeys';
import { safeRead, safeWrite } from '../../utils/healthStorage';
import { safeJsonParse } from './dataIntegrity';
import type { CuravonLocalBackup } from './dataBackup';
import { setCurrentDataVersion } from './dataVersioning';

type RestoreMode = 'merge' | 'replace';

export type RestoreResult = {
  ok: boolean;
  message: string;
  restoredKeys: string[];
};

type RestoreOptions = {
  mode?: RestoreMode;
  confirmReplace?: boolean;
  restoreAuthSession?: boolean;
};

const COLLECTION_KEY_MAP = {
  healthProfile: APP_STORAGE_KEYS.healthProfile,
  dailyCheckins: APP_STORAGE_KEYS.dailyCheckins,
  askHistory: APP_STORAGE_KEYS.askHistory,
  doctorSummaryItems: APP_STORAGE_KEYS.doctorSummaryItems,
  doctorSummaryDrafts: APP_STORAGE_KEYS.doctorSummaryDrafts,
  redFlagLogs: APP_STORAGE_KEYS.redFlagLogs,
  nextActionState: APP_STORAGE_KEYS.nextActionState,
  followUps: APP_STORAGE_KEYS.followUps,
  memorySnapshot: APP_STORAGE_KEYS.healthSnapshot,
  guideResults: APP_STORAGE_KEYS.guideResults,
  userPreferences: APP_STORAGE_KEYS.userPreferences,
} as const;

function mergeById(current: unknown[], incoming: unknown[]): unknown[] {
  const all = [...incoming, ...current];
  const seen = new Set<string>();
  const result: unknown[] = [];
  all.forEach((item) => {
    if (!item || typeof item !== 'object') return;
    const id = (item as Record<string, unknown>).id;
    const fallbackId = JSON.stringify(item);
    const key = typeof id === 'string' ? id : fallbackId;
    if (seen.has(key)) return;
    seen.add(key);
    result.push(item);
  });
  return result;
}

export function validateBackupFile(backup: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!backup || typeof backup !== 'object') {
    return { valid: false, errors: ['Backup must be a JSON object.'] };
  }
  const b = backup as Record<string, unknown>;
  if (b.appName !== 'Curavon') errors.push('Invalid appName in backup.');
  if (typeof b.backupVersion !== 'string' || !b.backupVersion.trim()) {
    errors.push('Missing backupVersion.');
  }
  if (!b.collections || typeof b.collections !== 'object' || Array.isArray(b.collections)) {
    errors.push('Missing collections object.');
  } else {
    const c = b.collections as Record<string, unknown>;
    const arrayKeys = [
      'dailyCheckins',
      'askHistory',
      'doctorSummaryItems',
      'doctorSummaryDrafts',
      'redFlagLogs',
      'followUps',
      'guideResults',
    ];
    arrayKeys.forEach((key) => {
      if (c[key] !== undefined && !Array.isArray(c[key])) {
        errors.push(`Collection ${key} must be an array.`);
      }
    });
  }
  return { valid: errors.length === 0, errors };
}

export function restoreLocalBackup(
  backup: CuravonLocalBackup,
  options?: RestoreOptions,
): RestoreResult {
  const validation = validateBackupFile(backup);
  if (!validation.valid) {
    return {
      ok: false,
      message: validation.errors.join(' '),
      restoredKeys: [],
    };
  }

  const mode: RestoreMode = options?.mode ?? 'merge';
  if (mode === 'replace' && !options?.confirmReplace) {
    return {
      ok: false,
      message: 'Replace restore requires explicit confirmation.',
      restoredKeys: [],
    };
  }

  const restoredKeys: string[] = [];
  const collections = backup.collections as Record<string, unknown>;

  (Object.keys(COLLECTION_KEY_MAP) as Array<keyof typeof COLLECTION_KEY_MAP>).forEach((collectionName) => {
    const storageKey = COLLECTION_KEY_MAP[collectionName];
    const incoming = collections[collectionName];
    if (incoming === undefined) return;

    if (mode === 'replace') {
      safeWrite(storageKey, incoming);
      restoredKeys.push(storageKey);
      return;
    }

    const currentRaw = safeRead<unknown>(storageKey, null);
    if (Array.isArray(incoming) && Array.isArray(currentRaw)) {
      safeWrite(storageKey, mergeById(currentRaw, incoming));
      restoredKeys.push(storageKey);
      return;
    }

    if (
      incoming &&
      typeof incoming === 'object' &&
      !Array.isArray(incoming) &&
      currentRaw &&
      typeof currentRaw === 'object' &&
      !Array.isArray(currentRaw)
    ) {
      safeWrite(storageKey, { ...(currentRaw as object), ...(incoming as object) });
      restoredKeys.push(storageKey);
      return;
    }

    safeWrite(storageKey, incoming);
    restoredKeys.push(storageKey);
  });

  if (backup.dataSchemaVersion) {
    setCurrentDataVersion(backup.dataSchemaVersion);
  }

  if (options?.restoreAuthSession) {
    const authRaw = safeJsonParse<Record<string, unknown> | null>(
      JSON.stringify((backup as Record<string, unknown>).auth ?? null),
      null,
    );
    if (authRaw && typeof authRaw === 'object') {
      const email = typeof authRaw.email === 'string' ? authRaw.email : '';
      const fullName = typeof authRaw.fullName === 'string' ? authRaw.fullName : '';
      if (email && fullName) {
        safeWrite(APP_STORAGE_KEYS.authDemoUser, { email, fullName });
      }
    }
  }

  return {
    ok: true,
    message:
      mode === 'replace'
        ? 'Backup restored and local health data replaced.'
        : 'Backup restored and merged with current local data.',
    restoredKeys,
  };
}
