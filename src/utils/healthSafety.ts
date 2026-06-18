export const URGENT_SAFETY_MESSAGE =
  'This may need urgent support. Curavon can help you organize notes, but severe, sudden, or unsafe symptoms should be handled by local emergency services or a clinician now.';

const URGENT_PATTERNS = [
  'chest pain',
  'trouble breathing',
  "can't breathe",
  'cannot breathe',
  'difficulty breathing',
  'fainting',
  'severe sudden pain',
  'suicidal',
  'harm myself',
  'hurt myself',
  'kill myself',
  'worst headache',
  'stroke',
  'face drooping',
  'heavy bleeding',
];

export function hasUrgentHealthLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return URGENT_PATTERNS.some((pattern) => lower.includes(pattern));
}

export function findUrgentMatches(text: string): string[] {
  const lower = text.toLowerCase();
  return URGENT_PATTERNS.filter((pattern) => lower.includes(pattern));
}
