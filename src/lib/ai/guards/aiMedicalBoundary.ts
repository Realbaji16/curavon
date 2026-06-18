const BLOCKED_PATTERNS = [
  /\byou have (?:a |an )?[a-z][a-z\s-]{2,40}\b/i,
  /\bdiagnosis\b/i,
  /\bdiagnosed with\b/i,
  /\bprescribe|prescription|dosage|dose\b/i,
  /\bstart medication|stop medication|change medication\b/i,
  /\btreatment plan\b/i,
  /\blab (?:results?|report)\b.*\b(normal|abnormal|confirms)\b/i,
  /\bi am your doctor|as your doctor|as a clinician\b/i,
  /\bno need (?:for|to) (?:emergency|urgent)\b/i,
];

const REQUIRED_SAFE_PHRASES = [
  'this does not diagnose',
  'consider speaking with a clinician',
  'if symptoms are severe, sudden, or unsafe, seek urgent care',
];

export function findMedicalBoundaryViolations(text: string): string[] {
  const violations: string[] = [];
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      violations.push(`Blocked phrase pattern: ${pattern}`);
    }
  }
  return violations;
}

export function isWithinMedicalBoundary(text: string): boolean {
  return findMedicalBoundaryViolations(text).length === 0;
}

export function enforceSafeLanguage(text: string): string {
  const normalized = text.trim();
  if (!normalized) return normalized;
  const lower = normalized.toLowerCase();
  if (REQUIRED_SAFE_PHRASES.some((phrase) => lower.includes(phrase))) {
    return normalized;
  }
  return `${normalized}\n\nThis does not diagnose. Consider speaking with a clinician. If symptoms are severe, sudden, or unsafe, seek urgent care.`;
}
