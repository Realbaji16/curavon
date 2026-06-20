import { getServerAIConfig } from '../server/aiConfig';

export interface AIConfig {
  provider: 'openai-compatible';
  model: string;
  apiKey?: string;
  enabled: boolean;
}

const DEFAULT_MODEL = 'gpt-4o-mini';

/** AI config for the current runtime. Browser bundles are always disabled. */
export function getAIConfig(): AIConfig {
  if (typeof window !== 'undefined') {
    return {
      provider: 'openai-compatible',
      model: DEFAULT_MODEL,
      enabled: false,
    };
  }

  return getServerAIConfig();
}

export { getServerAIConfig };
