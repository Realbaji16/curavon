import type { AuthAdapter, AuthMode } from './authTypes';
import { isLocalDemoAuthAllowed } from './authConfig';
import { createLocalAuthAdapter } from './localAuthAdapter';
import { createSupabaseAuthAdapter } from './supabaseAuthAdapter';
import { hasSupabasePublicConfig } from '../supabase/supabaseEnv';

export function createAuthAdapter(mode: AuthMode = 'local_demo'): AuthAdapter {
  const hasConfig = hasSupabasePublicConfig();
  const allowLocalDemo = isLocalDemoAuthAllowed();

  const adapterSelected: AuthMode =
    !allowLocalDemo || (mode === 'supabase' && hasConfig)
      ? 'supabase'
      : 'local_demo';

  if (process.env.NODE_ENV === 'development') {
    console.info('Curavon auth adapter', {
      requestedMode: mode,
      hasSupabasePublicConfig: hasConfig,
      allowLocalDemo,
      adapterSelected,
    });
  }

  if (adapterSelected === 'supabase') {
    return createSupabaseAuthAdapter();
  }

  return createLocalAuthAdapter('local_demo');
}
