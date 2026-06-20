import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig, hasSupabasePublicConfig } from './supabaseEnv';

// Server client uses publishable key + user cookies only. No service_role or admin bypass.

export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  if (!hasSupabasePublicConfig()) return null;

  const config = getSupabasePublicConfig();
  if (!config) return null;

  const cookieStore = await cookies();

  return createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // setAll can fail in Server Components; route handlers may still read session cookies.
        }
      },
    },
  });
}
