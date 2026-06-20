import { readPublicEnv } from '../env/publicEnv';
import type { SupabasePublicConfig } from './supabaseTypes';

export function getSupabasePublicUrl(): string | undefined {
  return readPublicEnv('NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL') ?? undefined;
}

export function getSupabasePublicPublishableKey(): string | undefined {
  return (
    readPublicEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY') ??
    undefined
  );
}

export function hasSupabasePublicConfig(): boolean {
  return Boolean(getSupabasePublicUrl() && getSupabasePublicPublishableKey());
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = getSupabasePublicUrl();
  const publishableKey = getSupabasePublicPublishableKey();
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

/** @deprecated Prefer hasSupabasePublicConfig — compatibility alias. */
export function hasSupabaseConfig(): boolean {
  return hasSupabasePublicConfig();
}

/** @deprecated Prefer getSupabasePublicUrl — compatibility alias. */
export function getSupabaseUrl(): string | undefined {
  return getSupabasePublicUrl();
}

/** @deprecated Prefer getSupabasePublicPublishableKey — compatibility alias. */
export function getSupabasePublishableKey(): string | undefined {
  return getSupabasePublicPublishableKey();
}
