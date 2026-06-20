import { getConfiguredAuthMode } from '../auth/authConfig';
import { createSupabaseServerClient } from '../supabase/serverClient';
import { hasSupabasePublicConfig } from '../supabase/supabaseEnv';
import type { SessionApiResponse } from '../supabase/supabaseTypes';

export async function buildSessionApiResponse(): Promise<SessionApiResponse> {
  const authMode = getConfiguredAuthMode();

  if (authMode !== 'supabase' || !hasSupabasePublicConfig()) {
    return {
      authenticated: false,
      authMode: 'local_demo',
    };
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return {
      authenticated: false,
      authMode: 'local_demo',
    };
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return {
      authenticated: false,
      authMode: 'supabase',
    };
  }

  return {
    authenticated: true,
    authMode: 'supabase',
    userId: user.id,
  };
}
