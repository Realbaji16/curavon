import type { FormInsight } from '../types';
import {
  assessFormInsightProductText,
  type FormInsightProductTextCheck,
} from '../review/insightReviewPolicy';

export type PromotionValidationResult = {
  valid: boolean;
  reasons: readonly string[];
};

const MEDICATION_ADVICE_PATTERNS: readonly RegExp[] = [
  /\b(take|start|stop|continue|switch|change)\s+(the|your|this)\s+(drug|medicine|medication|antibiotic|antimalarial|tablet|pill)\b/i,
  /\byou should (take|use|start|stop|switch)\b/i,
  /\b(prescribe|prescription)\b/i,
  /\b\d+\s*(mg|ml|mcg|tablet|tablets|pill|pills|capsule|capsules|dose|doses)\b/i,
  /\bwhat dose\b/i,
  /\bhow many (tablets|pills|capsules|doses)\b/i,
];

const DIAGNOSIS_PATTERNS: readonly RegExp[] = [
  /\bdiagnos(e|is|ing|ed)\b/i,
  /\byou have (malaria|typhoid|ulcer|infection|meningitis|appendicitis|hypertension)\b/i,
  /\bthis (is|means|confirms)\s+(malaria|typhoid|an infection)\b/i,
];

export function validateInsightTextForLivePromotion(text: string): PromotionValidationResult {
  const reasons: string[] = [];
  const trimmed = text.trim();

  if (!trimmed) {
    return { valid: false, reasons: ['empty_text'] };
  }

  const productCheck: FormInsightProductTextCheck = assessFormInsightProductText(trimmed);
  if (!productCheck.allowed) {
    reasons.push(...productCheck.reasons);
  }

  for (const pattern of MEDICATION_ADVICE_PATTERNS) {
    if (pattern.test(trimmed)) {
      reasons.push(`medication_advice:${pattern.source}`);
    }
  }

  for (const pattern of DIAGNOSIS_PATTERNS) {
    if (pattern.test(trimmed)) {
      reasons.push(`diagnosis:${pattern.source}`);
    }
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateInsightForLivePromotion(insight: FormInsight): PromotionValidationResult {
  const reasons: string[] = [];

  if (insight.status === 'rejected') {
    reasons.push('insight_rejected');
  }

  if (insight.medicalTruth !== false) {
    reasons.push('medical_truth_not_false');
  }

  if (insight.approvedFor === 'none') {
    reasons.push('approved_for_none');
  }

  const summaryCheck = validateInsightTextForLivePromotion(insight.summary);
  if (!summaryCheck.valid) {
    reasons.push(...summaryCheck.reasons.map((reason) => `summary:${reason}`));
  }

  for (const pattern of insight.evidence.matchedPatterns ?? []) {
    const patternCheck = validateInsightTextForLivePromotion(pattern);
    if (!patternCheck.valid) {
      reasons.push(...patternCheck.reasons.map((reason) => `pattern:${reason}`));
    }
  }

  return { valid: reasons.length === 0, reasons };
}
