export type ConcernType =
  | 'Physical symptom'
  | 'Mood or stress'
  | 'Sleep or energy'
  | 'Medication question'
  | 'Preparing for a clinician'
  | 'Not sure';

export type AskGoal =
  | 'One next step'
  | 'Prepare a doctor summary'
  | 'Know what to track'
  | 'Calm my body'
  | 'Decide if I should seek help';

export interface AskIntakeData {
  mainConcern: string;
  concernType: string;
  timeline: string;
  intensity: number;
  intensityNote: string;
  whatChanged: string;
  triedSoFar: string;
  redFlags: string[];
  redFlagOther: string;
  goal: string;
}

export interface AskHistoryEntry {
  id: string;
  concern: string;
  concernType: string;
  nextStep: string;
  createdAt: string;
  savedToDoctorSummary: boolean;
}

export const ASK_QUICK_STARTS = [
  { label: 'Something feels off', prefill: 'Something feels off' },
  { label: 'A symptom I want to organize', prefill: '' },
  { label: 'I\u2019m feeling stressed or overwhelmed', prefill: 'Feeling stressed or overwhelmed' },
  { label: 'I\u2019m preparing for a doctor visit', prefill: 'Preparing for a doctor visit' },
  { label: 'I want to understand what to track', prefill: 'Want to understand what to track' },
] as const;

export const CONCERN_TYPE_OPTIONS: ConcernType[] = [
  'Physical symptom',
  'Mood or stress',
  'Sleep or energy',
  'Medication question',
  'Preparing for a clinician',
  'Not sure',
];

export const TIMELINE_OPTIONS = [
  'Started today',
  'A few days',
  'More than a week',
  'Comes and goes',
  'I\u2019m not sure',
] as const;

export const RED_FLAG_OPTIONS = [
  'Chest pain',
  'Trouble breathing',
  'Fainting',
  'Severe sudden pain',
  'Thoughts of harming myself',
  'Heavy bleeding',
  'Face drooping or sudden weakness',
  'None of these',
] as const;

export const ASK_GOAL_OPTIONS: AskGoal[] = [
  'One next step',
  'Prepare a doctor summary',
  'Know what to track',
  'Calm my body',
  'Decide if I should seek help',
];

export const EMPTY_ASK_INTAKE: AskIntakeData = {
  mainConcern: '',
  concernType: '',
  timeline: '',
  intensity: 5,
  intensityNote: '',
  whatChanged: '',
  triedSoFar: '',
  redFlags: [],
  redFlagOther: '',
  goal: '',
};

export const ASK_INTAKE_STEP_COUNT = 9;

export const ASK_STEP_HELPERS = [
  'Use your own words — there is no wrong way to describe this.',
  'This helps Curavon organize your notes, not label you.',
  'Rough timing is enough.',
  'Your first instinct is fine.',
  'Sleep, food, stress, medication, activity, illness — anything unusual.',
  'Rest, water, medication, talking to someone, nothing yet…',
  'Select all that apply. Choose “None of these” if none fit.',
  'Pick what would feel most helpful right now.',
  'Review before Curavon suggests one safe next step.',
];
