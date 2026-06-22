import { findMedicalBoundaryViolations } from '../../ai/guards/aiMedicalBoundary';
import { containsDisallowedActionText } from '../../plan/planActionBoundaries';

/** Categories of blocked health-intelligence output. */
export type BlockedOutputCategory =
  | 'diagnosis'
  | 'prescription'
  | 'dosage'
  | 'medication_change'
  | 'emergency_minimization'
  | 'certainty'
  | 'named_condition_assertion'
  | 'unsafe_medication_instruction';

export type BlockedOutputPattern = {
  category: BlockedOutputCategory;
  label: string;
  pattern: RegExp;
};

/**
 * Health-intelligence-specific blocked patterns.
 * Complements shared guards in aiMedicalBoundary and planActionBoundaries.
 */
export const HEALTH_INTELLIGENCE_BLOCKED_PATTERNS: readonly BlockedOutputPattern[] = [
  {
    category: 'named_condition_assertion',
    label: 'you have malaria',
    pattern: /\byou have malaria\b/i,
  },
  {
    category: 'named_condition_assertion',
    label: 'you have typhoid',
    pattern: /\byou have typhoid\b/i,
  },
  {
    category: 'unsafe_medication_instruction',
    label: 'take amoxicillin',
    pattern: /\btake amoxicillin\b/i,
  },
  {
    category: 'unsafe_medication_instruction',
    label: 'take antimalarial',
    pattern: /\btake antimalarial\b/i,
  },
  {
    category: 'emergency_minimization',
    label: 'no need to see a doctor',
    pattern: /\bno need to see a doctor\b/i,
  },
  {
    category: 'certainty',
    label: 'this is definitely',
    pattern: /\bthis is definitely\b/i,
  },
  {
    category: 'diagnosis',
    label: 'diagnosis language',
    pattern: /\bdiagnos(e|is|ed|ing)\b/i,
  },
  {
    category: 'prescription',
    label: 'prescription language',
    pattern: /\b(prescrib(e|ing|ed)|prescription)\b/i,
  },
  {
    category: 'dosage',
    label: 'dosage language',
    pattern: /\b(dosage|dose)\b/i,
  },
  {
    category: 'medication_change',
    label: 'medication start/stop/change',
    pattern: /\b(start|stop|change)\s+(taking\s+)?(your\s+)?(medication|medicine|drug|antibiotic|antimalarial)\b/i,
  },
  {
    category: 'emergency_minimization',
    label: 'no need for emergency/urgent care',
    pattern: /\bno need (?:for|to) (?:emergency|urgent|a doctor|to see)\b/i,
  },
  {
    category: 'certainty',
    label: 'certainty language',
    pattern: /\b(definitely|certainly have|this confirms)\b/i,
  },
  {
    category: 'diagnosis',
    label: 'you have [condition]',
    pattern: /\byou have (?:a |an )?[a-z][a-z\s-]{2,40}\b/i,
  },
  {
    category: 'diagnosis',
    label: 'treatment plan',
    pattern: /\btreatment plan\b/i,
  },
] as const;

export type BlockedOutputViolation = {
  category: BlockedOutputCategory;
  label: string;
  source: 'health_intelligence' | 'medical_boundary' | 'plan_boundary';
};

export function findHealthIntelligenceBlockedViolations(text: string): BlockedOutputViolation[] {
  const violations: BlockedOutputViolation[] = [];
  const maskedText = maskSafeNegationPhrases(text);

  for (const entry of HEALTH_INTELLIGENCE_BLOCKED_PATTERNS) {
    if (entry.pattern.test(maskedText)) {
      violations.push({
        category: entry.category,
        label: entry.label,
        source: 'health_intelligence',
      });
    }
  }

  if (findMedicalBoundaryViolations(maskedText).length > 0) {
    violations.push({
      category: 'diagnosis',
      label: 'aiMedicalBoundary violation',
      source: 'medical_boundary',
    });
  }

  if (containsDisallowedActionText(maskedText)) {
    violations.push({
      category: 'diagnosis',
      label: 'planActionBoundaries violation',
      source: 'plan_boundary',
    });
  }

  return dedupeViolations(violations);
}

function maskSafeNegationPhrases(text: string): string {
  return text
    .replace(/\bdoes not diagnos\w*\b/gi, '')
    .replace(/\bdo not diagnos\w*\b/gi, '')
    .replace(/\bnot a diagnos\w*\b/gi, '')
    .replace(/\bwithout diagnos\w*\b/gi, '')
    .replace(/\bno diagnos\w*\b/gi, '');
}

function dedupeViolations(violations: BlockedOutputViolation[]): BlockedOutputViolation[] {
  const seen = new Set<string>();
  const result: BlockedOutputViolation[] = [];
  for (const violation of violations) {
    const key = `${violation.source}:${violation.label}:${violation.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(violation);
  }
  return result;
}

export function isHealthIntelligenceOutputBlocked(text: string): boolean {
  return findHealthIntelligenceBlockedViolations(text).length > 0;
}

/** Safe phrasing aligned with aiMedicalBoundary required disclaimers. */
export const SAFE_RESPONSE_PHRASES = [
  'this does not diagnose',
  'consider speaking with a clinician',
  'if symptoms are severe, sudden, or unsafe, seek urgent care',
  'not a diagnosis',
  'for a clinician to review',
  'organize your notes',
] as const;

export function containsSafeResponseLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return SAFE_RESPONSE_PHRASES.some((phrase) => lower.includes(phrase));
}
