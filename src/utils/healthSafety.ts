export const CALM_URGENT_TITLE = 'This may need urgent support.';
export const CALM_URGENT_BODY =
  'Curavon can help organize your notes, but severe, sudden, or unsafe symptoms should be handled by local emergency services or a clinician now.';
export const SELF_HARM_URGENT_TITLE = 'You deserve immediate support.';
export const SELF_HARM_URGENT_BODY =
  'If you may be in danger or might harm yourself, contact local emergency services or a trusted person now.';

// Backward-compatible alias used in a few existing flows.
export const URGENT_SAFETY_MESSAGE = CALM_URGENT_BODY;

type SafetyPattern = {
  label: string;
  terms: string[];
  selfHarm?: boolean;
};

const URGENT_PATTERNS: SafetyPattern[] = [
  { label: 'chest pain', terms: ['chest pain'] },
  { label: 'trouble breathing', terms: ['trouble breathing', 'difficulty breathing'] },
  { label: "can't breathe", terms: ["can't breathe", 'cannot breathe', 'cant breathe', 'can’t breathe'] },
  { label: 'fainting', terms: ['fainting'] },
  { label: 'severe sudden pain', terms: ['severe sudden pain'] },
  { label: 'worst headache', terms: ['worst headache'] },
  { label: 'face drooping', terms: ['face drooping'] },
  { label: 'sudden weakness', terms: ['sudden weakness'] },
  { label: 'stroke', terms: ['stroke'] },
  { label: 'heavy bleeding', terms: ['heavy bleeding'] },
  {
    label: 'suicidal',
    terms: ['suicidal', 'harm myself', 'hurt myself', 'kill myself', 'thoughts of harming myself'],
    selfHarm: true,
  },
];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[’]/g, "'");
}

function collectMatchesFromText(text: string): string[] {
  const lower = normalizeText(text);
  return URGENT_PATTERNS.filter((pattern) => pattern.terms.some((term) => lower.includes(normalizeText(term)))).map(
    (pattern) => pattern.label,
  );
}

function isSelfHarmMatch(matches: string[]): boolean {
  return matches.some((match) => {
    const pattern = URGENT_PATTERNS.find((entry) => entry.label === match);
    return Boolean(pattern?.selfHarm);
  });
}

export function hasUrgentHealthLanguage(text: string): boolean {
  return collectMatchesFromText(text).length > 0;
}

export function findUrgentMatches(text: string): string[] {
  return collectMatchesFromText(text);
}

export function detectUrgentConcern(input: string | string[]) {
  const text = Array.isArray(input) ? input.join(', ') : input;
  const matches = collectMatchesFromText(text);
  const selfHarm = isSelfHarmMatch(matches);
  return {
    hasUrgent: matches.length > 0,
    matches,
    selfHarm,
    title: selfHarm ? SELF_HARM_URGENT_TITLE : CALM_URGENT_TITLE,
    body: selfHarm ? SELF_HARM_URGENT_BODY : CALM_URGENT_BODY,
  };
}
