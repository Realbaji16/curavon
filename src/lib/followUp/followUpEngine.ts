import type { FollowUpDecision, FollowUpOutcome, FollowUpRecord } from './followUpTypes';
import {
  containsMedicationSignal,
  detectFollowUpSafetyEscalation,
  safeMedicationFollowUpLanguage,
} from './followUpGuards';

export function evaluateFollowUp(
  record: FollowUpRecord,
  outcome: FollowUpOutcome,
  userNote: string,
): FollowUpDecision {
  const note = userNote.trim();
  const noteWithMedicationGuard = safeMedicationFollowUpLanguage(note);
  const medicationSignal = containsMedicationSignal(noteWithMedicationGuard);

  if (outcome === 'helped') {
    return {
      outcome,
      nextState: 'reinforce',
      recommendedNextStep: 'Keep this as a useful step',
      shouldGenerateNewAction: false,
      shouldSaveToDoctorSummary: Boolean(noteWithMedicationGuard),
      shouldEscalate: false,
      reason: noteWithMedicationGuard || 'Helpful action confirmed.',
    };
  }

  if (outcome === 'partly_helped') {
    return {
      outcome,
      nextState: 'adjust',
      recommendedNextStep: 'Make the next step more specific or smaller',
      shouldGenerateNewAction: true,
      shouldSaveToDoctorSummary: Boolean(noteWithMedicationGuard),
      shouldEscalate: false,
      reason: noteWithMedicationGuard || 'Partly helpful outcome.',
    };
  }

  if (outcome === 'blocked') {
    return {
      outcome,
      nextState: 'reduce_friction',
      recommendedNextStep: 'Choose a smaller version or identify what got in the way',
      shouldGenerateNewAction: true,
      shouldSaveToDoctorSummary: Boolean(noteWithMedicationGuard) || medicationSignal,
      shouldEscalate: false,
      reason: noteWithMedicationGuard || 'Blocked outcome needs friction reduction.',
    };
  }

  if (outcome === 'not_done') {
    return {
      outcome,
      nextState: 'simplify',
      recommendedNextStep: 'Try a lower-effort version',
      shouldGenerateNewAction: true,
      shouldSaveToDoctorSummary: false,
      shouldEscalate: false,
      reason: noteWithMedicationGuard || 'Action was not completed.',
    };
  }

  if (outcome === 'not_relevant') {
    return {
      outcome,
      nextState: 'reassess',
      recommendedNextStep: 'Curavon should ask one clarifying question',
      shouldGenerateNewAction: true,
      shouldSaveToDoctorSummary: false,
      shouldEscalate: false,
      reason: noteWithMedicationGuard || 'Action no longer relevant to concern.',
    };
  }

  const escalation = detectFollowUpSafetyEscalation(outcome, noteWithMedicationGuard);
  if (escalation.shouldEscalate || record.linkedSafetyLevel === 'urgent') {
    return {
      outcome,
      nextState: 'escalate',
      recommendedNextStep: 'Use safety support now and prepare urgent notes for clinician review',
      shouldGenerateNewAction: false,
      shouldSaveToDoctorSummary: true,
      shouldEscalate: true,
      reason:
        noteWithMedicationGuard ||
        `Worse outcome with urgent signal: ${escalation.matches[0] ?? 'urgent concern'}`,
    };
  }

  return {
    outcome: 'worse',
    nextState: 'track_or_prepare',
    recommendedNextStep: 'Record what changed and consider preparing a clinician note',
    shouldGenerateNewAction: true,
    shouldSaveToDoctorSummary: true,
    shouldEscalate: false,
    reason: noteWithMedicationGuard || `Worse outcome for ${record.linkedActionTitle}.`,
  };
}
