import type { AIKernelResponse } from './aiTypes';

const MEDICAL_VIOLATION_PATTERNS = [
  /\byou have\b/i,
  /\bdiagnosis|diagnosed\b/i,
  /\bprescribe|prescription|dosage|dose\b/i,
  /\bstart medication|stop medication|change medication\b/i,
  /\btreatment plan|treat this by\b/i,
  /\bno need for emergency|safe to wait\b/i,
];

const MAX_TEXT_LENGTH = 280;

export function containsMedicalViolation(text: string): boolean {
  return MEDICAL_VIOLATION_PATTERNS.some((pattern) => pattern.test(text));
}

export function enforceMaxQuestions(output: AIKernelResponse): AIKernelResponse {
  return {
    ...output,
    missingQuestions: output.missingQuestions.slice(0, 2),
  };
}

export function validateAIOutput(output: AIKernelResponse): boolean {
  if (!output || typeof output !== 'object') return false;
  if (containsMedicalViolation(output.refinedConcern)) return false;
  if (output.refinedConcern.length > MAX_TEXT_LENGTH) return false;
  if (!Array.isArray(output.missingQuestions)) return false;
  if (output.missingQuestions.some((q) => containsMedicalViolation(q) || q.length > MAX_TEXT_LENGTH)) {
    return false;
  }
  if (!['low', 'medium', 'unknown'].includes(output.severityGuess)) return false;
  if (!Array.isArray(output.tags)) return false;
  return true;
}
