import type { AIConfig } from '../ai/aiConfig';

function resolveModel(): string {
  return process.env.AI_MODEL?.trim() || 'gpt-4o-mini';
}

/** Server-only AI config. Never import from client components. */
export function getServerAIConfig(): AIConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim() || undefined;
  const enabled = process.env.AI_ENABLED !== 'false' && Boolean(apiKey);
  const providerRaw = process.env.AI_PROVIDER?.trim() ?? 'openai-compatible';

  return {
    provider: providerRaw === 'openai-compatible' ? 'openai-compatible' : 'openai-compatible',
    model: resolveModel(),
    apiKey,
    enabled,
  };
}
