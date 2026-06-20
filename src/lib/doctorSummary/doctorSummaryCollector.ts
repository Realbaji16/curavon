import type { AskHistoryEntry } from '../../types/askIntake';
import type { DoctorSummaryItem, RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import { loadCoreHealthData } from '../data/coreHealthDataService';
import { loadProductData } from '../data/productDataService';
import type {
  DoctorSummaryCompressionPayload,
  DoctorSummaryInput,
} from './doctorSummaryTypes';

function inDateRange(iso: string, days: number): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

export async function collectDoctorSummaryInput(options?: {
  selectedNoteIds?: string[];
  userNotes?: string[];
  dateRangeDays?: number;
}): Promise<DoctorSummaryInput> {
  const days = options?.dateRangeDays ?? 30;
  const [core, product] = await Promise.all([loadCoreHealthData(), loadProductData()]);
  const profile = core.healthProfile;
  const checkins = core.dailyCheckins.filter((c) => inDateRange(c.createdAt, days));
  const askHistory = core.askHistory.filter((a) => inDateRange(a.createdAt, days));
  const summaryItems = product.doctorSummaryItems.filter((i) => inDateRange(i.createdAt, days));
  const selectedItems = options?.selectedNoteIds?.length
    ? summaryItems.filter((i) => options.selectedNoteIds?.includes(i.id))
    : summaryItems.filter((i) => i.includedInSummary);
  const redFlags = product.redFlagLogs.filter((r) => inDateRange(r.createdAt, days));
  const nextAction = core.nextActionState;
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

/** @deprecated Sync collector inputs for legacy callers — prefer collectDoctorSummaryInput(). */
export function collectDoctorSummaryInputFromMemory(input: {
  profile: HealthProfile;
  checkins: DailyCheckIn[];
  askHistory: AskHistoryEntry[];
  summaryItems: DoctorSummaryItem[];
  redFlags: RedFlagLog[];
  nextAction: NextActionState | null;
  userNotes?: string[];
  dateRangeDays?: number;
}): DoctorSummaryInput {
  const days = input.dateRangeDays ?? 30;
  const checkins = input.checkins.filter((c) => inDateRange(c.createdAt, days));
  const askHistory = input.askHistory.filter((a) => inDateRange(a.createdAt, days));
  const summaryItems = input.summaryItems.filter((i) => inDateRange(i.createdAt, days));
  const redFlags = input.redFlags.filter((r) => inDateRange(r.createdAt, days));
  const guideResults = summaryItems.filter((i) => i.type === 'guided_flow');
  const nextActions = input.nextAction ? [input.nextAction] : [];

  const activeConcerns = [
    ...askHistory.slice(0, 6).map((a) => a.concern),
    ...checkins.slice(0, 6).map((c) => c.symptoms).filter(Boolean),
  ]
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 8);

  return {
    profileSnapshot: {
      preferredName: input.profile.preferredName,
      primaryGoals: input.profile.primaryGoals,
      conditions: input.profile.conditions,
      medications: input.profile.medications,
      allergies: input.profile.allergies,
      doctorQuestions: input.profile.doctorQuestions,
    },
    activeConcerns,
    recentCheckIns: checkins.slice(0, 10),
    askHistory: askHistory.slice(0, 10),
    guideResults,
    nextActions,
    redFlagLogs: redFlags.slice(0, 10),
    userNotes: input.userNotes ?? [],
    dateRange: `Last ${days} days`,
  };
}
