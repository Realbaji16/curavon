import type { ActivityInsightStore } from '../../types/activityInsights';
import type {
  AgentEvent,
  AskHistoryItem,
  AskIntakeSession,
  CareCircle,
  CareCircleMember,
  CreateAgentEventInput,
  CreateAskHistoryItemInput,
  CreateAskIntakeSessionInput,
  CreateCareCircleInput,
  CreateCareCircleInviteInput,
  CreateDailyCheckinInput,
  CreateAiDecisionTraceInput,
  CreateAiUsageLogInput,
  CreateDataDeletionRequestInput,
  CreateDataExportRequestInput,
  AiDecisionTraceRecord,
  AiUsageLog,
  CreateDoctorSummaryItemInput,
  CreateDraftHealthFlowInput,
  CreateFlowActionInput,
  CreateFlowBlockerInput,
  CreateFollowUpInput,
  CreateGuideResultInput,
  CreateRedFlagLogInput,
  DailyCheckin,
  DataDeletionRequest,
  DataExportRequest,
  DoctorSummaryDraftRecord,
  DoctorSummaryItemRecord,
  FlowAction,
  FlowBlocker,
  FollowUp,
  GuideResult,
  HealthFlow,
  HealthProfileRecord,
  NextActionStateRecord,
  NotificationPreference,
  RedFlagLogRecord,
  UpdateAskIntakeSessionInput,
  UpdateCareCircleMemberInput,
  UpdateFlowActionStatusInput,
  UpdateFollowUpInput,
  UpdateHealthFlowStatusInput,
  UpsertDoctorSummaryDraftInput,
  UserPreference,
} from './dataTypes';

/** Supabase-backed persistence contract for Curavon app state. */
export interface DataAdapter {
  getHealthProfile(): Promise<HealthProfileRecord | null>;
  upsertHealthProfile(profile: HealthProfileRecord): Promise<HealthProfileRecord>;

  listDailyCheckins(): Promise<DailyCheckin[]>;
  createDailyCheckin(input: CreateDailyCheckinInput): Promise<DailyCheckin>;

  listAskHistory(): Promise<AskHistoryItem[]>;
  createAskHistoryItem(input: CreateAskHistoryItemInput): Promise<AskHistoryItem>;

  createAskIntakeSession(input: CreateAskIntakeSessionInput): Promise<AskIntakeSession>;
  getAskIntakeSession(id: string): Promise<AskIntakeSession | null>;
  updateAskIntakeSession(id: string, input: UpdateAskIntakeSessionInput): Promise<AskIntakeSession>;

  createGuideResult(input: CreateGuideResultInput): Promise<GuideResult>;
  getGuideResult(id: string): Promise<GuideResult | null>;

  listHealthFlows(): Promise<HealthFlow[]>;
  getHealthFlow(id: string): Promise<HealthFlow | null>;
  createDraftHealthFlow(input: CreateDraftHealthFlowInput): Promise<HealthFlow>;
  updateHealthFlowStatus(id: string, input: UpdateHealthFlowStatusInput): Promise<HealthFlow>;

  listFlowActions(flowId: string): Promise<FlowAction[]>;
  createFlowAction(input: CreateFlowActionInput): Promise<FlowAction>;
  updateFlowActionStatus(id: string, input: UpdateFlowActionStatusInput): Promise<FlowAction>;

  createFlowBlocker(input: CreateFlowBlockerInput): Promise<FlowBlocker>;
  listFlowBlockers(flowId: string): Promise<FlowBlocker[]>;

  listFollowUps(): Promise<FollowUp[]>;
  createFollowUp(input: CreateFollowUpInput): Promise<FollowUp>;
  updateFollowUp(id: string, input: UpdateFollowUpInput): Promise<FollowUp>;

  getNextActionState(): Promise<NextActionStateRecord | null>;
  upsertNextActionState(state: NextActionStateRecord): Promise<NextActionStateRecord>;

  listDoctorSummaryItems(): Promise<DoctorSummaryItemRecord[]>;
  createDoctorSummaryItem(input: CreateDoctorSummaryItemInput): Promise<DoctorSummaryItemRecord>;
  listDoctorSummaryDrafts(): Promise<DoctorSummaryDraftRecord[]>;
  upsertDoctorSummaryDraft(input: UpsertDoctorSummaryDraftInput): Promise<DoctorSummaryDraftRecord>;

  listGuideResults(): Promise<GuideResult[]>;

  listActivityInsights(): Promise<import('../../types/activityInsights').ActivityInsight[]>;
  getActivityInsightStore(): Promise<ActivityInsightStore | null>;
  saveActivityInsightStore(store: ActivityInsightStore): Promise<ActivityInsightStore>;

  createRedFlagLog(input: CreateRedFlagLogInput): Promise<RedFlagLogRecord>;
  listRedFlagLogs(): Promise<RedFlagLogRecord[]>;

  getNotificationPreference(): Promise<NotificationPreference | null>;
  upsertNotificationPreference(preference: NotificationPreference): Promise<NotificationPreference>;

  getUserPreference(): Promise<UserPreference | null>;
  upsertUserPreference(preference: UserPreference): Promise<UserPreference>;

  createAgentEvent(input: CreateAgentEventInput): Promise<AgentEvent>;
  createAiUsageLog(input: CreateAiUsageLogInput): Promise<AiUsageLog>;
  createAiDecisionTrace(input: CreateAiDecisionTraceInput): Promise<AiDecisionTraceRecord>;

  createDataExportRequest(input: CreateDataExportRequestInput): Promise<DataExportRequest>;
  createDataDeletionRequest(input: CreateDataDeletionRequestInput): Promise<DataDeletionRequest>;
  deleteHealthFlow(flowId: string): Promise<{ flowId: string; status: string }>;
  deleteDoctorSummary(summaryId: string): Promise<{ summaryId: string; deletedKind: 'item' | 'draft' }>;
  deleteHealthProfile(): Promise<{ status: string }>;
  deleteAccountAndUserData(): Promise<{
    status: string;
    profileDeleted: boolean;
    authUserDeleted: boolean;
    failedTables?: string[];
  }>;

  createCareCircle(input: CreateCareCircleInput): Promise<CareCircle>;
  listCareCircles(): Promise<CareCircle[]>;
  createCareCircleInvite(input: CreateCareCircleInviteInput): Promise<CareCircleMember>;
  updateCareCircleMember(id: string, input: UpdateCareCircleMemberInput): Promise<CareCircleMember>;
}

export const DATA_ADAPTER_METHODS = [
  'getHealthProfile',
  'upsertHealthProfile',
  'listDailyCheckins',
  'createDailyCheckin',
  'listAskHistory',
  'createAskHistoryItem',
  'createAskIntakeSession',
  'getAskIntakeSession',
  'updateAskIntakeSession',
  'createGuideResult',
  'getGuideResult',
  'listHealthFlows',
  'getHealthFlow',
  'createDraftHealthFlow',
  'updateHealthFlowStatus',
  'listFlowActions',
  'createFlowAction',
  'updateFlowActionStatus',
  'createFlowBlocker',
  'listFlowBlockers',
  'listFollowUps',
  'createFollowUp',
  'updateFollowUp',
  'getNextActionState',
  'upsertNextActionState',
  'listDoctorSummaryItems',
  'createDoctorSummaryItem',
  'listDoctorSummaryDrafts',
  'upsertDoctorSummaryDraft',
  'listGuideResults',
  'listActivityInsights',
  'getActivityInsightStore',
  'saveActivityInsightStore',
  'createRedFlagLog',
  'listRedFlagLogs',
  'getNotificationPreference',
  'upsertNotificationPreference',
  'getUserPreference',
  'upsertUserPreference',
  'createAgentEvent',
  'createAiUsageLog',
  'createAiDecisionTrace',
  'createDataExportRequest',
  'createDataDeletionRequest',
  'deleteHealthFlow',
  'deleteDoctorSummary',
  'deleteHealthProfile',
  'deleteAccountAndUserData',
  'createCareCircle',
  'listCareCircles',
  'createCareCircleInvite',
  'updateCareCircleMember',
] as const satisfies readonly (keyof DataAdapter)[];
