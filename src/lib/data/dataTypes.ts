import type { AIDecisionTrace } from '../ai/governance/aiObservabilityTypes';
import type { ActivityInsight } from '../../types/activityInsights';
import type { AskHistoryEntry } from '../../types/askIntake';
import type {
  DoctorSummaryDraft,
  DoctorSummaryItem,
  RedFlagLog,
} from '../../types/doctorSummary';
import type { FollowUpRecord } from '../followUp/followUpTypes';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import type { GuideResultRecord } from '../../types/guideResult';

/** @deprecated Collection adapter — removed in Supabase-only persistence. */
export type CuravonCollection =
  | 'health_profile'
  | 'daily_checkins'
  | 'ask_history'
  | 'doctor_summary_items'
  | 'doctor_summary_drafts'
  | 'next_action_state'
  | 'red_flag_logs'
  | 'follow_ups'
  | 'memory_snapshot'
  | 'ai_usage_log'
  | 'guide_results'
  | 'user_preferences';

/** @deprecated Collection adapter entity base. */
export interface CuravonDataEntity {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

/** @deprecated Collection adapter query. */
export type DataQuery = {
  userId: string;
  includeDeleted?: boolean;
  limit?: number;
};

export type FlowRiskLevel = 'low' | 'medium' | 'high' | 'urgent';
export type FlowPrivacyLevel = 'private' | 'sensitive' | 'care_circle_later' | 'shared';

export type UserProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type HealthProfileRecord = HealthProfile;

export type DailyCheckin = DailyCheckIn;

export type AskHistoryItem = AskHistoryEntry;

export type AskIntakeSession = {
  id: string;
  userId: string;
  flowId?: string | null;
  status: string;
  stage: string;
  riskLevel: FlowRiskLevel;
  privacyLevel: FlowPrivacyLevel;
  moduleVersion: string;
  source?: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type GuideResult = GuideResultRecord & { id: string; userId: string };

export type HealthFlow = {
  id: string;
  userId: string;
  status: string;
  stage: string;
  riskLevel: FlowRiskLevel;
  privacyLevel: FlowPrivacyLevel;
  moduleVersion: string;
  source?: string;
  title?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type FlowAction = {
  id: string;
  userId: string;
  flowId: string;
  status: string;
  stage: string;
  riskLevel: FlowRiskLevel;
  privacyLevel: FlowPrivacyLevel;
  moduleVersion: string;
  actionOrder: number;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type FlowBlocker = {
  id: string;
  userId: string;
  flowId: string;
  status: string;
  stage: string;
  riskLevel: FlowRiskLevel;
  privacyLevel: FlowPrivacyLevel;
  moduleVersion: string;
  blockerType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type FollowUp = FollowUpRecord;

export type NextActionStateRecord = NextActionState;

export type DoctorSummaryItemRecord = DoctorSummaryItem;

export type DoctorSummaryDraftRecord = DoctorSummaryDraft;

export type RedFlagLogRecord = RedFlagLog;

export type ActivityInsightRecord = ActivityInsight;

export type NotificationPreference = Record<string, unknown>;

export type UserPreference = Record<string, unknown>;

export type AgentEvent = {
  id: string;
  userId: string;
  flowId?: string | null;
  eventType: string;
  source: string;
  summary?: string | null;
  status: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type AiUsageLog = {
  id: string;
  userId: string;
  taskName: string;
  model?: string;
  status: string;
  estimatedTokens?: number;
  occurredAt: string;
  payload?: Record<string, unknown>;
};

export type AiDecisionTraceRecord = AIDecisionTrace;

export type DataExportRequest = {
  id: string;
  userId: string;
  requestStatus: string;
  requestedAt: string;
  completedAt?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type DataDeletionRequest = {
  id: string;
  userId: string;
  requestStatus: string;
  deletionScope?: string | null;
  requestedAt: string;
  completedAt?: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CareCircle = {
  id: string;
  ownerId: string;
  name: string;
  status: string;
  sharingRules: Record<string, unknown>;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CareCircleMember = {
  id: string;
  careCircleId: string;
  ownerId: string;
  memberUserId?: string | null;
  inviteEmail?: string | null;
  permissionLevel: string;
  sharingRules: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type CareCircleEvent = {
  id: string;
  careCircleId: string;
  actorUserId: string;
  eventType: string;
  summary?: string | null;
  status: string;
  payload: Record<string, unknown>;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateDailyCheckinInput = Omit<DailyCheckin, 'createdAt'> & { id?: string };

export type CreateAskHistoryItemInput = AskHistoryItem;

export type CreateAskIntakeSessionInput = {
  flowId?: string | null;
  status?: string;
  stage?: string;
  riskLevel?: FlowRiskLevel;
  privacyLevel?: FlowPrivacyLevel;
  moduleVersion?: string;
  payload?: Record<string, unknown>;
};

export type UpdateAskIntakeSessionInput = Partial<
  Pick<
    AskIntakeSession,
    'flowId' | 'status' | 'stage' | 'riskLevel' | 'privacyLevel' | 'moduleVersion' | 'payload'
  >
>;

export type CreateGuideResultInput = GuideResultRecord;

export type CreateDraftHealthFlowInput = {
  title?: string;
  stage?: string;
  riskLevel?: FlowRiskLevel;
  privacyLevel?: FlowPrivacyLevel;
  moduleVersion?: string;
  payload?: Record<string, unknown>;
};

export type UpdateHealthFlowStatusInput = Partial<
  Pick<HealthFlow, 'status' | 'stage' | 'riskLevel' | 'privacyLevel' | 'title' | 'payload'>
>;

export type CreateFlowActionInput = {
  flowId: string;
  status?: string;
  stage?: string;
  riskLevel?: FlowRiskLevel;
  privacyLevel?: FlowPrivacyLevel;
  moduleVersion?: string;
  actionOrder?: number;
  payload?: Record<string, unknown>;
};

export type UpdateFlowActionStatusInput = Partial<
  Pick<FlowAction, 'status' | 'stage' | 'riskLevel' | 'payload'>
>;

export type CreateFlowBlockerInput = {
  flowId: string;
  blockerType?: string;
  status?: string;
  stage?: string;
  riskLevel?: FlowRiskLevel;
  payload?: Record<string, unknown>;
};

export type CreateFollowUpInput = FollowUpRecord;

export type UpdateFollowUpInput = Partial<FollowUpRecord>;

export type CreateDoctorSummaryItemInput = DoctorSummaryItem;

export type UpsertDoctorSummaryDraftInput = DoctorSummaryDraft;

export type CreateRedFlagLogInput = RedFlagLog;

export type CreateAgentEventInput = {
  flowId?: string | null;
  eventType: string;
  source?: string;
  summary?: string;
  status?: string;
  payload?: Record<string, unknown>;
  occurredAt?: string;
};

export type CreateAiUsageLogInput = {
  taskName: string;
  model?: string;
  status: string;
  estimatedTokens?: number;
  occurredAt?: string;
  payload?: Record<string, unknown>;
};

export type CreateAiDecisionTraceInput = AIDecisionTrace;

export type CreateDataExportRequestInput = {
  requestStatus?: string;
  payload?: Record<string, unknown>;
};

export type CreateDataDeletionRequestInput = {
  requestStatus?: string;
  deletionScope?: string;
  payload?: Record<string, unknown>;
};

export type CreateCareCircleInput = {
  name?: string;
  sharingRules?: Record<string, unknown>;
  payload?: Record<string, unknown>;
};

export type CreateCareCircleInviteInput = {
  careCircleId: string;
  inviteEmail?: string;
  memberUserId?: string;
  permissionLevel?: string;
  sharingRules?: Record<string, unknown>;
};

export type UpdateCareCircleMemberInput = Partial<
  Pick<CareCircleMember, 'permissionLevel' | 'sharingRules' | 'status' | 'memberUserId' | 'inviteEmail'>
>;
