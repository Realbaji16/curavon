/**
 * Safety policy for applying uploaded-form insights as product context.
 * Form insights must never surface diagnosis, prescription, dosage, or treatment advice.
 */

const FORBIDDEN_CLINICAL_ADVICE_PATTERNS: readonly RegExp[] = [
  /\bdiagnos(e|is|ing|ed)\b/i,
  /\bprescri(be|ption|bed|bing)\b/i,
  /\b(take|start|stop|switch)\s+(this|the|your)\s+(drug|medicine|medication|antibiotic|antimalarial)\b/i,
  /\b\d+\s*(mg|ml|mcg|tablet|tablets|pill|pills|capsule|capsules|dose|doses)\b/i,
  /\bwhat dose\b/i,
  /\bhow many (tablets|pills|capsules|doses)\b/i,
  /\byou should (take|use|start|stop)\b/i,
  /\brecommend(s|ed|ing)?\s+(treatment|medication|diagnosis)\b/i,
  /\btreat(s|ing|ment)?\s+(with|using)\s+\w+\s+(drug|medicine)\b/i,
];

const MAX_PRODUCT_CONTEXT_LENGTH = 220;

export type FormInsightProductTextCheck = {
  allowed: boolean;
  reasons: string[];
};

export function assessFormInsightProductText(text: string): FormInsightProductTextCheck {
  const trimmed = text.trim();
  const reasons: string[] = [];

  if (!trimmed) {
    return { allowed: false, reasons: ['empty_text'] };
  }

  if (trimmed.length > MAX_PRODUCT_CONTEXT_LENGTH) {
    reasons.push('text_too_long');
  }

  for (const pattern of FORBIDDEN_CLINICAL_ADVICE_PATTERNS) {
    if (pattern.test(trimmed)) {
      reasons.push(`forbidden_pattern:${pattern.source}`);
    }
  }

  return { allowed: reasons.length === 0, reasons };
}

export function isSafeFormInsightProductText(text: string): boolean {
  return assessFormInsightProductText(text).allowed;
}

/** Return trimmed product-safe text or null when policy blocks it. */
export function sanitizeFormInsightProductText(text: string): string | null {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!isSafeFormInsightProductText(trimmed)) {
    return null;
  }
  if (trimmed.length <= MAX_PRODUCT_CONTEXT_LENGTH) {
    return trimmed;
  }
  return `${trimmed.slice(0, MAX_PRODUCT_CONTEXT_LENGTH - 1)}…`;
}

export function assertNoClinicalAdviceInProductContext(text: string): void {
  if (!isSafeFormInsightProductText(text)) {
    throw new Error('Form insight product context contains disallowed clinical advice patterns.');
  }
}
