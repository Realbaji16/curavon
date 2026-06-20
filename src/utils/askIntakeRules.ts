import { detectRedFlags } from '../lib/health/redFlags';
import type { AskIntakeData, ConcernType } from '../types/askIntake';
import { SELF_HARM_URGENT_BODY } from './healthSafety';

export type RecommendedGuideFlowId =
  | 'something-feels-off'
  | 'doctor-visit-prep'
  | 'mood-stress-checkin'
  | 'headache'
  | 'stomach-pain'
  | 'medication-review';

export const MENTAL_HEALTH_SAFETY_MESSAGE =
  SELF_HARM_URGENT_BODY;

export const WATCH_POINTS = [
  'If symptoms become severe, sudden, or unsafe, seek medical help.',
  'If this continues or worsens, consider speaking with a clinician.',
  'Tracking timing, triggers, and changes can make your next step clearer.',
];

export function collectIntakeSafetyText(intake: AskIntakeData): string {
  return [
    intake.mainConcern,
    intake.redFlagOther,
    intake.whatChanged,
    intake.intensityNote,
    intake.triedSoFar,
  ]
    .filter(Boolean)
    .join(' ');
}

export function effectiveIntakeRedFlagSelections(intake: AskIntakeData): string[] {
  const flags = [...intake.redFlags];
  const other = intake.redFlagOther.trim();
  if (other && !flags.includes('None of these')) {
    flags.push(other);
  }
  return flags;
}

export function hasUrgentRedFlags(redFlags: string[]): boolean {
  return redFlags.some((f) => f !== 'None of these');
}

export function hasSelfHarmRedFlag(redFlags: string[], safetyText?: string): boolean {
  if (redFlags.includes('Thoughts of harming myself')) {
    return true;
  }
  if (safetyText?.trim()) {
    return detectRedFlags(safetyText).selfHarm;
  }
  return false;
}

export function detectIntakeRedFlags(intake: AskIntakeData) {
  const safetyText = collectIntakeSafetyText(intake);
  const textDetection = detectRedFlags(safetyText);
  const selectedFlags = effectiveIntakeRedFlagSelections(intake).filter((flag) => flag !== 'None of these');
  return {
    ...textDetection,
    selectedFlags,
    hasUrgent: textDetection.hasUrgent || hasUrgentRedFlags(selectedFlags),
  };
}

export function hasUrgentIntakeSignals(intake: AskIntakeData): boolean {
  return detectIntakeRedFlags(intake).hasUrgent;
}

export function generateNextSafeStep(intake: AskIntakeData): string {
  switch (intake.concernType) {
    case 'Physical symptom':
      return 'Write down when it started, intensity, what makes it better or worse, and whether it changes over time.';
    case 'Mood or stress':
      return 'Take two minutes to slow your breathing, then write one sentence about what feels loudest.';
    case 'Sleep or energy':
      return 'Note sleep quality, energy level, and one thing that may have affected rest.';
    case 'Medication question':
      return 'Write down the medication name, what you noticed, and contact a clinician or pharmacist if unsure.';
    case 'Preparing for a clinician':
      return 'Save this intake as a doctor-ready summary and bring it to your appointment.';
    case 'Not sure':
      return 'Start with one note: what changed, when it started, and what feels most important.';
    default:
      if (intake.goal === 'Prepare a doctor summary') {
        return 'Save this intake as a doctor-ready summary and bring it to your appointment.';
      }
      return 'Start with one note: what changed, when it started, and what feels most important.';
  }
}

export function recommendGuideFlow(intake: AskIntakeData): {
  id: RecommendedGuideFlowId;
  title: string;
} {
  const concern = intake.mainConcern.toLowerCase();

  if (intake.concernType === 'Mood or stress') {
    return { id: 'mood-stress-checkin', title: 'Mood & Stress Check-In' };
  }
  if (intake.concernType === 'Preparing for a clinician') {
    return { id: 'doctor-visit-prep', title: 'Doctor Visit Prep' };
  }
  if (intake.concernType === 'Medication question') {
    return { id: 'medication-review', title: 'Medication Review' };
  }
  if (intake.concernType === 'Physical symptom') {
    if (/headache|head ache|migraine/.test(concern)) {
      return { id: 'headache', title: 'Headache' };
    }
    if (/stomach|nausea|abdomen|belly|gut|cramp/.test(concern)) {
      return { id: 'stomach-pain', title: 'Stomach Pain' };
    }
  }
  if (intake.concernType === 'Sleep or energy') {
    return { id: 'something-feels-off', title: 'Something Feels Off' };
  }
  if (intake.concernType === 'Not sure') {
    return { id: 'something-feels-off', title: 'Something Feels Off' };
  }
  if (intake.goal === 'Prepare a doctor summary') {
    return { id: 'doctor-visit-prep', title: 'Doctor Visit Prep' };
  }
  return { id: 'something-feels-off', title: 'Something Feels Off' };
}

export function concernTypeSlug(type: ConcernType | ''): string {
  if (!type) return 'concern';
  return type.toLowerCase().replace(/\s+/g, '-');
}
