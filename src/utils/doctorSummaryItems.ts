import type { DailyCheckIn, HealthBlockedReason, HealthProfile, NextActionState } from '../types/health';
import type { AdjustOption } from '../types/health';
import type { DoctorSummaryItem } from '../types/doctorSummary';
import { ADJUSTED_ACTIONS } from './nextActionRules';

const BLOCKED_LABELS: Record<HealthBlockedReason, string> = {
  tired: 'Too tired',
  time: 'Not enough time',
  unsure: 'Unsure what to do',
  symptoms: 'Symptoms changed',
  other: 'Other',
};

export function buildCheckInSummaryContent(checkIn: DailyCheckIn): string {
  const lines: string[] = [
    `Sleep: ${checkIn.sleepQuality}`,
    `Energy: ${checkIn.energyLevel}`,
    `Stress: ${checkIn.stressLevel}`,
    `Mood: ${checkIn.mood}`,
  ];
  if (checkIn.symptoms.trim()) lines.push(`Symptoms: ${checkIn.symptoms.trim()}`);
  if (checkIn.painLevel > 0) lines.push(`Pain level: ${checkIn.painLevel}/10`);
  if (checkIn.hydration) lines.push(`Hydration: ${checkIn.hydration}`);
  if (checkIn.medicationTaken) lines.push(`Medication: ${checkIn.medicationTaken}`);
  if (checkIn.notes.trim()) lines.push(`Notes: ${checkIn.notes.trim()}`);
  return lines.join('\n');
}

export function createCheckInSummaryItem(checkIn: DailyCheckIn) {
  return {
    type: 'checkin' as const,
    source: 'Today Check-In' as const,
    title: "Today's Check-In",
    content: buildCheckInSummaryContent(checkIn),
    tags: ['check-in', 'today'],
    severity: 'normal' as const,
    includedInSummary: true,
  };
}

export function createFlowSummaryItem(input: {
  title: string;
  answers: Record<string, unknown>;
  watch?: string;
  nextStep?: string;
  redFlags?: string[];
  category?: string;
}) {
  const answerLines = Object.entries(input.answers)
    .filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== '')
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : String(v)}`);

  const lines = [
    ...answerLines,
    input.watch ? `What to watch: ${input.watch}` : '',
    input.nextStep ? `Next safe step: ${input.nextStep}` : '',
    input.redFlags?.length ? `Red-flag answers: ${input.redFlags.join(', ')}` : '',
  ].filter(Boolean);

  return {
    type: 'guided_flow' as const,
    source: 'Guides' as const,
    title: input.title,
    content: lines.join('\n'),
    tags: ['guided flow', input.category ?? 'flow'].filter(Boolean),
    severity: input.redFlags?.length ? ('attention' as const) : ('normal' as const),
    includedInSummary: true,
  };
}

export function createNextActionSummaryItem(
  state: NextActionState,
  extra?: { blockedReason?: HealthBlockedReason; adjustOption?: AdjustOption },
) {
  const recordedAt = state.completedAt ?? state.updatedAt;
  const timestamp = new Date(recordedAt).toLocaleString();
  const actionLine = `Action: ${state.currentAction}`;

  let title = 'Next action response';
  if (state.status === 'done') title = 'Completed next action';
  if (state.status === 'blocked') title = 'Blocked next action';
  if (state.status === 'adjusted') title = 'Adjusted next action';

  const lines = [
    actionLine,
    `Status: ${state.status}`,
  ];
  if (extra?.blockedReason) {
    lines.push(`Blocker: ${BLOCKED_LABELS[extra.blockedReason]}`);
  }
  if (extra?.adjustOption) {
    lines.push(`Adjustment: ${ADJUSTED_ACTIONS[extra.adjustOption] ?? extra.adjustOption}`);
  }
  lines.push(`Recorded: ${timestamp}`);
  if (state.relatedDoctorSummaryPrompt) {
    lines.push(`Note: ${state.relatedDoctorSummaryPrompt}`);
  }

  return {
    type: 'next_action' as const,
    source: 'Next Action' as const,
    title,
    content: lines.join('\n'),
    tags: ['action response'],
    severity: 'normal' as const,
    includedInSummary: true,
  };
}

export function createAskIntakeSummaryItem(input: {
  mainConcern: string;
  concernType: string;
  timeline: string;
  intensity: number;
  whatChanged: string;
  triedSoFar: string;
  redFlags: string[];
  nextSafeStep: string;
}) {
  const lines = [
    `Concern: ${input.mainConcern}`,
    input.concernType ? `Type: ${input.concernType}` : '',
    input.timeline ? `Timeline: ${input.timeline}` : '',
    `Intensity: ${input.intensity}/10`,
    input.whatChanged ? `Changes noticed: ${input.whatChanged}` : '',
    input.triedSoFar ? `Tried so far: ${input.triedSoFar}` : '',
    input.redFlags.length ? `Red flags: ${input.redFlags.join(', ')}` : '',
    `Next safe step: ${input.nextSafeStep}`,
  ].filter(Boolean);

  const typeTag = input.concernType
    ? input.concernType.toLowerCase().replace(/\s+/g, '-')
    : 'concern';

  return {
    type: 'ask_intake' as const,
    source: 'Ask Curavon' as const,
    title: 'Ask Curavon intake',
    content: lines.join('\n'),
    tags: ['ask', 'intake', typeTag],
    severity: 'normal' as const,
    includedInSummary: true,
  };
}

export function createRedFlagSummaryItem(input: {
  source: string;
  matchedConcern: string;
  userText: string;
  guidanceShown: string;
}) {
  return {
    type: 'red_flag' as const,
    source: (['Today Check-In', 'Guides', 'Ask Curavon', 'Profile', 'Next Action'].includes(
      input.source,
    )
      ? input.source
      : 'Today Check-In') as DoctorSummaryItem['source'],
    title: 'Urgent concern noted',
    content: [
      `Matched concern: ${input.matchedConcern}`,
      `User text: ${input.userText}`,
      `Guidance shown: ${input.guidanceShown}`,
    ].join('\n'),
    tags: ['red flag', 'safety'],
    severity: 'urgent' as const,
    includedInSummary: true,
  };
}

export function createProfileMedicationNoteItem(profile: HealthProfile) {
  if (!profile.medications.length && !profile.allergies.length) return null;
  const lines = [
    profile.medications.length ? `Medications: ${profile.medications.join(', ')}` : '',
    profile.allergies.length ? `Allergies: ${profile.allergies.join(', ')}` : '',
  ].filter(Boolean);
  return {
    type: 'medication_note' as const,
    source: 'Profile' as const,
    title: 'Medication & allergy notes',
    content: lines.join('\n'),
    tags: ['medication', 'profile'],
    severity: 'normal' as const,
    includedInSummary: true,
  };
}

export interface BuiltSummaryDocument {
  title: string;
  dateLabel: string;
  sections: { heading: string; body: string }[];
  footer: string;
  fullText: string;
}

export function buildSummaryDocument(
  items: DoctorSummaryItem[],
  profile: HealthProfile,
  questionsForClinician: string[],
): BuiltSummaryDocument {
  const included = items.filter((i) => i.includedInSummary);
  const checkins = included.filter((i) => i.type === 'checkin');
  const flows = included.filter((i) => i.type === 'guided_flow' || i.type === 'ask_intake');
  const actions = included.filter((i) => i.type === 'next_action');
  const redFlags = included.filter((i) => i.type === 'red_flag');
  const meds = included.filter((i) => i.type === 'medication_note');

  const mainConcern =
    flows[0]?.title ??
    checkins.find((c) => c.content.includes('Symptoms:'))?.content.split('\n').find((l) => l.startsWith('Symptoms:'))?.replace('Symptoms: ', '') ??
    included.find((i) => i.type === 'ask_intake')?.content.split('\n')[0]?.replace('Concern: ', '') ??
    profile.healthNotes[0] ??
    profile.primaryGoals[0] ??
    'General health organization';

  const symptomLines = [
    ...checkins.flatMap((c) => c.content.split('\n').filter((l) => l.startsWith('Symptoms:') || l.startsWith('Notes:'))),
    ...flows.map((f) => f.content.split('\n')[0]).filter(Boolean),
  ];

  const timeline = [...included]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10)
    .map((i) => `${new Date(i.createdAt).toLocaleDateString()} — ${i.source}: ${i.title}`);

  const tried = actions.map((a) => a.content).join('\n\n');

  const redFlagBody =
    redFlags.length > 0
      ? redFlags.map((r) => r.content).join('\n\n')
      : 'No urgent warning signs flagged in stored notes.';

  const medBody =
    meds.length > 0
      ? meds.map((m) => m.content).join('\n')
      : profile.medications.length
        ? `Medications: ${profile.medications.join(', ')}`
        : 'No medication notes stored.';

  const defaultQuestions = [
    'What should I watch for?',
    'When should I seek urgent care?',
    'What information would be useful to track next?',
  ];
  const allQuestions = [...new Set([...profile.doctorQuestions, ...questionsForClinician, ...defaultQuestions])];

  const sections = [
    { heading: 'Reason for visit / main concern', body: mainConcern },
    {
      heading: 'Recent symptoms or concerns',
      body: symptomLines.length ? symptomLines.join('\n') : 'No recent symptoms logged.',
    },
    { heading: 'Timeline', body: timeline.length ? timeline.join('\n') : 'No timeline entries yet.' },
    { heading: 'What has been tried', body: tried || 'No action responses logged yet.' },
    { heading: 'Red flags checked', body: redFlagBody },
    { heading: 'Medication notes', body: medBody },
    { heading: 'Questions for clinician', body: allQuestions.map((q) => `• ${q}`).join('\n') },
  ];

  const footer =
    'Generated by Curavon to help organize your notes. Not a diagnosis or substitute for medical care.';

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const fullText = [
    'Doctor-ready summary',
    dateLabel,
    '',
    ...sections.flatMap((s) => [`## ${s.heading}`, s.body, '']),
    footer,
  ].join('\n');

  return {
    title: 'Doctor-ready summary',
    dateLabel,
    sections,
    footer,
    fullText,
  };
}
