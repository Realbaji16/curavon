import type { AskHistoryEntry } from '../../types/askIntake';
import type { DoctorSummaryItem, RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import { safeRead } from '../../utils/healthStorage';
import { APP_STORAGE_KEYS } from '../data/storageKeys';
import type {
  DoctorSummaryCompressionPayload,
  DoctorSummaryInput,
} from './doctorSummaryTypes';

const KEYS = {
  profile: APP_STORAGE_KEYS.healthProfile,
  checkins: APP_STORAGE_KEYS.dailyCheckins,
  askHistory: APP_STORAGE_KEYS.askHistory,
  summaryItems: APP_STORAGE_KEYS.doctorSummaryItems,
  redFlags: APP_STORAGE_KEYS.redFlagLogs,
  nextAction: APP_STORAGE_KEYS.nextActionState,
};

function inDateRange(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

export function collectDoctorSummaryInput(options?: {
  selectedNoteIds?: string[];
  userNotes?: string[];
  dateRangeDays?: number;
}): DoctorSummaryInput {
  const days = options?.dateRangeDays ?? 30;
  const profile = safeRead<HealthProfile>(KEYS.profile, {
    preferredName: '',
    primaryGoals: [],
    sensitiveMode: false,
    smartSilencePreference: 'gentle-reminders',
    conditions: [],
    medications: [],
    allergies: [],
    healthNotes: [],
    doctorQuestions: [],
    emergencyContactName: '',
    emergencyContactPhone: '',
  });
  const checkins = safeRead<DailyCheckIn[]>(KEYS.checkins, []).filter((c) => inDateRange(c.createdAt, days));
  const askHistory = safeRead<AskHistoryEntry[]>(KEYS.askHistory, []).filter((a) => inDateRange(a.createdAt, days));
  const summaryItems = safeRead<DoctorSummaryItem[]>(KEYS.summaryItems, []).filter((i) => inDateRange(i.createdAt, days));
  const selectedItems = options?.selectedNoteIds?.length
    ? summaryItems.filter((i) => options.selectedNoteIds?.includes(i.id))
    : summaryItems.filter((i) => i.includedInSummary);
  const redFlags = safeRead<RedFlagLog[]>(KEYS.redFlags, []).filter((r) => inDateRange(r.createdAt, days));
  const nextAction = safeRead<NextActionState | null>(KEYS.nextAction, null);
  const guideResults = selectedItems.filter((i) => i.type === 'guided_flow');
  const nextActions = nextAction ? [nextAction] : [];

  const activeConcerns = [
    ...askHistory.slice(0, 6).map((a) => a.concern),
    ...checkins.slice(0, 6).map((c) => c.symptoms).filter(Boolean),
  ]
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    profileSnapshot: {
      preferredName: profile.preferredName,
      primaryGoals: profile.primaryGoals,
      conditions: profile.conditions,
      medications: profile.medications,
      allergies: profile.allergies,
      doctorQuestions: profile.doctorQuestions,
    },
    activeConcerns,
    recentCheckIns: checkins.slice(0, 10),
    askHistory: askHistory.slice(0, 10),
    guideResults,
    nextActions,
    redFlagLogs: redFlags.slice(0, 10),
    userNotes: options?.userNotes ?? [],
    dateRange: `Last ${days} days`,
  };
}

export function compressDoctorSummaryInput(input: DoctorSummaryInput): DoctorSummaryCompressionPayload {
  const repeatedPatterns = Array.from(
    new Set(
      input.recentCheckIns
        .flatMap((c) => [c.symptoms, c.notes])
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8),
    ),
  );

  const recentActions = input.nextActions
    .map((a) => `${a.title ?? "Today's next best action"}: ${a.currentAction}`)
    .slice(0, 6);

  const redFlagSummaries = input.redFlagLogs
    .map((r) => `${new Date(r.createdAt).toLocaleDateString()}: ${r.matchedConcern}`)
    .slice(0, 6);

  const medicationNoteSummaries = input.profileSnapshot.medications.slice(0, 6);

  const userQuestions = Array.from(
    new Set([
      ...input.profileSnapshot.doctorQuestions,
      ...input.userNotes.filter((n) => n.trim().endsWith('?')),
      ...input.askHistory.slice(0, 4).map((a) => `What should I ask about ${a.concernType || 'this concern'}?`),
    ]),
  ).slice(0, 8);

  return {
    dateRange: input.dateRange,
    mainConcernCount: input.activeConcerns.length,
    activeConcernSummaries: input.activeConcerns.slice(0, 8),
    repeatedPatterns,
    recentActions,
    redFlagSummaries,
    medicationNoteSummaries,
    userQuestions,
  };
}
