import { readPublicEnv } from '../env/publicEnv';
import { hasSupabasePublicConfig } from '../supabase/supabaseEnv';
import type { AuthMode } from './authTypes';

export type CuravonAuthMode = AuthMode;

export function getConfiguredAuthMode(): CuravonAuthMode {
  const requested =
    readPublicEnv('NEXT_PUBLIC_AUTH_MODE', 'VITE_AUTH_MODE') ?? 'local_demo';

  if (requested === 'supabase') {
    if (hasSupabasePublicConfig()) return 'supabase';
    console.warn(
      'Curavon Supabase mode requested but config is missing. Falling back to local_demo.',
    );
    return 'local_demo';
  }

  return 'local_demo';
}

/** @deprecated Prefer getConfiguredAuthMode — kept for existing imports. */
export function getAuthMode(): AuthMode {
  return getConfiguredAuthMode();
}
