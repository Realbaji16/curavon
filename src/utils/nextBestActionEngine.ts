// Legacy next-action path. Do not use for new generation — route through nextActionAdapter (Plan Engine v3).
import type { AdjustOption, DailyCheckIn, HealthBlockedReason, NextActionState } from '../types/health';
import type { HealthSnapshot } from '../types/healthSnapshot';
import { AGE_RANGE_OPTIONS, LANGUAGE_STYLE_OPTIONS } from '../constants/lightProfileOptions';
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
  const guideText = memory.guideResults
    .slice(0, 5)
    .map((g) => `${g.guideTitle} ${g.resultSummary} ${g.safeNextStep}`)
    .join(' ');
  const profileText = [
    ...memory.healthProfile.conditions,
    ...memory.healthProfile.medications,
    ...memory.healthProfile.allergies,
    ...memory.healthProfile.healthNotes,
    ...memory.healthProfile.doctorQuestions,
    ...memory.healthProfile.primaryGoals,
  ].join(' ');
  return `${checkinText} ${askText} ${guideText} ${profileText}`.toLowerCase();
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

function truncateText(text: string, max: number): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function formatCheckInDateLabel(dateKey: string): string {
  const today = todayDateKey();
  if (dateKey === today) return 'today';
  const parsed = new Date(`${dateKey}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateKey;
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatCheckInInsightLines(checkIn: DailyCheckIn): string[] {
  const lines = [
    `Sleep: ${checkIn.sleepQuality} · Energy: ${checkIn.energyLevel}`,
    `Stress: ${checkIn.stressLevel} · Mood: ${checkIn.mood}`,
  ];
  if (checkIn.symptoms.trim()) {
    lines.push(`Symptoms: ${truncateText(checkIn.symptoms, 88)}`);
  }
  if (checkIn.notes.trim()) {
    lines.push(`Note: ${truncateText(checkIn.notes, 88)}`);
  }
  if (checkIn.painLevel > 0) {
    lines.push(`Pain level: ${checkIn.painLevel}/10`);
  }
  return lines.slice(0, 3);
}

function buildCheckInContextCard(memory: PersonalizationMemorySnapshot): SupportingInsightCard | null {
  const today = todayDateKey();
  const todayCheckIn = memory.dailyCheckins.find((entry) => entry.date === today);
  const latest = latestCheckIn(memory);

  if (todayCheckIn) {
    return {
      id: 'today-checkin',
      title: 'Check-in context',
      subtitle: 'What you logged today — used to shape your next step',
      lines: formatCheckInInsightLines(todayCheckIn),
    };
  }

  if (latest) {
    return {
      id: 'recent-checkin',
      title: 'Recent check-in context',
      subtitle: `Last entry ${formatCheckInDateLabel(latest.date)} — informs your next step`,
      lines: formatCheckInInsightLines(latest),
    };
  }

  return null;
}

function buildProfileInsightCard(
  memory: PersonalizationMemorySnapshot,
  signals: PersonalizationSignal[],
): SupportingInsightCard | null {
  const { healthProfile } = memory;
  const lines: string[] = [];

  if (healthProfile.primaryGoals.length) {
    lines.push(`Goals: ${healthProfile.primaryGoals.slice(0, 3).join(', ')}`);
  }
  if (healthProfile.ageRange) {
    const ageLabel =
      AGE_RANGE_OPTIONS.find((o) => o.id === healthProfile.ageRange)?.label ?? healthProfile.ageRange;
    lines.push(`Age range: ${ageLabel}`);
  }
  if (healthProfile.languageStyle) {
    const styleLabel =
      LANGUAGE_STYLE_OPTIONS.find((o) => o.id === healthProfile.languageStyle)?.label ??
      healthProfile.languageStyle;
    lines.push(`Language style: ${styleLabel}`);
  }
  const region = healthProfile.stateOrRegion?.trim() ?? '';
  if (region) {
    lines.push(`Region: ${region}`);
  }
  if (healthProfile.conditions.length) {
    const preview = healthProfile.conditions.slice(0, 2).join(', ');
    lines.push(
      `Conditions: ${preview}${healthProfile.conditions.length > 2 ? '…' : ''}`,
    );
  }
  if (healthProfile.medications.length) {
    lines.push(`Medications tracked: ${healthProfile.medications.length}`);
  }
  if (healthProfile.allergies.length) {
    lines.push(`Allergies noted: ${healthProfile.allergies.slice(0, 2).join(', ')}`);
  }
  if (healthProfile.healthNotes.length) {
    lines.push(`Health notes saved: ${healthProfile.healthNotes.length}`);
  }
  if (healthProfile.doctorQuestions.length) {
    lines.push(`Clinician questions: ${healthProfile.doctorQuestions.length}`);
  }

  if (lines.length) {
    const name = healthProfile.preferredName.trim();
    return {
      id: 'profile-context',
      title: name ? `${name}'s health context` : 'Your health profile',
      subtitle: 'Profile data that informs recommendations',
      lines: lines.slice(0, 3),
    };
  }

  if (signals.includes('profile_incomplete')) {
    return {
      id: 'profile-incomplete',
      title: 'Profile has room to grow',
      subtitle: 'More detail can sharpen your next best action',
      lines: ['Conditions, medications, and notes help Curavon choose safer, more relevant steps.'],
    };
  }

  return null;
}

function buildAskInsightCard(memory: PersonalizationMemorySnapshot): SupportingInsightCard | null {
  const recentAsk = [...memory.askHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  if (!recentAsk) return null;

  const lines = [truncateText(recentAsk.concern, 110)];
  if (recentAsk.nextStep.trim()) {
    lines.push(`Next step discussed: ${truncateText(recentAsk.nextStep, 96)}`);
  }

  return {
    id: 'recent-ask',
    title: 'Recent Ask Curavon concern',
    subtitle: recentAsk.concernType || 'Context from Ask Curavon',
    lines,
  };
}

function buildGuideInsightCard(
  memory: PersonalizationMemorySnapshot,
  snapshot?: HealthSnapshot | null,
): SupportingInsightCard | null {
  const recentGuide = [...memory.guideResults].sort((a, b) =>
    b.completedAt.localeCompare(a.completedAt),
  )[0];

  if (recentGuide) {
    const summary = recentGuide.resultSummary.trim() || recentGuide.safeNextStep.trim();
    return {
      id: 'recent-guide',
      title: 'Recent guide context',
      subtitle: recentGuide.guideTitle,
      lines: summary ? [truncateText(summary, 120)] : ['A guided flow you completed recently.'],
    };
  }

  const guideTitles = snapshot?.guideActivity.recentGuideTitles ?? [];
  if (guideTitles.length) {
    return {
      id: 'guide-activity',
      title: 'Guide activity',
      subtitle: 'Flows that shaped recent recommendations',
      lines: guideTitles.slice(0, 2).map((title) => `Completed: ${title}`),
    };
  }

  return null;
}

function buildFollowUpInsightCard(memory: PersonalizationMemorySnapshot): SupportingInsightCard | null {
  const dueSoon = memory.followUps
    .filter((record) => record.status === 'pending' || record.status === 'snoozed')
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];

  if (!dueSoon) return null;

  return {
    id: 'follow-up-due',
    title: 'Follow-up context',
    subtitle: dueSoon.linkedActionTitle,
    lines: [truncateText(dueSoon.prompt, 120)],
  };
}

function buildActionProgressCard(memory: PersonalizationMemorySnapshot): SupportingInsightCard | null {
  const action = memory.nextActionState;
  if (!action || action.status === 'pending') return null;

  const lines: string[] = [];
  if (action.status === 'done') {
    lines.push(`Completed: ${truncateText(action.currentAction, 96)}`);
  } else if (action.status === 'blocked') {
    lines.push(`Blocked: ${action.blockedLabel ?? 'Something got in the way'}`);
  } else if (action.status === 'adjusted') {
    lines.push(`Adjusted step: ${truncateText(action.currentAction, 96)}`);
    if (action.adjustLabel) lines.push(`Adjustment: ${action.adjustLabel}`);
  }
  if (action.reason.trim()) {
    lines.push(truncateText(action.reason, 96));
  }

  return {
    id: 'action-status',
    title: 'Next action history',
    subtitle: action.title || 'How your last step resolved',
    lines: lines.slice(0, 3),
  };
}

function buildDoctorSummaryInsightCard(memory: PersonalizationMemorySnapshot): SupportingInsightCard | null {
  const included = memory.doctorSummaryItems.filter((item) => item.includedInSummary);
  if (!included.length) {
    return {
      id: 'doctor-ready-summary',
      title: 'Doctor-ready summary',
      subtitle: 'Nothing included yet',
      lines: ['Saved actions, Ask notes, and check-ins appear here when you add them to summary.'],
    };
  }

  const recentItems = [...included]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);

  return {
    id: 'doctor-ready-summary',
    title: 'Doctor-ready summary',
    subtitle: `${included.length} item${included.length === 1 ? '' : 's'} included`,
    lines: recentItems.map(
      (item) => `${item.source}: ${truncateText(item.title, 64)}`,
    ),
  };
}

function buildSafetyInsightCard(memory: PersonalizationMemorySnapshot): SupportingInsightCard | null {
  const recentFlag = [...memory.redFlagLogs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .find((log) => inLastDays(log.createdAt, 14));

  if (!recentFlag) return null;

  return {
    id: 'recent-safety-note',
    title: 'Recent safety note',
    subtitle: recentFlag.source,
    lines: [
      truncateText(recentFlag.matchedConcern, 96),
      truncateText(recentFlag.guidanceShown, 96),
    ].filter(Boolean),
  };
}

function buildSignalsInsightCard(
  signals: PersonalizationSignal[],
  snapshot?: HealthSnapshot | null,
): SupportingInsightCard | null {
  const lines: string[] = [];

  if (snapshot?.activeConcerns.unresolvedAskConcerns.length) {
    lines.push(
      ...snapshot.activeConcerns.unresolvedAskConcerns
        .slice(0, 2)
        .map((concern) => `Open concern: ${truncateText(concern, 88)}`),
    );
  }
  if (snapshot?.activeConcerns.repeatingSymptoms.length) {
    lines.push(
      `Repeating symptoms: ${snapshot.activeConcerns.repeatingSymptoms.slice(0, 2).join(', ')}`,
    );
  }

  const signalLines = signals.slice(0, 3).map(humanSignal);
  for (const line of signalLines) {
    if (lines.length >= 3) break;
    if (!lines.includes(line)) lines.push(line);
  }

  if (!lines.length) return null;

  return {
    id: 'curavon-noticed',
    title: 'Curavon noticed',
    subtitle: 'Signals feeding your next best action',
    lines: lines.slice(0, 3),
  };
}

function buildSupportingInsights(
  memory: PersonalizationMemorySnapshot,
  signals: PersonalizationSignal[],
  snapshot?: HealthSnapshot | null,
): SupportingInsightCard[] {
  const candidates: Array<{ priority: number; card: SupportingInsightCard }> = [];

  const checkInCard = buildCheckInContextCard(memory);
  if (checkInCard) candidates.push({ priority: 100, card: checkInCard });

  const safetyCard = buildSafetyInsightCard(memory);
  if (safetyCard) candidates.push({ priority: 95, card: safetyCard });

  const followUpCard = buildFollowUpInsightCard(memory);
  if (followUpCard) candidates.push({ priority: 90, card: followUpCard });

  const profileCard = buildProfileInsightCard(memory, signals);
  if (profileCard) candidates.push({ priority: 85, card: profileCard });

  const askCard = buildAskInsightCard(memory);
  if (askCard) {
    const recentAsk = [...memory.askHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const priority = recentAsk && inLastDays(recentAsk.createdAt, 7) ? 86 : 82;
    candidates.push({ priority, card: askCard });
  }

  const actionCard = buildActionProgressCard(memory);
  if (actionCard) {
    const actionPriority = memory.nextActionState?.status === 'pending' ? 80 : 88;
    candidates.push({ priority: actionPriority, card: actionCard });
  }

  const guideCard = buildGuideInsightCard(memory, snapshot);
  if (guideCard) candidates.push({ priority: 78, card: guideCard });

  candidates.push({
    priority: 72,
    card: buildDoctorSummaryInsightCard(memory),
  });

  const signalsCard = buildSignalsInsightCard(signals, snapshot);
  if (signalsCard) candidates.push({ priority: 65, card: signalsCard });

  return candidates
    .sort((a, b) => b.priority - a.priority)
    .filter((entry, index, all) => all.findIndex((item) => item.card.id === entry.card.id) === index)
    .slice(0, 4)
    .map((entry) => entry.card);
}

export function buildNextBestActionPlan(
  memory: PersonalizationMemorySnapshot,
  snapshot?: HealthSnapshot | null,
): NextBestActionPlan {
  const signals = derivePersonalizationSignals(memory);
  const recommendation = buildRecommendation({ signals, memory });
  return {
    recommendation,
    signals,
    supportingInsights: buildSupportingInsights(memory, signals, snapshot),
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
