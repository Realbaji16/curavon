import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  GitBranch,
  Heart,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { fadeUp, staggerContainer, tapScale } from '../motion/variants';

type FlowId =
  | 'something-feels-off'
  | 'doctor-visit-prep'
  | 'mood-stress-checkin'
  | 'monthly-wellness-review'
  | 'headache'
  | 'stomach-pain'
  | 'medication-review';

type FilterId = 'all' | 'flows' | 'mind' | 'symptoms' | 'doctor-prep' | 'basics';
type ViewMode = 'browse' | 'flowDetail' | 'flowRunner' | 'flowResult' | 'guideDetail';
type QuestionType = 'single' | 'multi' | 'scale' | 'shortText' | 'yesno';

type FlowCard = {
  id: FlowId;
  title: string;
  description: string;
  estimatedTime: string;
  tag: string;
  categories: Array<'flows' | 'mind' | 'symptoms' | 'doctor-prep' | 'basics'>;
  helpsOrganize: string;
};

type GuideCard = {
  id: string;
  title: string;
  description: string;
  intro: string;
  bullets: string[];
  relatedFlowId: FlowId;
  categories: Array<'mind' | 'doctor-prep' | 'symptoms' | 'basics'>;
};

type FlowQuestion = {
  id: string;
  prompt: string;
  helper?: string;
  type: QuestionType;
  options?: string[];
  min?: number;
  max?: number;
};

type FlowDefinition = {
  id: FlowId;
  watch: string[];
  nextStep: string;
  doctorSummaryTemplate: string;
  questions?: FlowQuestion[];
};

const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'flows', label: 'Flows' },
  { id: 'mind', label: 'Mind' },
  { id: 'symptoms', label: 'Symptoms' },
  { id: 'doctor-prep', label: 'Doctor Prep' },
  { id: 'basics', label: 'Basics' },
];

const FLOW_CARDS: FlowCard[] = [
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

const MIND_GUIDES: GuideCard[] = [
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

const BASIC_GUIDES: GuideCard[] = [
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

const FLOW_RUNNERS: Record<FlowId, FlowDefinition> = {
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
    watch: ['Sleep consistency', 'Stress pattern', 'Symptom recurrence'],
    nextStep:
      'Pick one pattern from the month and choose one manageable action for the coming week.',
    doctorSummaryTemplate: 'Monthly trends are summarized for a future check-in.',
  },
  headache: {
    id: 'headache',
    watch: ['Timing and trigger pattern', 'Intensity shifts', 'Any urgent warning signs'],
    nextStep:
      'Track headache timing and possible triggers this week, and seek urgent care if severe or sudden symptoms appear.',
    doctorSummaryTemplate: 'Headache timeline and trigger notes are prepared for care discussion.',
  },
  'stomach-pain': {
    id: 'stomach-pain',
    watch: ['Meal timing relationship', 'Pain pattern', 'Worsening or urgent changes'],
    nextStep:
      'Track food timing and symptom pattern for a few days, and seek urgent care if pain becomes severe or sudden.',
    doctorSummaryTemplate: 'Stomach symptom pattern is summarized for clinician review.',
  },
  'medication-review': {
    id: 'medication-review',
    watch: ['Dose/timing consistency', 'Side effects', 'Questions for clinician'],
    nextStep:
      'Prepare medication notes with timing and side effects before your next clinician conversation.',
    doctorSummaryTemplate: 'Medication notes are organized into a draft review summary.',
  },
};

function includesSearch(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'number') return `${value}/10`;
  if (typeof value === 'string') return value;
  return '—';
}

function isAnswered(question: FlowQuestion, value: unknown): boolean {
  if (question.type === 'multi') return Array.isArray(value) && value.length > 0;
  if (question.type === 'shortText') return typeof value === 'string' && value.trim().length > 0;
  if (question.type === 'scale') return typeof value === 'number';
  if (question.type === 'single' || question.type === 'yesno') return typeof value === 'string' && value.length > 0;
  return false;
}

export function CareCircleScreen() {
  const { setActiveTab, showToast } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedFlowId, setSelectedFlowId] = useState<FlowId | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [runnerStep, setRunnerStep] = useState(0);
  const [runnerAnswers, setRunnerAnswers] = useState<Record<string, unknown>>({});
  const [resultSaved, setResultSaved] = useState(false);
  const [doctorDraftSaved, setDoctorDraftSaved] = useState(false);
  const [savedGuides, setSavedGuides] = useState<Record<string, boolean>>({});

  const selectedFlow = useMemo(
    () => FLOW_CARDS.find((flow) => flow.id === selectedFlowId) ?? null,
    [selectedFlowId],
  );
  const selectedGuide = useMemo(
    () => [...MIND_GUIDES, ...BASIC_GUIDES].find((guide) => guide.id === selectedGuideId) ?? null,
    [selectedGuideId],
  );
  const selectedFlowRunner = selectedFlowId ? FLOW_RUNNERS[selectedFlowId] : null;

  const flowMatchesFilter = (flow: FlowCard): boolean =>
    activeFilter === 'all' ||
    activeFilter === 'flows' ||
    flow.categories.includes(activeFilter as 'flows' | 'mind' | 'symptoms' | 'doctor-prep' | 'basics');

  const guideMatchesFilter = (guide: GuideCard): boolean =>
    activeFilter === 'all' ||
    (activeFilter === 'mind' && guide.categories.includes('mind')) ||
    (activeFilter === 'basics' && guide.categories.includes('basics')) ||
    (activeFilter === 'doctor-prep' && guide.categories.includes('doctor-prep')) ||
    (activeFilter === 'symptoms' && guide.categories.includes('symptoms'));

  const filteredFlows = FLOW_CARDS.filter(
    (flow) =>
      flowMatchesFilter(flow) &&
      (searchQuery.trim() === '' ||
        includesSearch(flow.title, searchQuery) ||
        includesSearch(flow.description, searchQuery) ||
        includesSearch(flow.tag, searchQuery)),
  );
  const filteredMindGuides = MIND_GUIDES.filter(
    (guide) =>
      guideMatchesFilter(guide) &&
      (searchQuery.trim() === '' ||
        includesSearch(guide.title, searchQuery) ||
        includesSearch(guide.description, searchQuery)),
  );
  const filteredBasicGuides = BASIC_GUIDES.filter(
    (guide) =>
      guideMatchesFilter(guide) &&
      (searchQuery.trim() === '' ||
        includesSearch(guide.title, searchQuery) ||
        includesSearch(guide.description, searchQuery)),
  );

  const openFlowDetail = (flowId: FlowId) => {
    setSelectedFlowId(flowId);
    setViewMode('flowDetail');
  };

  const openGuideDetail = (guideId: string) => {
    setSelectedGuideId(guideId);
    setViewMode('guideDetail');
  };

  const openRelatedFlow = (flowId: FlowId) => {
    setSelectedGuideId(null);
    setSelectedFlowId(flowId);
    setViewMode('flowDetail');
  };

  const startSelectedFlow = () => {
    if (!selectedFlowId) return;
    const runner = FLOW_RUNNERS[selectedFlowId];
    setResultSaved(false);
    setDoctorDraftSaved(false);
    if (runner.questions && runner.questions.length > 0) {
      setRunnerStep(0);
      setRunnerAnswers({});
      setViewMode('flowRunner');
      return;
    }
    showToast(`Opening ${selectedFlow?.title ?? 'flow'} in Flow tab`);
    setActiveTab('flow');
  };

  const backToBrowse = () => {
    setViewMode('browse');
    setSelectedGuideId(null);
    setSelectedFlowId(null);
  };

  const saveGuide = (guideId: string) => {
    setSavedGuides((prev) => ({ ...prev, [guideId]: true }));
    showToast('Saved for later');
  };

  const currentQuestion =
    selectedFlowRunner?.questions && selectedFlowRunner.questions.length > 0
      ? selectedFlowRunner.questions[runnerStep]
      : null;
  const currentAnswer = currentQuestion ? runnerAnswers[currentQuestion.id] : undefined;
  const canContinue = currentQuestion ? isAnswered(currentQuestion, currentAnswer) : false;

  const setAnswer = (question: FlowQuestion, value: unknown) => {
    setRunnerAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const toggleMultiOption = (question: FlowQuestion, option: string) => {
    const existing = Array.isArray(runnerAnswers[question.id]) ? (runnerAnswers[question.id] as string[]) : [];
    const hasNone = option === 'None of these' || option === "I'm not sure";
    let next: string[];
    if (existing.includes(option)) {
      next = existing.filter((entry) => entry !== option);
    } else if (hasNone) {
      next = [option];
    } else {
      next = [...existing.filter((entry) => entry !== 'None of these' && entry !== "I'm not sure"), option];
    }
    setAnswer(question, next);
  };

  const goRunnerBack = () => {
    if (!selectedFlowRunner?.questions) return;
    if (runnerStep === 0) {
      setViewMode('flowDetail');
      return;
    }
    setRunnerStep((step) => Math.max(step - 1, 0));
  };

  const goRunnerNext = () => {
    if (!selectedFlowRunner?.questions || !currentQuestion || !canContinue) return;
    const lastStep = selectedFlowRunner.questions.length - 1;
    if (runnerStep >= lastStep) {
      setViewMode('flowResult');
      return;
    }
    setRunnerStep((step) => Math.min(step + 1, lastStep));
  };

  const saveResult = () => {
    setResultSaved(true);
    showToast('Result saved');
  };

  const saveDoctorDraft = () => {
    setDoctorDraftSaved(true);
    showToast('Saved to your doctor summary draft.');
  };

  const showMoodSafetyMessage =
    selectedFlowId === 'mood-stress-checkin' &&
    viewMode === 'flowRunner' &&
    typeof runnerAnswers.safety === 'string' &&
    ['Yes', "I'm not sure"].includes(runnerAnswers.safety);

  return (
    <div className="screen learn-screen guides-screen">
      <ScreenHeader title="Guides" subtitle="Guided paths, gentle learning, and one clearer next step." />

      {viewMode === 'browse' ? (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <motion.section className="guides-hero-card warm-card glass-card-inner" variants={fadeUp}>
            <h2>Guides</h2>
            <p>
              Follow simple paths to organize what&apos;s happening, learn what matters, and choose
              one safer next step.
            </p>
            <div className="guides-trust-note">
              <Shield size={15} aria-hidden="true" />
              <span>Guided support — not a diagnosis.</span>
            </div>
          </motion.section>

          <motion.div className="guides-search-wrap" variants={fadeUp}>
            <Search size={16} className="guides-search-icon" />
            <input
              type="text"
              className="guides-search-input"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search guides and flows"
              aria-label="Search guides and flows"
            />
          </motion.div>

          <motion.div className="guides-filters" variants={fadeUp}>
            {FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`guides-filter-chip ${activeFilter === filter.id ? 'guides-filter-chip--active' : ''}`}
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </motion.div>

          {filteredFlows.length > 0 ? (
            <motion.section className="guides-section" variants={fadeUp}>
              <div className="section-header guides-section-header">
                <GitBranch size={18} className="icon-teal" />
                <h3>Start a guided flow</h3>
              </div>
              <p className="guides-section-subtitle">Choose a path when something needs structure.</p>

              <div className="guides-flow-grid">
                {filteredFlows.map((flow) => (
                  <motion.button
                    key={flow.id}
                    type="button"
                    className="guides-flow-card warm-card glass-card-inner"
                    variants={fadeUp}
                    {...tapScale}
                    onClick={() => openFlowDetail(flow.id)}
                  >
                    <div className="guides-flow-head">
                      <h4>{flow.title}</h4>
                      <span className="progress-pill progress-pill--teal">{flow.estimatedTime}</span>
                    </div>
                    <p>{flow.description}</p>
                    <div className="guides-flow-footer">
                      <span className="guides-trust-tag">{flow.tag}</span>
                      <span className="guides-flow-start">
                        Start
                        <ChevronRight size={16} aria-hidden="true" />
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          ) : null}

          {filteredMindGuides.length > 0 ? (
            <motion.section className="guides-section" variants={fadeUp}>
              <div className="section-header guides-section-header">
                <Heart size={18} className="icon-warm" />
                <h3>For your mind</h3>
              </div>
              <p className="guides-section-subtitle">
                Small guides for stress, worry, sleep, and explaining what you feel.
              </p>

              <div className="guides-mind-grid">
                {filteredMindGuides.map((guide) => (
                  <motion.article
                    key={guide.id}
                    className="guides-mind-card warm-card glass-card-inner"
                    variants={fadeUp}
                  >
                    <h4>{guide.title}</h4>
                    <p>{guide.description}</p>
                    <div className="guides-mind-actions">
                      <motion.button
                        type="button"
                        className="guides-guide-link"
                        {...tapScale}
                        onClick={() => openGuideDetail(guide.id)}
                      >
                        Read guide
                        <ChevronRight size={16} aria-hidden="true" />
                      </motion.button>
                      <button
                        type="button"
                        className="guides-inline-action"
                        onClick={() => openFlowDetail('mood-stress-checkin')}
                      >
                        Start Mood Check-In
                      </button>
                    </div>
                  </motion.article>
                ))}
              </div>
            </motion.section>
          ) : null}

          {filteredBasicGuides.length > 0 ? (
            <motion.section className="guides-section" variants={fadeUp}>
              <div className="section-header guides-section-header">
                <Stethoscope size={18} className="icon-muted" />
                <h3>Health basics</h3>
              </div>

              <div className="guides-basic-list">
                {filteredBasicGuides.map((guide) => (
                  <motion.button
                    key={guide.id}
                    type="button"
                    className="guides-basic-card glass-card"
                    variants={fadeUp}
                    {...tapScale}
                    onClick={() => openGuideDetail(guide.id)}
                  >
                    <div>
                      <p className="guides-basic-title">{guide.title}</p>
                      <p className="guides-basic-desc">{guide.description}</p>
                    </div>
                    <span className="guides-guide-link guides-guide-link--inline">
                      Read guide
                      <ChevronRight size={16} aria-hidden="true" />
                    </span>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          ) : null}

          {filteredFlows.length === 0 && filteredMindGuides.length === 0 && filteredBasicGuides.length === 0 ? (
            <motion.div className="guides-empty-state warm-card glass-card-inner" variants={fadeUp}>
              <p>No matches yet. Try a different search or filter.</p>
            </motion.div>
          ) : null}

          <motion.section className="guides-safety-banner warm-card glass-card-inner" variants={fadeUp}>
            <Sparkles size={16} className="icon-muted" aria-hidden="true" />
            <p>
              Curavon helps you organize concerns and choose next steps. It does not diagnose or
              replace a clinician.
            </p>
          </motion.section>
        </motion.div>
      ) : null}

      {viewMode === 'flowDetail' && selectedFlow && selectedFlowRunner ? (
        <motion.section
          className="guides-detail-panel warm-card glass-card-inner"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button type="button" className="guides-back-btn" onClick={backToBrowse}>
            <ChevronLeft size={16} />
            Back
          </button>
          <h3>{selectedFlow.title}</h3>
          <p className="guides-detail-time">{selectedFlow.estimatedTime}</p>
          <p className="guides-detail-description">{selectedFlow.description}</p>

          <div className="guides-detail-block">
            <h4>What this helps organize</h4>
            <p>{selectedFlow.helpsOrganize}</p>
          </div>

          <div className="guides-detail-block guides-detail-safety">
            <h4>Safety note</h4>
            <p>
              Curavon helps organize concerns and next steps. It does not diagnose or replace a
              clinician.
            </p>
          </div>

          <div className="guides-detail-actions">
            <button type="button" className="btn btn-secondary btn-glass" onClick={backToBrowse}>
              Back
            </button>
            <button type="button" className="btn btn-primary btn-pill" onClick={startSelectedFlow}>
              Start Flow
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.section>
      ) : null}

      {viewMode === 'flowRunner' && selectedFlow && selectedFlowRunner?.questions && currentQuestion ? (
        <motion.section
          className="guides-runner-panel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="guides-runner-head">
            <button type="button" className="guides-back-btn" onClick={goRunnerBack}>
              <ChevronLeft size={16} />
              Back
            </button>
            <span className="guides-runner-step">
              Step {runnerStep + 1} of {selectedFlowRunner.questions.length}
            </span>
          </div>

          <div className="guides-runner-progress">
            <div
              className="guides-runner-progress-fill"
              style={{ width: `${((runnerStep + 1) / selectedFlowRunner.questions.length) * 100}%` }}
            />
          </div>

          <article className="guides-runner-card warm-card glass-card-inner">
            <h3>{currentQuestion.prompt}</h3>
            {currentQuestion.helper ? <p className="guides-runner-helper">{currentQuestion.helper}</p> : null}

            {currentQuestion.type === 'single' || currentQuestion.type === 'yesno' ? (
              <div className="guides-runner-options">
                {currentQuestion.options?.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`guides-answer-chip ${currentAnswer === option ? 'guides-answer-chip--active' : ''}`}
                    onClick={() => setAnswer(currentQuestion, option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : null}

            {currentQuestion.type === 'multi' ? (
              <div className="guides-runner-options">
                {currentQuestion.options?.map((option) => {
                  const values = Array.isArray(currentAnswer) ? (currentAnswer as string[]) : [];
                  const active = values.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      className={`guides-answer-chip ${active ? 'guides-answer-chip--active' : ''}`}
                      onClick={() => toggleMultiOption(currentQuestion, option)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {currentQuestion.type === 'scale' ? (
              <div className="guides-scale-grid">
                {Array.from(
                  { length: (currentQuestion.max ?? 10) - (currentQuestion.min ?? 1) + 1 },
                  (_, index) => (currentQuestion.min ?? 1) + index,
                ).map((score) => (
                  <button
                    key={score}
                    type="button"
                    className={`guides-scale-chip ${currentAnswer === score ? 'guides-scale-chip--active' : ''}`}
                    onClick={() => setAnswer(currentQuestion, score)}
                  >
                    {score}
                  </button>
                ))}
              </div>
            ) : null}

            {currentQuestion.type === 'shortText' ? (
              <textarea
                className="guides-short-text"
                placeholder="Type your note"
                value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                onChange={(event) => setAnswer(currentQuestion, event.target.value)}
                rows={4}
              />
            ) : null}
          </article>

          {showMoodSafetyMessage ? (
            <div className="guides-safety-alert warm-card glass-card-inner">
              <Shield size={16} />
              <p>
                You deserve immediate support. If you may be in danger or might harm yourself, contact
                local emergency services or a trusted person now.
              </p>
            </div>
          ) : null}

          <div className="guides-runner-actions">
            <button type="button" className="btn btn-secondary btn-glass" onClick={goRunnerBack}>
              Back
            </button>
            <button
              type="button"
              className="btn btn-primary btn-pill"
              onClick={goRunnerNext}
              disabled={!canContinue}
            >
              Continue
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.section>
      ) : null}

      {viewMode === 'flowResult' && selectedFlow && selectedFlowRunner ? (
        <motion.section
          className="guides-result-panel warm-card glass-card-inner"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3>{selectedFlow.title} — Result</h3>
          <p className="guides-result-sub">Here is a safe summary based on what you shared.</p>

          <div className="guides-result-block">
            <h4>What you shared</h4>
            <ul>
              {selectedFlowRunner.questions?.map((question) => (
                <li key={question.id}>
                  <strong>{question.prompt}</strong>: {formatAnswer(runnerAnswers[question.id])}
                </li>
              ))}
            </ul>
          </div>

          <div className="guides-result-block">
            <h4>What to watch</h4>
            <ul>
              {selectedFlowRunner.watch.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </div>

          <div className="guides-result-block">
            <h4>Your next safe step</h4>
            <p>{selectedFlowRunner.nextStep}</p>
          </div>

          <div className="guides-result-block">
            <h4>Doctor summary</h4>
            <p>
              {selectedFlowRunner.doctorSummaryTemplate} This may be worth tracking and useful to
              mention to a clinician.
            </p>
          </div>

          <div className="guides-result-actions">
            <button type="button" className="btn btn-secondary btn-glass" onClick={saveResult}>
              Save result
            </button>
            <button type="button" className="btn btn-primary btn-pill" onClick={saveDoctorDraft}>
              Save to Doctor Summary
              <FileText size={16} />
            </button>
          </div>

          {resultSaved ? <p className="guides-result-note">Result saved.</p> : null}
          {doctorDraftSaved ? <p className="guides-result-note">Saved to your doctor summary draft.</p> : null}

          <button type="button" className="guides-back-link" onClick={backToBrowse}>
            Back to Guides
          </button>
        </motion.section>
      ) : null}

      {viewMode === 'guideDetail' && selectedGuide ? (
        <motion.section
          className="guides-detail-panel warm-card glass-card-inner"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button type="button" className="guides-back-btn" onClick={backToBrowse}>
            <ChevronLeft size={16} />
            Back
          </button>
          <h3>{selectedGuide.title}</h3>
          <p className="guides-detail-description">{selectedGuide.intro}</p>

          <ul className="guides-detail-points">
            {selectedGuide.bullets.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          <div className="guides-detail-actions">
            <button
              type="button"
              className="btn btn-secondary btn-glass"
              onClick={() => saveGuide(selectedGuide.id)}
            >
              {savedGuides[selectedGuide.id] ? 'Saved' : 'Save for later'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-pill"
              onClick={() => openRelatedFlow(selectedGuide.relatedFlowId)}
            >
              Related flow
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.section>
      ) : null}
    </div>
  );
}
