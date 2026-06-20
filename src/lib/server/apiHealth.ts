import { getConfiguredAuthMode } from '../auth/authConfig';
import { hasSupabasePublicConfig } from '../supabase/supabaseEnv';
import type { HealthApiResponse } from '../supabase/supabaseTypes';

export function buildHealthApiResponse(): HealthApiResponse {
  return {
    ok: true,
    app: 'curavon',
    framework: 'next',
    supabaseConfigured: hasSupabasePublicConfig(),
    authMode: getConfiguredAuthMode(),
  };
}
