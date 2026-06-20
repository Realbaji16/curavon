import { getPublicEnvSource, readPublicEnv } from '../env/publicEnv';
import {
  getSupabasePublicPublishableKey,
  getSupabasePublicUrl,
  hasSupabasePublicConfig,
} from '../supabase/supabaseEnv';import { getConfiguredAuthMode } from './authConfig';
import type { AuthMode } from './authTypes';

export type AuthEnvSource = 'next_public' | 'vite_fallback' | 'missing';

export type AuthDebugState = {
  requestedAuthMode: string;
  resolvedAuthMode: AuthMode;
  hasSupabaseConfig: boolean;
  hasSupabaseUrl: boolean;
  hasSupabasePublishableKey: boolean;
  usingSupabase: boolean;
  environmentSource: AuthEnvSource;
  safeSupabaseUrlHost: string | null;
  publishableKeyPresent: boolean;
};

function readEnvSource(nextName: string, viteFallbackName: string): AuthEnvSource {
  return getPublicEnvSource(nextName, viteFallbackName);
}

function safeSupabaseUrlHost(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

/** Safe auth/env diagnostics — never exposes publishable keys or secrets. */
export function getAuthDebugState(): AuthDebugState {
  const requestedAuthMode =
    readPublicEnv('NEXT_PUBLIC_AUTH_MODE', 'VITE_AUTH_MODE') ?? 'local_demo';
  const resolvedAuthMode = getConfiguredAuthMode();
  const supabaseUrl = getSupabasePublicUrl();
  const publishableKey = getSupabasePublicPublishableKey();
  const hasSupabaseConfig = hasSupabasePublicConfig();

  return {
    requestedAuthMode,
    resolvedAuthMode,
    hasSupabaseConfig,
    hasSupabaseUrl: Boolean(supabaseUrl),
    hasSupabasePublishableKey: Boolean(publishableKey),
    usingSupabase: resolvedAuthMode === 'supabase' && hasSupabaseConfig,
    environmentSource: readEnvSource('NEXT_PUBLIC_AUTH_MODE', 'VITE_AUTH_MODE'),
    safeSupabaseUrlHost: safeSupabaseUrlHost(supabaseUrl),
    publishableKeyPresent: Boolean(publishableKey),
  };
}
