import type { ActivityInsightStore } from '../../types/activityInsights';
import type { AskHistoryEntry } from '../../types/askIntake';
import type { DoctorSummaryDraft, DoctorSummaryItem, RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import type { AIDecisionTrace } from '../ai/governance/aiObservabilityTypes';
import type { FollowUpRecord } from '../followUp/followUpTypes';
import type { GuideResultRecord } from '../../types/guideResult';

export type CuravonProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type AIUsageLogRecord = {
  id: string;
  taskName: string;
  model?: string;
  status: string;
  estimatedTokens?: number;
  occurredAt: string;
  payload?: Record<string, unknown>;
};

export type UserPreferencesRecord = Record<string, unknown>;

export interface ProfileDataPort {
  read(): Promise<CuravonProfile | null>;
  upsert(profile: Omit<CuravonProfile, 'id'> & { id?: string }): Promise<CuravonProfile>;
}

export interface HealthProfileDataPort {
  read(): Promise<HealthProfile | null>;
  save(profile: HealthProfile): Promise<void>;
  softDelete(): Promise<void>;
}

export interface DailyCheckinsDataPort {
  list(): Promise<DailyCheckIn[]>;
  save(checkin: DailyCheckIn): Promise<void>;
  softDeleteAll(): Promise<void>;
}

export interface AskHistoryDataPort {
  list(): Promise<AskHistoryEntry[]>;
  save(entry: AskHistoryEntry): Promise<void>;
  softDeleteAll(): Promise<void>;
}

export interface GuideResultsDataPort {
  list(): Promise<GuideResultRecord[]>;
  save(record: GuideResultRecord): Promise<void>;
  softDeleteAll(): Promise<void>;
}

export interface FollowUpsDataPort {
  list(): Promise<FollowUpRecord[]>;
  save(record: FollowUpRecord): Promise<void>;
  softDeleteAll(): Promise<void>;
}

export interface NextActionStateDataPort {
  read(): Promise<NextActionState | null>;
  save(state: NextActionState): Promise<void>;
  softDelete(): Promise<void>;
}

export interface DoctorSummaryDataPort {
  listItems(): Promise<DoctorSummaryItem[]>;
  saveItem(item: DoctorSummaryItem): Promise<void>;
  listDrafts(): Promise<DoctorSummaryDraft[]>;
  saveDraft(draft: DoctorSummaryDraft): Promise<void>;
  softDeleteAll(): Promise<void>;
}

export interface RedFlagLogsDataPort {
  list(): Promise<RedFlagLog[]>;
  save(log: RedFlagLog): Promise<void>;
  softDeleteAll(): Promise<void>;
}

export interface ActivityInsightsDataPort {
  read(): Promise<ActivityInsightStore | null>;
  save(store: ActivityInsightStore): Promise<void>;
  softDeleteAll(): Promise<void>;
}

export interface AiAuditDataPort {
  listUsageLogs(): Promise<AIUsageLogRecord[]>;
  appendUsageLog(entry: Omit<AIUsageLogRecord, 'id'> & { id?: string }): Promise<void>;
  listDecisionTraces(): Promise<AIDecisionTrace[]>;
  appendDecisionTrace(trace: AIDecisionTrace): Promise<void>;
  softDeleteAll(): Promise<void>;
}

export interface UserPreferencesDataPort {
  read(): Promise<UserPreferencesRecord | null>;
  save(preferences: UserPreferencesRecord): Promise<void>;
  softDelete(): Promise<void>;
}

/** Supabase-backed persistence ports — replace all Curavon localStorage health/product state. */
export interface SupabaseDataPorts {
  profile: ProfileDataPort;
  healthProfile: HealthProfileDataPort;
  dailyCheckins: DailyCheckinsDataPort;
  askHistory: AskHistoryDataPort;
  guideResults: GuideResultsDataPort;
  followUps: FollowUpsDataPort;
  nextActionState: NextActionStateDataPort;
  doctorSummary: DoctorSummaryDataPort;
  redFlagLogs: RedFlagLogsDataPort;
  activityInsights: ActivityInsightsDataPort;
  aiAudit: AiAuditDataPort;
  userPreferences: UserPreferencesDataPort;
}

export const SUPABASE_DATA_PORT_KEYS = [
  'profile',
  'healthProfile',
  'dailyCheckins',
  'askHistory',
  'guideResults',
  'followUps',
  'nextActionState',
  'doctorSummary',
  'redFlagLogs',
  'activityInsights',
  'aiAudit',
  'userPreferences',
] as const satisfies readonly (keyof SupabaseDataPorts)[];

export type SupabaseDataPortKey = (typeof SUPABASE_DATA_PORT_KEYS)[number];

/** Care Circle (future) — schema in supabase/migrations. */
export const CARE_CIRCLE_SUPABASE_TABLES = [
  'care_circles',
  'care_circle_members',
  'care_circle_events',
] as const;
