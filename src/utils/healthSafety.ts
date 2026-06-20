import {
  CALM_URGENT_BODY,
  CALM_URGENT_TITLE,
  detectRedFlags,
  hasUrgentRedFlag,
  SELF_HARM_URGENT_BODY,
  SELF_HARM_URGENT_TITLE,
} from '../lib/health/redFlags';

export {
  CALM_URGENT_BODY,
  CALM_URGENT_TITLE,
  SELF_HARM_URGENT_BODY,
  SELF_HARM_URGENT_TITLE,
};

// Backward-compatible alias used in a few existing flows.
export const URGENT_SAFETY_MESSAGE = CALM_URGENT_BODY;

export function hasUrgentHealthLanguage(text: string): boolean {
  return hasUrgentRedFlag(text);
}

export function findUrgentMatches(text: string): string[] {
  return detectRedFlags(text).matches.map((match) => match.label);
}

export function detectUrgentConcern(input: string | string[]) {
  const text = Array.isArray(input) ? input.join(', ') : input;
  const result = detectRedFlags(text);
  return {
    hasUrgent: result.hasUrgent,
    matches: result.matches.map((match) => match.label),
    selfHarm: result.selfHarm,
    title: result.title,
    body: result.body,
  };
}
