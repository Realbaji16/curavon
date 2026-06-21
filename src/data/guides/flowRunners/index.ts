import type { FlowId } from '../flowCatalog';

export type QuestionType = 'single' | 'multi' | 'scale' | 'shortText' | 'yesno';

export type FlowQuestion = {
  id: string;
  prompt: string;
  helper?: string;
  type: QuestionType;
  options?: string[];
  min?: number;
  max?: number;
};

export type FlowDefinition = {
  id: FlowId;
  watch: string[];
  nextStep: string;
  doctorSummaryTemplate: string;
  questions?: FlowQuestion[];
};

export const FLOW_RUNNERS: Record<FlowId, FlowDefinition> = {
  'something-feels-off': {
    id: 'something-feels-off',
    questions: [
      {
        id: 'noticeable',
        prompt: 'What feels most noticeable right now?',
        type: 'single',
        options: ['Pain or discomfort', 'Low energy', 'Mood or stress', 'Sleep issue', 'Something else'],
      },
      {
        id: 'duration',
        prompt: 'How long has this been happening?',
        type: 'single',
        options: ['Today', 'A few days', 'More than a week', 'Comes and goes'],
      },
      {
        id: 'intensity',
        prompt: 'How intense does it feel?',
        helper: '1 = very mild, 10 = very intense',
        type: 'scale',
        min: 1,
        max: 10,
      },
      {
        id: 'worse',
        prompt: 'Is anything making it worse?',
        type: 'shortText',
      },
      {
        id: 'urgent',
        prompt: 'Any urgent warning signs?',
        type: 'multi',
        options: ['Chest pain', 'Trouble breathing', 'Fainting', 'Severe sudden pain', 'None of these'],
      },
    ],
    watch: [
      'Any change in timing, intensity, or trigger pattern',
      'Symptoms that become severe, sudden, or hard to explain',
      'Warning signs like chest pain, breathing trouble, or fainting',
    ],
    nextStep:
      'Write down when it started, what changed, and what makes it better or worse. If symptoms become severe or urgent, seek medical care.',
    doctorSummaryTemplate:
      'Main concern, timeline, intensity, and warning signs are organized for your next care conversation.',
  },
  'mood-stress-checkin': {
    id: 'mood-stress-checkin',
    questions: [
      {
        id: 'feeling',
        prompt: 'What best describes how you feel?',
        type: 'single',
        options: ['Overwhelmed', 'Anxious', 'Low', 'Irritable', 'Numb', 'Not sure'],
      },
      {
        id: 'contributors',
        prompt: 'What might be contributing?',
        type: 'multi',
        options: ['Work/school', 'Relationships', 'Health worry', 'Sleep', 'Money', "I'm not sure"],
      },
      {
        id: 'strength',
        prompt: 'How strong does it feel today?',
        helper: '1 = very light, 10 = very heavy',
        type: 'scale',
        min: 1,
        max: 10,
      },
      {
        id: 'support',
        prompt: 'What kind of support would help right now?',
        type: 'single',
        options: ['Calm my body', 'Organize my thoughts', 'Prepare to talk to someone', 'Take one small action'],
      },
      {
        id: 'safety',
        prompt: 'Are you feeling unsafe or at risk of harming yourself?',
        type: 'yesno',
        options: ['Yes', 'No', "I'm not sure"],
      },
    ],
    watch: [
      'Times of day when stress feels highest',
      'Triggers that repeatedly amplify worry or overwhelm',
      'Which grounding step helps you recover faster',
    ],
    nextStep:
      'Choose one grounding action now, then save a short note about what triggered the feeling.',
    doctorSummaryTemplate:
      'Mood pattern, stress contributors, and support preferences are summarized for easier discussion.',
  },
  'doctor-visit-prep': {
    id: 'doctor-visit-prep',
    questions: [
      {
        id: 'visit-help',
        prompt: 'What do you want help preparing for?',
        type: 'single',
        options: ['New symptom', 'Ongoing issue', 'Medication question', 'Test/result question', 'General checkup'],
      },
      {
        id: 'main-concern',
        prompt: 'What is the main concern?',
        type: 'shortText',
      },
      {
        id: 'duration',
        prompt: 'How long has it been happening?',
        type: 'single',
        options: ['Today', 'A few days', 'Weeks', 'Months', 'Longer'],
      },
      {
        id: 'tried',
        prompt: 'What have you already tried?',
        type: 'shortText',
      },
      {
        id: 'questions',
        prompt: 'What do you want to ask the clinician?',
        type: 'shortText',
      },
    ],
    watch: [
      'How the concern has changed over time',
      'Which actions helped or did not help',
      'Questions that still need clear answers',
    ],
    nextStep:
      'Save this as a doctor-ready summary and bring it to your appointment.',
    doctorSummaryTemplate:
      'Concern history, attempted actions, and visit questions are formatted for clinician review.',
  },
  'monthly-wellness-review': {
    id: 'monthly-wellness-review',
    questions: [
      {
        id: 'month-theme',
        prompt: 'What felt most noticeable this month?',
        type: 'single',
        options: ['Sleep changes', 'Stress pressure', 'Symptoms', 'Energy shifts', 'Medication or routine changes'],
      },
      {
        id: 'month-pattern',
        prompt: 'Which pattern appeared most often?',
        type: 'shortText',
      },
      {
        id: 'month-support',
        prompt: 'What one support step felt most helpful?',
        type: 'shortText',
      },
      {
        id: 'month-urgent',
        prompt: 'Any urgent warning signs this month?',
        type: 'multi',
        options: ['Chest pain', 'Trouble breathing', 'Fainting', 'Severe sudden pain', 'None of these'],
      },
    ],
    watch: ['Sleep consistency', 'Stress pattern', 'Symptom recurrence'],
    nextStep:
      'Pick one pattern from the month and choose one manageable action for the coming week.',
    doctorSummaryTemplate: 'Monthly trends are summarized for a future check-in.',
  },
  headache: {
    id: 'headache',
    questions: [
      {
        id: 'headache-when',
        prompt: 'When do headaches usually appear?',
        type: 'single',
        options: ['Morning', 'Afternoon', 'Evening', 'No clear time', 'Not sure'],
      },
      {
        id: 'headache-intensity',
        prompt: 'How strong has it felt recently?',
        helper: '1 = very mild, 10 = very intense',
        type: 'scale',
        min: 1,
        max: 10,
      },
      {
        id: 'headache-triggers',
        prompt: 'Possible triggers you noticed',
        type: 'shortText',
      },
      {
        id: 'headache-urgent',
        prompt: 'Any urgent warning signs?',
        type: 'multi',
        options: ['Worst headache', 'Face drooping', 'Sudden weakness', 'Trouble breathing', 'None of these'],
      },
    ],
    watch: ['Timing and trigger pattern', 'Intensity shifts', 'Any urgent warning signs'],
    nextStep:
      'Track headache timing and possible triggers this week, and seek urgent care if severe or sudden symptoms appear.',
    doctorSummaryTemplate: 'Headache timeline and trigger notes are prepared for care discussion.',
  },
  'stomach-pain': {
    id: 'stomach-pain',
    questions: [
      {
        id: 'stomach-when',
        prompt: 'When are symptoms most noticeable?',
        type: 'single',
        options: ['Before meals', 'After meals', 'At night', 'Random', 'Not sure'],
      },
      {
        id: 'stomach-feel',
        prompt: 'Which symptoms fit best?',
        type: 'multi',
        options: ['Pain', 'Nausea', 'Cramping', 'Diarrhea', 'Bloating', 'None of these'],
      },
      {
        id: 'stomach-intensity',
        prompt: 'How intense has it felt recently?',
        helper: '1 = very mild, 10 = very intense',
        type: 'scale',
        min: 1,
        max: 10,
      },
      {
        id: 'stomach-urgent',
        prompt: 'Any urgent warning signs?',
        type: 'multi',
        options: ['Severe sudden pain', 'Heavy bleeding', 'Fainting', 'Trouble breathing', 'None of these'],
      },
    ],
    watch: ['Meal timing relationship', 'Pain pattern', 'Worsening or urgent changes'],
    nextStep:
      'Track food timing and symptom pattern for a few days, and seek urgent care if pain becomes severe or sudden.',
    doctorSummaryTemplate: 'Stomach symptom pattern is summarized for clinician review.',
  },
  'medication-review': {
    id: 'medication-review',
    questions: [
      {
        id: 'med-name',
        prompt: 'Which medication or supplement is your main concern?',
        type: 'shortText',
      },
      {
        id: 'med-change',
        prompt: 'What did you notice?',
        type: 'shortText',
      },
      {
        id: 'med-question',
        prompt: 'What question do you want to ask a clinician or pharmacist?',
        type: 'shortText',
      },
      {
        id: 'med-urgent',
        prompt: 'Any urgent warning signs?',
        type: 'multi',
        options: ['Trouble breathing', 'Fainting', 'Severe sudden pain', 'Heavy bleeding', 'None of these'],
      },
    ],
    watch: ['Dose/timing consistency', 'Side effects', 'Questions for clinician'],
    nextStep:
      'Prepare medication notes with timing and side effects before your next clinician conversation.',
    doctorSummaryTemplate: 'Medication notes are organized into a draft review summary.',
  },
};

export const FLOW_RUNNER_IDS = Object.keys(FLOW_RUNNERS) as FlowId[];

export const URGENT_FLOW_QUESTION_IDS = Object.values(FLOW_RUNNERS).flatMap((flow) =>
  (flow.questions ?? [])
    .filter((question) => question.id.includes('urgent') || question.id === 'safety')
    .map((question) => question.id),
);
