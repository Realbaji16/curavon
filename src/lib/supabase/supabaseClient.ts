/**
 * Compatibility export. Prefer browserClient/serverClient split.
 */
export {
  getBrowserSupabaseClient as getSupabaseClient,
  resetBrowserSupabaseClientForTests as resetSupabaseClientForTests,
} from './browserClient';

export {
  getSupabasePublicConfig,
  getSupabasePublicPublishableKey,
  getSupabasePublicUrl,
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabaseConfig,
  hasSupabasePublicConfig,
} from './supabaseEnv';
