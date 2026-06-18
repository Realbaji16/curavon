import { detectUrgentConcern } from '../../utils/healthSafety';
import type { FollowUpOutcome } from './followUpTypes';

export function detectFollowUpSafetyEscalation(
  outcome: FollowUpOutcome,
  userNote?: string,
): { shouldEscalate: boolean; matches: string[] } {
  if (outcome !== 'worse') return { shouldEscalate: false, matches: [] };
  const urgent = detectUrgentConcern(userNote ?? '');
  return {
    shouldEscalate: urgent.hasUrgent,
    matches: urgent.matches,
  };
}

export function containsMedicationSignal(text: string): boolean {
  return /\bmedication|medicine|dose|tablet|capsule|pharmacist|side effect\b/i.test(text);
}

export function safeMedicationFollowUpLanguage(note: string): string {
  if (!containsMedicationSignal(note)) return note;
  return `${note} Consider writing one clinician or pharmacist question.`;
}
