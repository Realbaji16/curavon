import type { SupabaseClient } from '@supabase/supabase-js';

export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export type CuravonAuthMode = 'local_demo' | 'supabase';

export type CuravonSupabaseClient = SupabaseClient;

export type HealthApiResponse = {
  ok: true;
  app: 'curavon';
  framework: 'next';
  supabaseConfigured: boolean;
  authMode: CuravonAuthMode;
};

export type SessionApiResponse = {
  authenticated: boolean;
  authMode: CuravonAuthMode;
  userId?: string;
};
