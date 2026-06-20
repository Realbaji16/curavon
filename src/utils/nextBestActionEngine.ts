// Legacy next-action path. Do not use for new generation. Route through Plan Engine v2 via nextActionAdapter.
import type { AdjustOption, DailyCheckIn, HealthBlockedReason, NextActionState } from '../types/health';
import type {
  ActionSourceChip,
  NextBestActionPlan,
  NextBestActionRecommendation,
  PersonalizationMemorySnapshot,
  PersonalizationSignal,
  SupportingInsightCard,
} from '../types/nextBestAction';
import { todayDateKey } from './healthUtils';
import { ADJUSTED_ACTIONS } from './nextActionRules';

const MOOD_SUPPORT_VALUES = new Set(['Worried', 'Low', 'Irritable', 'Numb', 'Not sure']);
const STOMACH_KEYWORDS = /\bstomach|nausea|cramp|diarrhea|abdominal|abdomen|belly|gut\b/i;
const HEADACHE_KEYWORDS = /\bheadache|head ache\b/i;
const MEDICATION_KEYWORDS = /\bmedication|medicine|dose|tablet|capsule|side effect|pharmacist\b/i;
const MENTAL_HEALTH_KEYWORDS =
  /\bstress|worry|worried|overwhelmed|anxious|panic|low mood|mood|sleep\b/i;

const SIGNAL_PRIORITY: PersonalizationSignal[] = [
  'recent_red_flag',
  'action_blocked',
  'no_checkin_today',
  'high_stress',
  'mental_health_support',
  'medication_question',
  'doctor_prep_needed',
  'headache_pattern',
  'stomach_pattern',
  'symptom_tracking',
  'low_sleep',
  'low_energy',
  'profile_incomplete',
];

const BLOCKED_LABELS: Record<HealthBlockedReason, string> = {
  tired: 'Too tired',
  time: 'Not enough time',
  unsure: 'Unsure what to do',
  symptoms: 'Symptoms changed',
  other: 'Other',
};

const ADJUST_LABELS: Record<AdjustOption, string> = {
  'two-minutes': 'Make it 2 minutes',
  'later-today': 'Save it for later today',
  note: 'Turn it into a note',
  'different-step': 'Pick a different gentle step',
};

type RecommendationInput = {
  signals: PersonalizationSignal[];
  memory: PersonalizationMemorySnapshot;
};

function latestCheckIn(memory: PersonalizationMemorySnapshot): DailyCheckIn | null {
  if (!memory.dailyCheckins.length) return null;
  return [...memory.dailyCheckins].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function inLastDays(iso: string, days: number): boolean {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return false;
  const diff = Date.now() - then;
  return diff <= days * 24 * 60 * 60 * 1000;
}

function collectSearchText(memory: PersonalizationMemorySnapshot): string {
  const checkinText = memory.dailyCheckins
    .slice(0, 5)
    .map((c) => `${c.symptoms} ${c.notes}`)
    .join(' ');
  const askText = memory.askHistory
    .slice(0, 5)
    .map((a) => `${a.concern} ${a.nextStep} ${a.concernType}`)
    .join(' ');
  const guideText = memory.doctorSummaryItems
    .slice(0, 20)
    .map((i) => `${i.title} ${i.content} ${i.tags.join(' ')}`)
    .join(' ');
  return `${checkinText} ${askText} ${guideText}`.toLowerCase();
}

function toSourceChips(
  signals: PersonalizationSignal[],
  memory: PersonalizationMemorySnapshot,
): ActionSourceChip[] {
  const chips = new Set<ActionSourceChip>();
  const hasCheckInSignal = signals.some((s) =>
    ['no_checkin_today', 'low_sleep', 'low_energy', 'high_stress', 'mood_support', 'symptom_tracking'].includes(
      s,
    ),
  );
  if (hasCheckInSignal) chips.add("Today's Check-In");
  if (memory.askHistory.length) chips.add('Ask Curavon');
  if (memory.doctorSummaryItems.some((i) => i.source === 'Guides' || i.type === 'guided_flow')) {
    chips.add('Guides');
  }
  if (
    memory.healthProfile.conditions.length ||
    memory.healthProfile.medications.length ||
    memory.healthProfile.allergies.length ||
    memory.healthProfile.healthNotes.length ||
    memory.healthProfile.doctorQuestions.length
  ) {
    chips.add('Profile');
  }
  if (memory.redFlagLogs.length || memory.doctorSummaryItems.length) chips.add('Doctor Summary');
  if (memory.nextActionState) chips.add('Next Action');
  return Array.from(chips).slice(0, 4);
}

export function derivePersonalizationSignals(
  memory: PersonalizationMemorySnapshot,
): PersonalizationSignal[] {
  const signals = new Set<PersonalizationSignal>();
  const latest = latestCheckIn(memory);
  const today = todayDateKey();
  const hasCheckInToday = memory.dailyCheckins.some((c) => c.date === today);
  const searchText = collectSearchText(memory);

  if (!hasCheckInToday) signals.add('no_checkin_today');

  if (latest) {
    if (latest.sleepQuality === 'Poor' || latest.sleepQuality === 'Very poor') signals.add('low_sleep');
    if (latest.energyLevel === 'Low' || latest.energyLevel === 'Drained') signals.add('low_energy');
    if (latest.stressLevel === 'Stressed' || latest.stressLevel === 'Overwhelmed') {
      signals.add('high_stress');
    }
    if (MOOD_SUPPORT_VALUES.has(latest.mood)) signals.add('mood_support');
    if (latest.symptoms.trim()) signals.add('symptom_tracking');
  }

  if (HEADACHE_KEYWORDS.test(searchText)) signals.add('headache_pattern');
  if (STOMACH_KEYWORDS.test(searchText)) signals.add('stomach_pattern');

  if (memory.healthProfile.medications.length || MEDICATION_KEYWORDS.test(searchText)) {
    signals.add('medication_question');
  }

  const doctorPrepFromGuides = memory.doctorSummaryItems.some(
    (i) =>
      i.type === 'guided_flow' &&
      /doctor visit prep|doctor-ready|clinician question|appointment/i.test(`${i.title} ${i.content}`),
  );
  if (doctorPrepFromGuides || memory.healthProfile.doctorQuestions.length > 0) {
    signals.add('doctor_prep_needed');
  }

  if (memory.nextActionState?.status === 'blocked') signals.add('action_blocked');
  if (memory.redFlagLogs.some((log) => inLastDays(log.createdAt, 7))) signals.add('recent_red_flag');

  const profileFields = [
    memory.healthProfile.conditions,
    memory.healthProfile.medications,
    memory.healthProfile.allergies,
    memory.healthProfile.healthNotes,
  ];
  const sparseCount = profileFields.filter((arr) => arr.length === 0).length;
  if (sparseCount >= 3) signals.add('profile_incomplete');

  if (MENTAL_HEALTH_KEYWORDS.test(searchText)) signals.add('mental_health_support');

  return SIGNAL_PRIORITY.filter((signal) => signals.has(signal));
}

function buildRecommendation({ signals, memory }: RecommendationInput): NextBestActionRecommendation {
  const sourceChips = toSourceChips(signals, memory);
  const has = (signal: PersonalizationSignal) => signals.includes(signal);
  const urgentRecent = memory.redFlagLogs.some((log) => inLastDays(log.createdAt, 1));

  if (has('recent_red_flag')) {
    return {
      id: 'review-urgent-support-notes',
      title: 'Review urgent-support notes',
      actionText:
        'Open your doctor-ready summary and make sure the urgent concern is clearly written.',
      reason:
        'You recently saw a safety message. Keeping notes organized can help if you speak with a clinician.',
      sourceSignals: signals.filter((s) => s === 'recent_red_flag'),
      sourceChips,
      effort: 'low',
      category: 'doctor_prep',
      relatedGuide: 'When To Seek Urgent Care',
      relatedGuideFlowId: 'doctor-visit-prep',
      relatedDoctorSummaryPrompt: 'Confirm urgent concerns are clearly written for a clinician.',
      safetyLevel: urgentRecent ? 'urgent' : 'caution',
    };
  }

  if (has('action_blocked')) {
    return {
      id: 'make-step-smaller',
      title: 'Make the step smaller',
      actionText:
        'Choose a 2-minute version of the last action or save what got in the way.',
      reason:
        'You marked the last action as blocked, so Curavon is helping reduce friction.',
      sourceSignals: signals.filter((s) => s === 'action_blocked'),
      sourceChips,
      effort: 'very_low',
      category: 'general',
      relatedGuide: 'Tiny Grounding Steps',
      relatedGuideFlowId: 'mood-stress-checkin',
      relatedDoctorSummaryPrompt: 'Capture what blocked this action so your summary stays useful.',
      safetyLevel: 'normal',
    };
  }

  if (has('no_checkin_today')) {
    return {
      id: 'start-checkin',
      title: "Start today's check-in",
      actionText:
        'Answer a few quick questions so Curavon can suggest one clearer next step.',
      reason: 'No check-in has been saved today.',
      sourceSignals: ['no_checkin_today'],
      sourceChips: sourceChips.length ? sourceChips : ["Today's Check-In"],
      effort: 'very_low',
      category: 'checkin',
      relatedGuide: 'How To Track Symptoms Clearly',
      relatedGuideFlowId: 'something-feels-off',
      relatedDoctorSummaryPrompt: "Add today's check-in before sharing notes.",
      safetyLevel: 'normal',
    };
  }

  if (has('high_stress') || has('mental_health_support')) {
    return {
      id: 'lower-noise-first',
      title: 'Lower the noise first',
      actionText:
        'Take two slow breaths, then write one sentence about what feels loudest right now.',
      reason:
        'Your recent notes suggest stress, worry, or low mood may be adding pressure.',
      sourceSignals: signals.filter((s) => s === 'high_stress' || s === 'mental_health_support' || s === 'mood_support'),
      sourceChips,
      effort: 'very_low',
      category: 'stress',
      relatedGuide: 'When Worry Feels Too Loud',
      relatedGuideFlowId: 'mood-stress-checkin',
      relatedDoctorSummaryPrompt: 'Write one sentence describing your most intense stress moment.',
      safetyLevel: 'normal',
    };
  }

  if (has('medication_question')) {
    return {
      id: 'prepare-medication-note',
      title: 'Prepare a medication note',
      actionText:
        'Write the medication name, what you noticed, and one question for a clinician or pharmacist.',
      reason:
        'Medication-related notes are easier to discuss when they are specific.',
      sourceSignals: signals.filter((s) => s === 'medication_question'),
      sourceChips,
      effort: 'low',
      category: 'medication',
      relatedGuide: 'Medication Review',
      relatedGuideFlowId: 'medication-review',
      relatedDoctorSummaryPrompt: 'Add medication name, timing, and one question.',
      safetyLevel: 'normal',
    };
  }

  if (has('doctor_prep_needed')) {
    return {
      id: 'prepare-one-clinician-question',
      title: 'Prepare one clinician question',
      actionText:
        'Write the one question you most want answered at your next appointment.',
      reason:
        'Your profile or recent guide activity suggests doctor prep may help.',
      sourceSignals: signals.filter((s) => s === 'doctor_prep_needed'),
      sourceChips,
      effort: 'low',
      category: 'doctor_prep',
      relatedGuide: 'Doctor Visit Prep',
      relatedGuideFlowId: 'doctor-visit-prep',
      relatedDoctorSummaryPrompt: 'Add your top clinician question to the summary.',
      safetyLevel: 'normal',
    };
  }

  if (has('headache_pattern')) {
    return {
      id: 'track-headache-details',
      title: 'Track headache details',
      actionText:
        'Note when the headache started, intensity, possible triggers, and anything unusual.',
      reason:
        'Headache notes can help you decide what to watch and what to tell a clinician.',
      sourceSignals: signals.filter((s) => s === 'headache_pattern' || s === 'symptom_tracking'),
      sourceChips,
      effort: 'low',
      category: 'symptom_tracking',
      relatedGuide: 'Headache',
      relatedGuideFlowId: 'headache',
      relatedDoctorSummaryPrompt: 'Add timing, trigger, and intensity for headache notes.',
      safetyLevel: 'normal',
    };
  }

  if (has('stomach_pattern')) {
    return {
      id: 'track-stomach-details',
      title: 'Track stomach details',
      actionText:
        'Note timing, recent food, pain level, and whether symptoms are improving or worsening.',
      reason:
        'Stomach-related notes are clearer when timing and patterns are written down.',
      sourceSignals: signals.filter((s) => s === 'stomach_pattern' || s === 'symptom_tracking'),
      sourceChips,
      effort: 'low',
      category: 'symptom_tracking',
      relatedGuide: 'Stomach Pain',
      relatedGuideFlowId: 'stomach-pain',
      relatedDoctorSummaryPrompt: 'Add food timing and symptom pattern for stomach notes.',
      safetyLevel: 'normal',
    };
  }

  if (has('symptom_tracking')) {
    return {
      id: 'track-the-pattern',
      title: 'Track the pattern',
      actionText:
        'Write when it started, intensity, what changed, and what makes it better or worse.',
      reason:
        'Recent symptoms are easier to act on when timing and changes are clear.',
      sourceSignals: signals.filter((s) => s === 'symptom_tracking'),
      sourceChips,
      effort: 'low',
      category: 'symptom_tracking',
      relatedGuide: 'Something Feels Off',
      relatedGuideFlowId: 'something-feels-off',
      relatedDoctorSummaryPrompt: 'Capture onset, intensity, and triggers for symptoms.',
      safetyLevel: 'normal',
    };
  }

  if (has('low_sleep') || has('low_energy')) {
    return {
      id: 'protect-energy',
      title: 'Protect your energy today',
      actionText:
        'Choose one lighter task and one recovery action instead of adding more pressure.',
      reason: 'Your latest check-in suggests sleep or energy may be lower today.',
      sourceSignals: signals.filter((s) => s === 'low_sleep' || s === 'low_energy'),
      sourceChips,
      effort: 'very_low',
      category: 'sleep_energy',
      relatedGuide: 'Sleep And Mood',
      relatedGuideFlowId: 'mood-stress-checkin',
      relatedDoctorSummaryPrompt: 'Note one recovery action and how your energy changed.',
      safetyLevel: 'normal',
    };
  }

  if (has('profile_incomplete')) {
    return {
      id: 'add-one-profile-detail',
      title: 'Add one health profile detail',
      actionText:
        'Add one condition, medication, allergy, or note Curavon should remember.',
      reason:
        'A few profile details help Curavon organize safer, clearer next steps.',
      sourceSignals: ['profile_incomplete'],
      sourceChips: sourceChips.length ? sourceChips : ['Profile'],
      effort: 'very_low',
      category: 'profile',
      relatedGuide: 'How To Track Symptoms Clearly',
      relatedGuideFlowId: 'something-feels-off',
      relatedDoctorSummaryPrompt: 'Add one profile detail that matters for care conversations.',
      safetyLevel: 'normal',
    };
  }

  return {
    id: 'default-small-step',
    title: 'Choose one small step',
    actionText:
      'Pick one health-supportive action you can complete in the next 10 minutes.',
    reason: 'Small steps help Curavon keep support clear and manageable.',
    sourceSignals: [],
    sourceChips: sourceChips.length ? sourceChips : ['Profile'],
    effort: 'very_low',
    category: 'general',
    relatedGuide: 'Tiny Grounding Steps',
    relatedGuideFlowId: 'mood-stress-checkin',
    relatedDoctorSummaryPrompt: 'Save one small action you completed today.',
    safetyLevel: 'normal',
  };
}

function humanSignal(signal: PersonalizationSignal): string {
  switch (signal) {
    case 'low_sleep':
      return 'Sleep looked lower in your latest check-in.';
    case 'low_energy':
      return 'Energy looked lower in your latest check-in.';
    case 'high_stress':
      return 'Stress appeared in your latest check-in.';
    case 'mood_support':
      return 'Mood notes suggest extra support could help.';
    case 'symptom_tracking':
      return "You've tracked symptoms recently.";
    case 'headache_pattern':
      return "You've mentioned headache symptoms recently.";
    case 'stomach_pattern':
      return "You've mentioned stomach-related symptoms recently.";
    case 'medication_question':
      return 'Medication-related details appear in your notes.';
    case 'doctor_prep_needed':
      return 'You have doctor-prep notes or questions saved.';
    case 'action_blocked':
      return 'Your previous action was marked blocked.';
    case 'recent_red_flag':
      return 'A recent safety note was logged.';
    case 'no_checkin_today':
      return 'No check-in has been saved yet today.';
    case 'profile_incomplete':
      return 'Your health profile still has room for key details.';
    case 'mental_health_support':
      return "You've mentioned stress, worry, or mood pressure recently.";
    default:
      return 'Curavon identified a recent support signal.';
  }
}

function buildPatternLines(memory: PersonalizationMemorySnapshot): string[] {
  const recent = [...memory.dailyCheckins]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  if (!recent.length) return ['No check-in yet today.'];

  const stressCount = recent.filter(
    (c) => c.stressLevel === 'Stressed' || c.stressLevel === 'Overwhelmed',
  ).length;
  const symptomCount = recent.filter((c) => c.symptoms.trim().length > 0).length;
  const sleepPoorCount = recent.filter(
    (c) => c.sleepQuality === 'Poor' || c.sleepQuality === 'Very poor',
  ).length;

  const lines: string[] = [];
  if (stressCount >= 2) lines.push('Stress has appeared in your recent notes.');
  if (symptomCount >= 2) lines.push("You've tracked symptoms more than once recently.");
  if (sleepPoorCount >= 2) lines.push('Sleep looked lower across recent check-ins.');
  if (!lines.length) lines.push('Recent check-ins look mixed without one dominant pattern.');
  return lines.slice(0, 2);
}

function buildSupportingInsights(
  memory: PersonalizationMemorySnapshot,
  signals: PersonalizationSignal[],
): SupportingInsightCard[] {
  const cards: SupportingInsightCard[] = [];

  const noticedLines = signals.slice(0, 2).map(humanSignal);
  if (noticedLines.length) {
    cards.push({
      id: 'curavon-noticed',
      title: 'Curavon noticed',
      lines: noticedLines,
    });
  }

  cards.push({
    id: 'recent-pattern',
    title: 'Recent pattern',
    lines: buildPatternLines(memory),
    actionLabel: memory.dailyCheckins.length ? undefined : "Start today's check-in",
    actionTarget: memory.dailyCheckins.length ? undefined : 'checkin',
  });

  cards.push({
    id: 'doctor-ready-summary',
    title: 'Doctor-ready summary',
    lines: [
      `${memory.doctorSummaryItems.filter((i) => i.includedInSummary).length} items currently included.`,
    ],
    actionLabel: 'Open summary',
    actionTarget: 'summary',
  });

  if (signals.includes('profile_incomplete')) {
    cards[1] = {
      id: 'profile-incomplete',
      title: 'Help Curavon remember what matters',
      lines: ['Add one condition, medication, allergy, or health note to improve personalization.'],
      actionLabel: 'Update Health Profile',
      actionTarget: 'profile',
    };
  }

  return cards.slice(0, 3);
}

export function buildNextBestActionPlan(
  memory: PersonalizationMemorySnapshot,
): NextBestActionPlan {
  const signals = derivePersonalizationSignals(memory);
  const recommendation = buildRecommendation({ signals, memory });
  return {
    recommendation,
    signals,
    supportingInsights: buildSupportingInsights(memory, signals),
    patternLines: buildPatternLines(memory),
  };
}

export function toNextActionState(
  recommendation: NextBestActionRecommendation,
  source = "Today's Check-In",
): NextActionState {
  return {
    currentAction: recommendation.actionText,
    title: recommendation.title,
    reason: recommendation.reason,
    source,
    sourceSignals: recommendation.sourceSignals,
    sourceChips: recommendation.sourceChips,
    effort: recommendation.effort,
    category: recommendation.category,
    relatedGuide: recommendation.relatedGuide,
    relatedGuideFlowId: recommendation.relatedGuideFlowId,
    relatedDoctorSummaryPrompt: recommendation.relatedDoctorSummaryPrompt,
    safetyLevel: recommendation.safetyLevel,
    actionId: recommendation.id,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  };
}

export function blockedReasonLabel(reason?: HealthBlockedReason): string | undefined {
  if (!reason) return undefined;
  return BLOCKED_LABELS[reason];
}

export function adjustedOptionLabel(option?: AdjustOption): string | undefined {
  if (!option) return undefined;
  return ADJUST_LABELS[option] ?? ADJUSTED_ACTIONS[option];
}
