/**
 * Read browser-safe public env vars (Next.js NEXT_PUBLIC_* with optional Vite fallback).
 *
 * Next.js only inlines `process.env.NEXT_PUBLIC_*` when accessed with static property names.
 * Dynamic access like `process.env[name]` is undefined in client bundles — use the switch below.
 */
export function readPublicEnv(name: string, viteFallbackName?: string): string | undefined {
  const fromProcess = readNextPublicEnvStatic(name);
  if (fromProcess) return fromProcess;

  if (viteFallbackName) {
    const legacy = readViteFallbackEnv(viteFallbackName);
    if (legacy) return legacy;
  }

  return undefined;
}

function readNextPublicEnvStatic(name: string): string | undefined {
  let value: string | undefined;

  switch (name) {
    case 'NEXT_PUBLIC_AUTH_MODE':
      value = process.env.NEXT_PUBLIC_AUTH_MODE;
      break;
    case 'NEXT_PUBLIC_SUPABASE_URL':
      value = process.env.NEXT_PUBLIC_SUPABASE_URL;
      break;
    case 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':
      value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
      break;
    case 'NEXT_PUBLIC_APP_ENV':
      value = process.env.NEXT_PUBLIC_APP_ENV;
      break;
    default:
      value = typeof process !== 'undefined' ? process.env[name] : undefined;
      break;
  }

  const trimmed = value?.trim();
  return trimmed || undefined;
}

export function getPublicEnvSource(
  name: string,
  viteFallbackName?: string,
): 'next_public' | 'vite_fallback' | 'missing' {
  if (readNextPublicEnvStatic(name)) return 'next_public';
  if (viteFallbackName && readViteFallbackEnv(viteFallbackName)) return 'vite_fallback';
  return 'missing';
}

function readViteFallbackEnv(name: string): string | undefined {
  try {
    if (typeof import.meta === 'undefined') return undefined;
    const meta = import.meta as unknown as { env?: Record<string, string | undefined> };
    return meta.env?.[name]?.trim();
  } catch {
    return undefined;
  }
}
