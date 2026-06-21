import type { FlowId } from './flowCatalog';

export type GuideCard = {
  id: string;
  title: string;
  description: string;
  intro: string;
  bullets: string[];
  relatedFlowId: FlowId;
  categories: Array<'mind' | 'doctor-prep' | 'symptoms' | 'basics'>;
};

export const MIND_GUIDES: GuideCard[] = [
  {
    id: 'understanding-stress-signals',
    title: 'Understanding Stress Signals',
    description: 'Learn what to notice when stress builds and what may help.',
    intro:
      'Stress can show up in your body before it is clear in your thoughts. Noticing early signals helps you choose a gentler next step.',
    bullets: [
      'Notice body signals like tension, shallow breathing, or restlessness.',
      'Name one trigger and one thing that lowers pressure even a little.',
      'Choose one small reset and track how you feel after it.',
    ],
    relatedFlowId: 'mood-stress-checkin',
    categories: ['mind'],
  },
  {
    id: 'when-worry-feels-too-loud',
    title: 'When Worry Feels Too Loud',
    description: 'Use grounding and clear language when worry spikes.',
    intro:
      'Worry can feel bigger when your body is tired, stressed, or uncertain. Curavon can help you slow it down and choose one next step.',
    bullets: [
      'Name what you are worried about in one sentence.',
      'Notice breathing, tension, heart rate, or restlessness.',
      'Choose one small action: water, slow breaths, message someone, or start a Mood & Stress Check-In.',
    ],
    relatedFlowId: 'mood-stress-checkin',
    categories: ['mind'],
  },
  {
    id: 'sleep-and-mood',
    title: 'Sleep And Mood',
    description: 'Understand how sleep patterns may affect mood and energy.',
    intro:
      'Sleep and mood often move together. Tracking both helps you explain patterns clearly and decide what may help.',
    bullets: [
      'Track bedtime, wake time, and one mood word each morning.',
      'Notice evening habits that help your body settle.',
      'Bring the pattern to your next care conversation.',
    ],
    relatedFlowId: 'monthly-wellness-review',
    categories: ['mind', 'basics'],
  },
  {
    id: 'how-to-explain-feelings',
    title: "How To Explain What You're Feeling",
    description: 'Practice a simple structure to explain feelings clearly.',
    intro:
      'When words are hard, a short structure can make conversations easier and more accurate.',
    bullets: [
      'Start with what you feel and when it shows up.',
      'Add one specific recent example and how it affected your day.',
      'Share what you have already tried and what may help next.',
    ],
    relatedFlowId: 'doctor-visit-prep',
    categories: ['mind', 'doctor-prep'],
  },
  {
    id: 'tiny-grounding-steps',
    title: 'Tiny Grounding Steps',
    description: 'Use quick calming steps when your day feels intense.',
    intro:
      'Grounding does not need to be long to be useful. Small actions can lower overwhelm enough to take one next step.',
    bullets: [
      'Use one minute of slower breathing with longer exhales.',
      'Name five things you see, then one thing you can do next.',
      'Pick one gentle action and follow through immediately.',
    ],
    relatedFlowId: 'mood-stress-checkin',
    categories: ['mind'],
  },
  {
    id: 'prepare-therapy-or-doctor-visit',
    title: 'Preparing For A Therapy Or Doctor Visit',
    description: 'Get ready to share concerns with confidence and clarity.',
    intro:
      'Preparation helps visits feel calmer and more useful. A short note can improve what gets discussed.',
    bullets: [
      'List your top concerns and how long each has been present.',
      'Write what you tried and what changed afterward.',
      'Bring questions so you leave with one clear next step.',
    ],
    relatedFlowId: 'doctor-visit-prep',
    categories: ['mind', 'doctor-prep'],
  },
];
export const BASIC_GUIDES: GuideCard[] = [
  {
    id: 'track-symptoms-clearly',
    title: 'How To Track Symptoms Clearly',
    description: 'Keep concise notes that are easier to review and share.',
    intro:
      'Clear notes make it easier to spot patterns and explain concerns during care conversations.',
    bullets: [
      'Record what happened, when it started, and how strong it felt.',
      'Add context like sleep, meals, stress, and activity.',
      'Keep entries short so trends are easier to see.',
    ],
    relatedFlowId: 'something-feels-off',
    categories: ['basics', 'symptoms'],
  },
  {
    id: 'what-to-tell-a-doctor',
    title: 'What To Tell A Doctor',
    description: 'Share essential details quickly in appointments.',
    intro:
      'A short structure helps you use appointment time well and keeps key details from getting missed.',
    bullets: [
      'Lead with your main concern and when it began.',
      'Mention what makes it better or worse and what you tried.',
      'Close with your top question for today.',
    ],
    relatedFlowId: 'doctor-visit-prep',
    categories: ['basics', 'doctor-prep'],
  },
  {
    id: 'when-to-seek-urgent-care',
    title: 'When To Seek Urgent Care',
    description: 'Know warning signs and when to reach out quickly.',
    intro:
      'Some symptoms should not wait. A simple urgency check helps you act quickly when needed.',
    bullets: [
      'Take severe, sudden, or rapidly worsening symptoms seriously.',
      'If breathing, chest pain, or confusion appears, seek urgent help now.',
      'When uncertain, contact local urgent services for guidance.',
    ],
    relatedFlowId: 'something-feels-off',
    categories: ['basics', 'symptoms'],
  },
  {
    id: 'how-to-notice-patterns',
    title: 'How To Notice Patterns',
    description: 'Turn daily notes into useful weekly trends.',
    intro:
      'Patterns can reveal what may help and what to discuss with a clinician.',
    bullets: [
      'Review the week for repeated timing and triggers.',
      'Highlight one trend worth tracking this week.',
      'Choose one safer next step based on that trend.',
    ],
    relatedFlowId: 'monthly-wellness-review',
    categories: ['basics'],
  },
  {
    id: 'medication-notes-to-keep',
    title: 'Medication Notes To Keep',
    description: 'Track medication details that support safer care.',
    intro:
      'Simple medication notes can make reviews more accurate and reduce confusion over time.',
    bullets: [
      'Write medication name, dose, and timing.',
      'Track side effects and any missed doses without judgment.',
      'Bring your notes to your clinician or pharmacist.',
    ],
    relatedFlowId: 'medication-review',
    categories: ['basics', 'doctor-prep'],
  },
];

export const ALL_GUIDES = [...MIND_GUIDES, ...BASIC_GUIDES];
export const MIND_GUIDE_IDS = MIND_GUIDES.map((guide) => guide.id);
export const BASIC_GUIDE_IDS = BASIC_GUIDES.map((guide) => guide.id);
