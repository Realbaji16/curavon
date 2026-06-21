import type { SupabaseClient } from '@supabase/supabase-js';
import { runWithSupabaseDataContext } from '../data/supabaseDataClient';

/** Execute approved data adapter methods under the authenticated server Supabase session. */
export async function withServerDataAccess<T>(
  userId: string,
  client: SupabaseClient,
  fn: () => Promise<T>,
): Promise<T> {
  return runWithSupabaseDataContext(client, userId, fn);
}
