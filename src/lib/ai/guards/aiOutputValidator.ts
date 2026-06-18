import type { AIRequest, AIResponse } from '../aiTypes';
import { findMedicalBoundaryViolations, isWithinMedicalBoundary } from './aiMedicalBoundary';

export interface AIValidationResult {
  valid: boolean;
  warnings: string[];
}

export function validateAIOutput(request: AIRequest, response: AIResponse): AIValidationResult {
  const warnings = [...response.warnings];
  const text = response.text || '';

  if (!text.trim()) {
    warnings.push('AI output is empty.');
    return { valid: false, warnings };
  }

  if (!isWithinMedicalBoundary(text)) {
    warnings.push(...findMedicalBoundaryViolations(text));
    return { valid: false, warnings };
  }

  const blockedLower = request.blockedOutput.map((item) => item.toLowerCase());
  const textLower = text.toLowerCase();
  if (blockedLower.some((keyword) => textLower.includes(keyword))) {
    warnings.push('AI output contained blocked output keyword.');
    return { valid: false, warnings };
  }

  return { valid: true, warnings };
}
