import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from './supabaseEnv';

let adminClient: SupabaseClient | null = null;

/** Server-only Supabase admin client for auth user deletion. Never import from client components. */
export function getSupabaseAdminClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') return null;

  const config = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !serviceRoleKey) return null;

  if (!adminClient) {
    adminClient = createClient(config.url, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}

/** Test helper — reset singleton between cases. */
export function resetSupabaseAdminClientForTests(): void {
  adminClient = null;
}
