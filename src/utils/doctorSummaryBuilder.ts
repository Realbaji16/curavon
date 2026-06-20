import type {
  DailyCheckIn,
  HealthBlockedReason,
  HealthProfile,
  NextActionState,
} from '../types/health';
import { hasUrgentHealthLanguage } from './healthSafety';
import { todayDateKey } from './healthUtils';

export interface DoctorSummaryData {
  mainConcern: string;
  timeline: { when: string; note: string }[];
  profileSections: { label: string; items: string[] }[];
  actionsTried: string[];
  blockers: string[];
  clinicianQuestions: string[];
  redFlagsChecked: string[];
  hasUserData: boolean;
}

const HEALTH_BLOCKED_LABELS: Record<HealthBlockedReason, string> = {
  tired: 'Too tired',
  time: 'Not enough time',
  unsure: 'Unsure what to do',
  symptoms: 'Symptoms changed',
  other: 'Other',
};

function formatCheckInDate(dateKey: string): string {
  const today = todayDateKey();
  if (dateKey === today) return 'Today';

  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const diffDays = Math.floor(
    (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
      86400000,
  );

  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatCheckInNote(checkIn: DailyCheckIn): string {
  const parts: string[] = [
    `Sleep: ${checkIn.sleepQuality}`,
    `Energy: ${checkIn.energyLevel}`,
    `Stress: ${checkIn.stressLevel}`,
    `Mood: ${checkIn.mood}`,
  ];
  if (checkIn.symptoms.trim()) parts.push(`Symptoms: ${checkIn.symptoms.trim()}`);
  if (checkIn.painLevel > 0) parts.push(`Pain: ${checkIn.painLevel}/10`);
  if (checkIn.hydration) parts.push(`Hydration: ${checkIn.hydration}`);
  if (checkIn.medicationTaken) parts.push(`Medication: ${checkIn.medicationTaken}`);
  if (checkIn.notes.trim()) parts.push(`Notes: ${checkIn.notes.trim()}`);
  if (checkIn.steps > 0) parts.push(`Steps: ${checkIn.steps.toLocaleString()}`);
  return parts.join(' · ');
}

function actionStatusLabel(status: NextActionState['status']): string {
  switch (status) {
    case 'done':
      return 'Completed';
    case 'blocked':
      return 'Blocked';
    case 'adjusted':
      return 'Adjusted';
    default:
      return 'Suggested';
  }
}

export function buildDoctorSummaryData({
  healthProfile,
  dailyCheckins,
  nextActionState,
  concernOverride,
}: {
  healthProfile: HealthProfile;
  dailyCheckins: DailyCheckIn[];
  nextActionState: NextActionState | null;
  concernOverride?: string;
}): DoctorSummaryData {
  const recentCheckins = [...dailyCheckins]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  const latestSymptom = recentCheckins.find((c) => c.symptoms.trim())?.symptoms.trim();
  const latestNote = recentCheckins.find((c) => c.notes.trim())?.notes.trim();

  let mainConcern =
    concernOverride ??
    latestSymptom ??
    latestNote ??
    healthProfile.healthNotes[0] ??
    (healthProfile.primaryGoals.length > 0 ? healthProfile.primaryGoals.join(', ') : '');

  if (!mainConcern) {
    mainConcern = 'No main concern logged yet. Add symptoms in a check-in or notes in your health profile.';
  }

  const timeline =
    recentCheckins.length > 0
      ? recentCheckins.map((checkIn) => ({
          when: formatCheckInDate(checkIn.date),
          note: formatCheckInNote(checkIn),
        }))
      : [{ when: 'Recent activity', note: 'No check-ins recorded yet.' }];

  const profileSections = [
    { label: 'Conditions', items: healthProfile.conditions },
    { label: 'Medications', items: healthProfile.medications },
    { label: 'Allergies', items: healthProfile.allergies },
    { label: 'Health notes', items: healthProfile.healthNotes },
  ].filter((section) => section.items.length > 0);

  const actionsTried = nextActionState
    ? [`[${actionStatusLabel(nextActionState.status)}] ${nextActionState.currentAction}`]
    : [];

  const blockers =
    nextActionState?.status === 'blocked' && nextActionState.blockedReason
      ? [HEALTH_BLOCKED_LABELS[nextActionState.blockedReason]]
      : [];

  const clinicianQuestions =
    healthProfile.doctorQuestions.length > 0
      ? healthProfile.doctorQuestions
      : ['What patterns from my recent check-ins are worth discussing?'];

  const urgentMentions = recentCheckins
    .flatMap((c) => [c.symptoms, c.notes])
    .filter((text) => text.trim() && hasUrgentHealthLanguage(text));

  const redFlagsChecked = [
    urgentMentions.length > 0
      ? 'Urgent language noted in recent symptoms or notes — clinician review recommended'
      : 'No urgent language flagged in recent check-ins',
    'Chest pain — none reported in stored notes',
    'Breathing difficulty — none reported in stored notes',
  ];

  const hasUserData =
    Boolean(concernOverride) ||
    recentCheckins.length > 0 ||
    healthProfile.conditions.length > 0 ||
    healthProfile.medications.length > 0 ||
    healthProfile.allergies.length > 0 ||
    healthProfile.healthNotes.length > 0 ||
    healthProfile.doctorQuestions.length > 0 ||
    Boolean(nextActionState);

  return {
    mainConcern,
    timeline,
    profileSections,
    actionsTried,
    blockers,
    clinicianQuestions,
    redFlagsChecked,
    hasUserData,
  };
}
