import type { AuthAdapter, AuthMode } from './authTypes';
import { createLocalAuthAdapter } from './localAuthAdapter';
import { createSupabaseAuthAdapter } from './supabaseAuthAdapter';
import { hasSupabasePublicConfig } from '../supabase/supabaseEnv';

export function createAuthAdapter(mode: AuthMode = 'local_demo'): AuthAdapter {
  if (mode === 'supabase' && hasSupabasePublicConfig()) {
    return createSupabaseAuthAdapter();
  }
  return createLocalAuthAdapter('local_demo');
}
