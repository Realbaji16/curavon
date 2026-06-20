import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig, hasSupabasePublicConfig } from './supabaseEnv';

// Browser/client code must only use Supabase publishable/anon-style keys, never service-role or secret keys.

let browserClient: SupabaseClient | null = null;

/** Browser Supabase client for client components and auth adapter. Never throws. */
export function getBrowserSupabaseClient(): SupabaseClient | null {
  if (!hasSupabasePublicConfig()) return null;
  if (typeof window === 'undefined') return null;

  if (!browserClient) {
    const config = getSupabasePublicConfig();
    if (!config) return null;
    browserClient = createBrowserClient(config.url, config.publishableKey);
  }

  return browserClient;
}

/** Test-only helper to reset the singleton between Vitest cases. */
export function resetBrowserSupabaseClientForTests(): void {
  browserClient = null;
}
