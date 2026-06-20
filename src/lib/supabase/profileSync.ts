import type { User } from '@supabase/supabase-js';
import type { HealthProfile } from '../../types/health';
import { getBrowserSupabaseClient } from './browserClient';

function displayNameFromUser(user: User): string {
  const metadata = user.user_metadata as Record<string, unknown> | undefined;
  return (
    (typeof metadata?.display_name === 'string' && metadata.display_name) ||
    (typeof metadata?.full_name === 'string' && metadata.full_name) ||
    user.email?.split('@')[0] ||
    'Curavon user'
  );
}

/** Upsert auth-linked row in public.profiles (requires schema + RLS applied). */
export async function syncSupabaseProfileRow(user: User): Promise<void> {
  const client = getBrowserSupabaseClient();
  if (!client) return;

  const { error } = await client.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? '',
      display_name: displayNameFromUser(user),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.warn('Curavon: could not sync profile to Supabase.', error.message);
  }
}

/** Upsert health profile payload for the signed-in user (requires schema + RLS). */
export async function syncSupabaseHealthProfileRow(profile: HealthProfile): Promise<void> {
  const client = getBrowserSupabaseClient();
  if (!client) return;

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();
  if (userError || !user) return;

  const { error } = await client.from('health_profiles').upsert(
    {
      id: user.id,
      user_id: user.id,
      payload: profile,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    console.warn('Curavon: could not sync health profile to Supabase.', error.message);
  }
}
