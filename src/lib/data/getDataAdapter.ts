import type { DataAdapter } from './dataAdapter';
import { createSupabaseDataAdapter } from './supabaseDataAdapter';

let cachedAdapter: DataAdapter | null = null;

/** Returns the Supabase-only data adapter (default persistence path). */
export function getDataAdapter(): DataAdapter {
  if (!cachedAdapter) {
    cachedAdapter = createSupabaseDataAdapter();
  }
  return cachedAdapter;
}

/** Test helper — reset singleton between cases. */
export function resetDataAdapterForTests(): void {
  cachedAdapter = null;
}

export { createSupabaseDataAdapter };
