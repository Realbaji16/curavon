import type { ActivityInsight, ActivityInsightStore } from '../../types/activityInsights';
import type { DoctorSummaryDraft, DoctorSummaryItem, RedFlagLog } from '../../types/doctorSummary';
import type { FollowUpRecord } from '../followUp/followUpTypes';
import type { GuideResultRecord } from '../../types/guideResult';
import type {
  AskIntakeSession,
  CreateAskIntakeSessionInput,
  UpdateAskIntakeSessionInput,
  UpdateFollowUpInput,
} from './dataTypes';
import { DataAuthError, DataUnavailableError } from './dataErrors';
import { getDataAdapter } from './getDataAdapter';
import { softDeleteUserRows } from './supabaseDataClient';

export const PRODUCT_DATA_MESSAGES = {
  auth: 'Sign in to load and save your health data.',
  unavailable: 'Your health data is temporarily unavailable. Try again soon.',
} as const;

export type ProductDataLoadResult = {
  doctorSummaryItems: DoctorSummaryItem[];
  doctorSummaryDrafts: DoctorSummaryDraft[];
  redFlagLogs: RedFlagLog[];
  followUps: FollowUpRecord[];
  guideResults: GuideResultRecord[];
  activityInsightStore: ActivityInsightStore;
  notificationPreference: Record<string, unknown> | null;
  userPreference: Record<string, unknown> | null;
  error: string | null;
};

const EMPTY_ACTIVITY_STORE: ActivityInsightStore = {
  insights: [],
  ruleGeneratedAt: null,
  lastAiRunAt: null,
  summaryHash: null,
};

function emptyProductLoad(error: string | null): ProductDataLoadResult {
  return {
    doctorSummaryItems: [],
    doctorSummaryDrafts: [],
    redFlagLogs: [],
    followUps: [],
    guideResults: [],
    activityInsightStore: EMPTY_ACTIVITY_STORE,
    notificationPreference: null,
    userPreference: null,
    error,
  };
}

export function toProductDataErrorMessage(error: unknown): string {
  if (error instanceof DataAuthError) return PRODUCT_DATA_MESSAGES.auth;
  if (error instanceof DataUnavailableError) return PRODUCT_DATA_MESSAGES.unavailable;
  return PRODUCT_DATA_MESSAGES.unavailable;
}

export async function loadProductData(): Promise<ProductDataLoadResult> {
  const adapter = getDataAdapter();
  try {
    const [
      doctorSummaryItems,
      doctorSummaryDrafts,
      redFlagLogs,
      followUps,
      guideResults,
      activityInsightStore,
      notificationPreference,
      userPreference,
    ] = await Promise.all([
      adapter.listDoctorSummaryItems(),
      adapter.listDoctorSummaryDrafts(),
      adapter.listRedFlagLogs(),
      adapter.listFollowUps(),
      adapter.listGuideResults(),
      adapter.getActivityInsightStore(),
      adapter.getNotificationPreference(),
      adapter.getUserPreference(),
    ]);

    return {
      doctorSummaryItems,
      doctorSummaryDrafts,
      redFlagLogs,
      followUps,
      guideResults: guideResults.map(({ guideId, guideTitle, completedAt, resultSummary, safeNextStep, safetyLevel, sourceSignals }) => ({
        guideId,
        guideTitle,
        completedAt,
        resultSummary,
        safeNextStep,
        safetyLevel,
        sourceSignals,
      })),
      activityInsightStore: activityInsightStore ?? EMPTY_ACTIVITY_STORE,
      notificationPreference,
      userPreference,
      error: null,
    };
  } catch (error) {
    return emptyProductLoad(toProductDataErrorMessage(error));
  }
}

export async function fetchDoctorSummaryItems(): Promise<DoctorSummaryItem[]> {
  return getDataAdapter().listDoctorSummaryItems();
}

export async function saveDoctorSummaryItemRecord(item: DoctorSummaryItem): Promise<void> {
  await getDataAdapter().createDoctorSummaryItem(item);
}

export async function fetchDoctorSummaryDrafts(): Promise<DoctorSummaryDraft[]> {
  return getDataAdapter().listDoctorSummaryDrafts();
}

export async function saveDoctorSummaryDraftRecord(draft: DoctorSummaryDraft): Promise<void> {
  await getDataAdapter().upsertDoctorSummaryDraft(draft);
}

export async function clearDoctorSummaryDraftsRemote(): Promise<void> {
  await softDeleteUserRows('doctor_summary_drafts');
}

export async function clearDoctorSummaryItemsRemote(): Promise<void> {
  await softDeleteUserRows('doctor_summary_items');
}

export async function clearRedFlagLogsRemote(): Promise<void> {
  await softDeleteUserRows('red_flag_logs');
}

export async function fetchRedFlagLogs(): Promise<RedFlagLog[]> {
  return getDataAdapter().listRedFlagLogs();
}

export async function saveRedFlagLogRecord(log: RedFlagLog): Promise<void> {
  await getDataAdapter().createRedFlagLog(log);
}

export async function fetchFollowUps(): Promise<FollowUpRecord[]> {
  return getDataAdapter().listFollowUps();
}

export async function saveFollowUpRecord(record: FollowUpRecord): Promise<void> {
  await getDataAdapter().createFollowUp(record);
}

export async function patchFollowUpRecord(id: string, patch: UpdateFollowUpInput): Promise<FollowUpRecord> {
  return getDataAdapter().updateFollowUp(id, patch);
}

export async function fetchGuideResults(): Promise<GuideResultRecord[]> {
  const results = await getDataAdapter().listGuideResults();
  return results.map(({ guideId, guideTitle, completedAt, resultSummary, safeNextStep, safetyLevel, sourceSignals }) => ({
    guideId,
    guideTitle,
    completedAt,
    resultSummary,
    safeNextStep,
    safetyLevel,
    sourceSignals,
  }));
}

export async function saveGuideResultRecord(record: GuideResultRecord): Promise<void> {
  await getDataAdapter().createGuideResult(record);
}

export async function fetchActivityInsightStore(): Promise<ActivityInsightStore> {
  return (await getDataAdapter().getActivityInsightStore()) ?? EMPTY_ACTIVITY_STORE;
}

export async function saveActivityInsightStoreRecord(store: ActivityInsightStore): Promise<void> {
  await getDataAdapter().saveActivityInsightStore(store);
}

export async function fetchActivityInsights(): Promise<ActivityInsight[]> {
  return getDataAdapter().listActivityInsights();
}

export async function fetchNotificationPreference(): Promise<Record<string, unknown> | null> {
  return getDataAdapter().getNotificationPreference();
}

export async function saveNotificationPreferenceRecord(
  preference: Record<string, unknown>,
): Promise<void> {
  await getDataAdapter().upsertNotificationPreference(preference);
}

export async function fetchUserPreference(): Promise<Record<string, unknown> | null> {
  return getDataAdapter().getUserPreference();
}

export async function saveUserPreferenceRecord(preference: Record<string, unknown>): Promise<void> {
  await getDataAdapter().upsertUserPreference(preference);
}

export async function createAskIntakeSessionRecord(
  input: CreateAskIntakeSessionInput,
): Promise<AskIntakeSession> {
  return getDataAdapter().createAskIntakeSession(input);
}

export async function updateAskIntakeSessionRecord(
  id: string,
  input: UpdateAskIntakeSessionInput,
): Promise<AskIntakeSession> {
  return getDataAdapter().updateAskIntakeSession(id, input);
}
