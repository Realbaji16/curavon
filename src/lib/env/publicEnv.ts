/** Read browser-safe public env vars (Next.js NEXT_PUBLIC_* with optional Vite fallback). */
export function readPublicEnv(name: string, viteFallbackName?: string): string | undefined {
  const fromProcess =
    typeof process !== 'undefined' ? process.env[name]?.trim() : undefined;
  if (fromProcess) return fromProcess;

  if (viteFallbackName) {
    const legacy = readViteFallbackEnv(viteFallbackName);
    if (legacy) return legacy;
  }

  return undefined;
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
