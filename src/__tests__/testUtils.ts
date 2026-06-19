/** Test helpers — tests must run offline with no live AI or network calls. */

export const FAKE_USER_ID = 'test-user-smoke';

export function clearLocalStorage(): void {
  localStorage.clear();
}

export function seedLocalStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readLocalStorage<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
