export interface AIConfig {
  provider: 'openai-compatible';
  model: string;
  apiKey?: string;
  enabled: boolean;
}

export function getAIConfig(): AIConfig {
  const apiKey = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined)?.trim();
  return {
    provider: 'openai-compatible',
    model: 'gpt-4o-mini',
    apiKey,
    enabled: Boolean(apiKey),
  };
}
