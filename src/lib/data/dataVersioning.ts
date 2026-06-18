import { APP_STORAGE_KEYS } from './storageKeys';
import { safeRead, safeWrite } from '../../utils/healthStorage';

export const CURAVON_DATA_SCHEMA_VERSION = '1.0.0';

export function getCurrentDataVersion(): string | null {
  return safeRead<string | null>(APP_STORAGE_KEYS.dataSchemaVersion, null);
}

export function setCurrentDataVersion(version: string) {
  safeWrite(APP_STORAGE_KEYS.dataSchemaVersion, version);
}

export function needsMigration(targetVersion = CURAVON_DATA_SCHEMA_VERSION): boolean {
  const current = getCurrentDataVersion();
  // Missing version implies legacy local data. Keep data as-is and migrate conservatively later.
  if (!current) return true;
  return current !== targetVersion;
}
