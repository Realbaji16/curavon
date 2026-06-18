import type { AIKernelResponse, AIKernelTask } from './aiTypes';

const kernelCache = new Map<string, AIKernelResponse>();

function stableStringify(value: unknown): string {
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}

function simpleHash(text: string): string {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `ai-${(hash >>> 0).toString(36)}`;
}

export function createCacheKey(task: AIKernelTask, input: string, context?: Record<string, unknown>): string {
  return simpleHash(`${task}::${input.trim().toLowerCase()}::${stableStringify(context ?? {})}`);
}

export function getCache(key: string): AIKernelResponse | null {
  return kernelCache.get(key) ?? null;
}

export function setCache(key: string, value: AIKernelResponse) {
  kernelCache.set(key, value);
}
