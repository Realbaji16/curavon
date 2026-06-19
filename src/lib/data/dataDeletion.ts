import { APP_STORAGE_KEYS, DELETE_HEALTH_DATA_KEYS } from './storageKeys';
import { safeRemove } from '../../utils/healthStorage';

export function deleteAllHealthData(userId: string) {
  // Keys are device-local today; userId reserved for future per-user scoping.
  void userId;
  DELETE_HEALTH_DATA_KEYS.forEach((key) => {
    safeRemove(key);
  });
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
