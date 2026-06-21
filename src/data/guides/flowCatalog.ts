export type FlowId =
  | 'something-feels-off'
  | 'doctor-visit-prep'
  | 'mood-stress-checkin'
  | 'monthly-wellness-review'
  | 'headache'
  | 'stomach-pain'
  | 'medication-review';

export type FlowCategory = 'flows' | 'mind' | 'symptoms' | 'doctor-prep' | 'basics';

export type FlowCard = {
  id: FlowId;
  title: string;
  description: string;
  estimatedTime: string;
  tag: string;
  categories: Array<'flows' | 'mind' | 'symptoms' | 'doctor-prep' | 'basics'>;
  helpsOrganize: string;
};

export const FLOW_CARDS: FlowCard[] = [
  {
    id: 'something-feels-off',
    title: 'Something Feels Off',
    description: "When you can't quite explain what's wrong, organize the details gently.",
    estimatedTime: '4 min',
    tag: 'Guided support',
    categories: ['flows', 'symptoms'],
    helpsOrganize: 'What feels noticeable, how long it has lasted, intensity, triggers, and warning signs.',
  },
  {
    id: 'doctor-visit-prep',
    title: 'Doctor Visit Prep',
    description: 'Turn your concerns into a clear summary before an appointment.',
    estimatedTime: '5 min',
    tag: 'Doctor-ready',
    categories: ['flows', 'doctor-prep'],
    helpsOrganize: 'Main concern, timeline, what you already tried, and key questions to ask.',
  },
  {
    id: 'mood-stress-checkin',
    title: 'Mood & Stress Check-In',
    description: "Sort what you're feeling and choose one gentle next step.",
    estimatedTime: '4 min',
    tag: 'Mental wellness',
    categories: ['flows', 'mind'],
    helpsOrganize: 'Emotional pattern, likely contributors, intensity, and support preference.',
  },
  {
    id: 'monthly-wellness-review',
    title: 'Monthly Wellness Review',
    description: 'Look back at sleep, stress, symptoms, and actions from the month.',
    estimatedTime: '6 min',
    tag: 'Monthly review',
    categories: ['flows', 'basics'],
    helpsOrganize: 'Monthly trends and what may deserve attention next.',
  },
  {
    id: 'headache',
    title: 'Headache',
    description: 'Track timing, triggers, severity, and red-flag signs.',
    estimatedTime: '4 min',
    tag: 'Symptoms',
    categories: ['flows', 'symptoms'],
    helpsOrganize: 'Headache timing, pattern, potential triggers, and urgent warning signs.',
  },
  {
    id: 'stomach-pain',
    title: 'Stomach Pain',
    description: 'Organize symptoms, timing, food patterns, and care signals.',
    estimatedTime: '4 min',
    tag: 'Symptoms',
    categories: ['flows', 'symptoms'],
    helpsOrganize: 'Pain timing, food context, symptom pattern, and when to reach out.',
  },
  {
    id: 'medication-review',
    title: 'Medication Review',
    description: 'Prepare notes about medications, side effects, and questions for a clinician.',
    estimatedTime: '5 min',
    tag: 'Medication notes',
    categories: ['flows', 'doctor-prep', 'basics'],
    helpsOrganize: 'Medication list, timing, side effects, and clinician questions.',
  },
];

export const FLOW_CARD_IDS = FLOW_CARDS.map((flow) => flow.id);
