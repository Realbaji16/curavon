import type { DoctorSummaryOutput } from './doctorSummaryTypes';

const BANNED_PATTERNS = [
  /\byou have\b/i,
  /\bthis means\b/i,
  /\btreatment plan\b/i,
  /\bstart taking|stop taking|dose|dosage\b/i,
  /\bno need to see a doctor|harmless|definitely\b/i,
  /\blab (?:result|report).*(normal|abnormal|confirms)\b/i,
  /\bas your doctor|as a clinician\b/i,
];

function hasBanned(text: string): boolean {
  return BANNED_PATTERNS.some((pattern) => pattern.test(text));
}

export function isDoctorSummaryOutputSafe(output: DoctorSummaryOutput): boolean {
  const allText = [
    output.summaryTitle,
    ...output.mainConcerns,
    ...output.symptomTimeline,
    ...output.recentPatterns,
    ...output.actionsTried,
    ...output.questionsForClinician,
    ...output.redFlagNotes,
    ...output.medicationNotes,
    ...output.userGoals,
    output.footer,
  ].join('\n');
  return !hasBanned(allText);
}

export function createFallbackDoctorSummary(input: {
  dateRange: string;
  mainConcerns: string[];
  timeline: string[];
  patterns: string[];
  actions: string[];
  questions: string[];
  redFlags: string[];
  medicationNotes: string[];
  goals: string[];
}): DoctorSummaryOutput {
  return {
    summaryTitle: 'Curavon Doctor Summary',
    dateRange: input.dateRange,
    mainConcerns: input.mainConcerns.slice(0, 8),
    symptomTimeline: input.timeline.slice(0, 8),
    recentPatterns: input.patterns.slice(0, 8),
    actionsTried: input.actions.slice(0, 8),
    questionsForClinician: input.questions.slice(0, 8),
    redFlagNotes: input.redFlags.slice(0, 8),
    medicationNotes: input.medicationNotes.slice(0, 8),
    userGoals: input.goals.slice(0, 8),
    footer: 'This summary is generated from user-provided notes and is not a diagnosis.',
    aiUsed: false,
    fallbackUsed: true,
  };
}
