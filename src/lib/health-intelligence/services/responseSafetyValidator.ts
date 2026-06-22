import type { BlockedOutputCategory, BlockedOutputViolation } from '../actions/blockedOutputs';
import {
  containsSafeResponseLanguage,
  findHealthIntelligenceBlockedViolations,
  isHealthIntelligenceOutputBlocked,
} from '../actions/blockedOutputs';
import { enforceSafeLanguage } from '../../ai/guards/aiMedicalBoundary';

export type ResponseSafetyValidationResult = {
  allowed: boolean;
  violations: BlockedOutputViolation[];
  blockedCategories: BlockedOutputCategory[];
  hasSafeLanguage: boolean;
  sanitizedText?: string;
};

export type ValidateHealthIntelligenceResponseOptions = {
  /** When true, append shared safe-language disclaimer if missing. */
  appendSafeDisclaimer?: boolean;
};

/**
 * Validate health-intelligence response text against Phase 1 blocked output policy.
 * Reuses aiMedicalBoundary and planActionBoundaries checks without contradicting them.
 */
export function validateHealthIntelligenceResponse(
  text: string,
  options: ValidateHealthIntelligenceResponseOptions = {},
): ResponseSafetyValidationResult {
  const violations = findHealthIntelligenceBlockedViolations(text);
  const allowed = violations.length === 0;
  const blockedCategories = [...new Set(violations.map((violation) => violation.category))];
  const hasSafeLanguage = containsSafeResponseLanguage(text);

  let sanitizedText: string | undefined;
  if (!allowed && options.appendSafeDisclaimer) {
    sanitizedText = enforceSafeLanguage(stripUnsafeSentences(text));
  } else if (allowed && options.appendSafeDisclaimer) {
    sanitizedText = enforceSafeLanguage(text);
  }

  return {
    allowed,
    violations,
    blockedCategories,
    hasSafeLanguage,
    sanitizedText,
  };
}

/** Quick boolean guard for pipelines that only need pass/fail. */
export function isHealthIntelligenceResponseAllowed(text: string): boolean {
  return !isHealthIntelligenceOutputBlocked(text);
}

function stripUnsafeSentences(text: string): string {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const safeSentences = sentences.filter((sentence) => isHealthIntelligenceResponseAllowed(sentence));
  if (safeSentences.length === 0) {
    return 'Curavon can help organize your notes for a clinician or pharmacist to review.';
  }
  return safeSentences.join(' ');
}

export function assertHealthIntelligenceResponseSafe(text: string): void {
  const result = validateHealthIntelligenceResponse(text);
  if (!result.allowed) {
    const labels = result.violations.map((violation) => violation.label).join(', ');
    throw new Error(`Health intelligence response blocked: ${labels}`);
  }
}
