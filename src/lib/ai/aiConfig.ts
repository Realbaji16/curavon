import { readPublicEnv } from '../env/publicEnv';

export interface AIConfig {
  provider: 'openai-compatible';
  model: string;
  apiKey?: string;
  enabled: boolean;
}

export function getAIConfig(): AIConfig {
  const apiKey =
    readPublicEnv('NEXT_PUBLIC_OPENAI_API_KEY', 'VITE_OPENAI_API_KEY') ??
    undefined;
  return {
    provider: 'openai-compatible',
    model: 'gpt-4o-mini',
    apiKey,
    enabled: Boolean(apiKey),
  };
}
