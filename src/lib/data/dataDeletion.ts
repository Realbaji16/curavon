import {
  APP_STORAGE_KEYS,
  DELETE_HEALTH_DATA_KEYS,
  HEALTH_DERIVED_DELETE_PREFIXES,
} from './storageKeys';
import { safeRemove } from '../../utils/healthStorage';

/** Remove localStorage keys matching approved health-derived prefixes only. */
export function deletePrefixedLocalStorageKeys(
  prefixes: readonly string[] = HEALTH_DERIVED_DELETE_PREFIXES,
): string[] {
  if (typeof window === 'undefined') return [];
  const removed: string[] = [];
  const keysToRemove: string[] = [];

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => {
    safeRemove(key);
    removed.push(key);
  });

  return removed;
}

export function deleteAllHealthData(userId: string) {
  // Keys are device-local today; userId reserved for future per-user scoping.
  void userId;
  DELETE_HEALTH_DATA_KEYS.forEach((key) => {
    safeRemove(key);
  });
  deletePrefixedLocalStorageKeys();
}

export function deleteLocalAccountData(
  userId: string,
  options?: { deleteHealthData?: boolean },
) {
  safeRemove(APP_STORAGE_KEYS.authDemoUser);
  safeRemove(APP_STORAGE_KEYS.authDemoUserId);
  safeRemove(APP_STORAGE_KEYS.consentComplete);
  safeRemove(APP_STORAGE_KEYS.setupComplete);
  safeRemove(APP_STORAGE_KEYS.profileSetup);

  if (options?.deleteHealthData) {
    deleteAllHealthData(userId);
  }
}
