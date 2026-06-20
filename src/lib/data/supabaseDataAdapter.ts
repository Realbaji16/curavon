import type { DataAdapter } from './dataAdapter';
import {
  DataAuthError,
  DataPermissionError,
  DataUnavailableError,
  DataValidationError,
} from './dataErrors';
import type {
  AgentEvent,
  AskIntakeSession,
  CareCircle,
  CareCircleMember,
  DailyCheckin,
  DataDeletionRequest,
  DataExportRequest,
  FlowAction,
  FlowBlocker,
  GuideResult,
  HealthFlow,
  NotificationPreference,
} from './dataTypes';
import {
  readSinglePayload,
  readSupabaseActivityInsights,
  readSupabaseAskHistory,
  readSupabaseDailyCheckins,
  readSupabaseDoctorSummaryDrafts,
  readSupabaseDoctorSummaryItems,
  readSupabaseFollowUps,
  readSupabaseGuideResults,
  readSupabaseHealthProfile,
  readSupabaseNextActionState,
  readSupabaseRedFlagLogs,
  readSupabaseUserPreferences,
  requireClient,
  requireSupabaseUserId,
  appendSupabaseAiUsageLog,
  appendSupabaseAiDecisionTrace,
  saveSupabaseActivityInsights,
  saveSupabaseAskHistoryEntry,
  saveSupabaseDailyCheckin,
  saveSupabaseDoctorSummaryDraft,
  saveSupabaseDoctorSummaryItem,
  saveSupabaseFollowUp,
  saveSupabaseHealthProfile,
  saveSupabaseNextActionState,
  saveSupabaseRedFlagLog,
  SupabaseDataError,
  upsertSinglePayload,
} from './supabaseDataClient';

function newId(): string {
  return crypto.randomUUID();
}

function rethrowAsDataError(error: unknown): never {
  if (error instanceof DataAuthError || error instanceof DataValidationError) {
    throw error;
  }
  if (error instanceof SupabaseDataError) {
    if (error.code === 'not_authenticated') {
      throw new DataAuthError();
    }
    if (error.code === 'not_configured') {
      throw new DataUnavailableError();
    }
    if (/permission|policy|row-level security/i.test(error.message)) {
      throw new DataPermissionError();
    }
    throw new DataUnavailableError();
  }
  throw new DataUnavailableError();
}

async function runDataOp<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    rethrowAsDataError(error);
  }
}

function mapHealthFlowRow(row: Record<string, unknown>): HealthFlow {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    status: String(row.status ?? 'draft'),
    stage: String(row.stage ?? 'intake'),
    riskLevel: (row.risk_level as HealthFlow['riskLevel']) ?? 'low',
    privacyLevel: (row.privacy_level as HealthFlow['privacyLevel']) ?? 'private',
    moduleVersion: String(row.module_version ?? '1'),
    source: row.source ? String(row.source) : undefined,
    title: row.title ? String(row.title) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function mapAskIntakeSessionRow(row: Record<string, unknown>): AskIntakeSession {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    flowId: row.flow_id ? String(row.flow_id) : null,
    status: String(row.status ?? 'open'),
    stage: String(row.stage ?? 'intake'),
    riskLevel: (row.risk_level as AskIntakeSession['riskLevel']) ?? 'low',
    privacyLevel: (row.privacy_level as AskIntakeSession['privacyLevel']) ?? 'private',
    moduleVersion: String(row.module_version ?? '1'),
    source: row.source ? String(row.source) : undefined,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function mapFlowActionRow(row: Record<string, unknown>): FlowAction {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    flowId: String(row.flow_id),
    status: String(row.status ?? 'pending'),
    stage: String(row.stage ?? 'next_action'),
    riskLevel: (row.risk_level as FlowAction['riskLevel']) ?? 'low',
    privacyLevel: (row.privacy_level as FlowAction['privacyLevel']) ?? 'private',
    moduleVersion: String(row.module_version ?? '1'),
    actionOrder: Number(row.action_order ?? 0),
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function mapFlowBlockerRow(row: Record<string, unknown>): FlowBlocker {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    flowId: String(row.flow_id),
    status: String(row.status ?? 'active'),
    stage: String(row.stage ?? 'blocked'),
    riskLevel: (row.risk_level as FlowBlocker['riskLevel']) ?? 'low',
    privacyLevel: (row.privacy_level as FlowBlocker['privacyLevel']) ?? 'private',
    moduleVersion: String(row.module_version ?? '1'),
    blockerType: String(row.blocker_type ?? 'user_blocked'),
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function mapCareCircleRow(row: Record<string, unknown>): CareCircle {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name ?? 'Care Circle'),
    status: String(row.status ?? 'active'),
    sharingRules: (row.sharing_rules as Record<string, unknown>) ?? {},
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function mapCareCircleMemberRow(row: Record<string, unknown>): CareCircleMember {
  return {
    id: String(row.id),
    careCircleId: String(row.care_circle_id),
    ownerId: String(row.owner_id),
    memberUserId: row.member_user_id ? String(row.member_user_id) : null,
    inviteEmail: row.invite_email ? String(row.invite_email) : null,
    permissionLevel: String(row.permission_level ?? 'metadata_only'),
    sharingRules: (row.sharing_rules as Record<string, unknown>) ?? {},
    status: String(row.status ?? 'pending'),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at ? String(row.deleted_at) : null,
  };
}

function mapAgentEventRow(row: Record<string, unknown>, userId: string): AgentEvent {
  return {
    id: String(row.id),
    userId,
    flowId: row.flow_id ? String(row.flow_id) : null,
    eventType: String(row.event_type),
    source: String(row.source ?? 'app'),
    summary: row.summary ? String(row.summary) : null,
    status: String(row.status ?? 'recorded'),
    payload: (row.payload as Record<string, unknown>) ?? {},
    occurredAt: String(row.occurred_at ?? row.created_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDataExportRequestRow(row: Record<string, unknown>, userId: string): DataExportRequest {
  return {
    id: String(row.id),
    userId,
    requestStatus: String(row.request_status ?? 'requested'),
    requestedAt: String(row.requested_at ?? row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapDataDeletionRequestRow(row: Record<string, unknown>, userId: string): DataDeletionRequest {
  return {
    id: String(row.id),
    userId,
    requestStatus: String(row.request_status ?? 'requested'),
    deletionScope: row.deletion_scope ? String(row.deletion_scope) : null,
    requestedAt: String(row.requested_at ?? row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    payload: (row.payload as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

/** Supabase-only DataAdapter — requires authenticated user; never writes caller-supplied user_id. */
export function createSupabaseDataAdapter(): DataAdapter {
  return {
    getHealthProfile: () =>
      runDataOp(async () => readSupabaseHealthProfile()),

    upsertHealthProfile: (profile) =>
      runDataOp(async () => {
        await saveSupabaseHealthProfile(profile);
        return profile;
      }),

    listDailyCheckins: () => runDataOp(async () => readSupabaseDailyCheckins()),

    createDailyCheckin: (input) =>
      runDataOp(async () => {
        const checkin: DailyCheckin = {
          ...input,
          id: input.id ?? newId(),
          createdAt: new Date().toISOString(),
        };
        await saveSupabaseDailyCheckin(checkin);
        return checkin;
      }),

    listAskHistory: () => runDataOp(async () => readSupabaseAskHistory()),

    createAskHistoryItem: (input) =>
      runDataOp(async () => {
        await saveSupabaseAskHistoryEntry(input);
        return input;
      }),

    createAskIntakeSession: (input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('ask_intake_sessions')
          .insert({
            user_id: userId,
            flow_id: input.flowId ?? null,
            status: input.status ?? 'open',
            stage: input.stage ?? 'intake',
            risk_level: input.riskLevel ?? 'low',
            privacy_level: input.privacyLevel ?? 'private',
            module_version: input.moduleVersion ?? '1',
            payload: input.payload ?? {},
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapAskIntakeSessionRow(data as Record<string, unknown>);
      }),

    updateAskIntakeSession: (id, input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.flowId !== undefined) patch.flow_id = input.flowId;
        if (input.status !== undefined) patch.status = input.status;
        if (input.stage !== undefined) patch.stage = input.stage;
        if (input.riskLevel !== undefined) patch.risk_level = input.riskLevel;
        if (input.privacyLevel !== undefined) patch.privacy_level = input.privacyLevel;
        if (input.moduleVersion !== undefined) patch.module_version = input.moduleVersion;
        if (input.payload !== undefined) patch.payload = input.payload;

        const { data, error } = await client
          .from('ask_intake_sessions')
          .update(patch)
          .eq('id', id)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Update failed');
        return mapAskIntakeSessionRow(data as Record<string, unknown>);
      }),

    listGuideResults: () =>
      runDataOp(async () => {
        const userId = await requireSupabaseUserId();
        const records = await readSupabaseGuideResults();
        return records.map((record, index) => ({
          ...record,
          id: `${record.guideId}-${record.completedAt}-${index}`,
          userId,
        }));
      }),

    createGuideResult: (input) =>
      runDataOp(async () => {
        const userId = await requireSupabaseUserId();
        const rowId = newId();
        await upsertSinglePayload('guide_results', input, rowId);
        return { ...input, id: rowId, userId };
      }),

    getGuideResult: (id) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('guide_results')
          .select('id, payload')
          .eq('id', id)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .maybeSingle();
        if (error) throw new SupabaseDataError('query_failed', error.message);
        if (!data?.payload) return null;
        return {
          ...(data.payload as GuideResult),
          id: String(data.id),
          userId,
        };
      }),

    listHealthFlows: () =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('health_flows')
          .select('*')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw new SupabaseDataError('query_failed', error.message);
        return (data ?? []).map((row) => mapHealthFlowRow(row as Record<string, unknown>));
      }),

    getHealthFlow: (id) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('health_flows')
          .select('*')
          .eq('id', id)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .maybeSingle();
        if (error) throw new SupabaseDataError('query_failed', error.message);
        return data ? mapHealthFlowRow(data as Record<string, unknown>) : null;
      }),

    createDraftHealthFlow: (input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('health_flows')
          .insert({
            user_id: userId,
            status: 'draft',
            stage: input.stage ?? 'intake',
            risk_level: input.riskLevel ?? 'low',
            privacy_level: input.privacyLevel ?? 'private',
            module_version: input.moduleVersion ?? '1',
            title: input.title ?? null,
            payload: input.payload ?? {},
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapHealthFlowRow(data as Record<string, unknown>);
      }),

    updateHealthFlowStatus: (id, input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.status !== undefined) patch.status = input.status;
        if (input.stage !== undefined) patch.stage = input.stage;
        if (input.riskLevel !== undefined) patch.risk_level = input.riskLevel;
        if (input.privacyLevel !== undefined) patch.privacy_level = input.privacyLevel;
        if (input.title !== undefined) patch.title = input.title;
        if (input.payload !== undefined) patch.payload = input.payload;

        const { data, error } = await client
          .from('health_flows')
          .update(patch)
          .eq('id', id)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Update failed');
        return mapHealthFlowRow(data as Record<string, unknown>);
      }),

    listFlowActions: (flowId) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('flow_actions')
          .select('*')
          .eq('user_id', userId)
          .eq('flow_id', flowId)
          .is('deleted_at', null)
          .order('action_order', { ascending: true });
        if (error) throw new SupabaseDataError('query_failed', error.message);
        return (data ?? []).map((row) => mapFlowActionRow(row as Record<string, unknown>));
      }),

    createFlowAction: (input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('flow_actions')
          .insert({
            user_id: userId,
            flow_id: input.flowId,
            status: input.status ?? 'pending',
            stage: input.stage ?? 'next_action',
            risk_level: input.riskLevel ?? 'low',
            privacy_level: input.privacyLevel ?? 'private',
            module_version: input.moduleVersion ?? '1',
            action_order: input.actionOrder ?? 0,
            payload: input.payload ?? {},
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapFlowActionRow(data as Record<string, unknown>);
      }),

    updateFlowActionStatus: (id, input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.status !== undefined) patch.status = input.status;
        if (input.stage !== undefined) patch.stage = input.stage;
        if (input.riskLevel !== undefined) patch.risk_level = input.riskLevel;
        if (input.payload !== undefined) patch.payload = input.payload;

        const { data, error } = await client
          .from('flow_actions')
          .update(patch)
          .eq('id', id)
          .eq('user_id', userId)
          .is('deleted_at', null)
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Update failed');
        return mapFlowActionRow(data as Record<string, unknown>);
      }),

    createFlowBlocker: (input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('flow_blockers')
          .insert({
            user_id: userId,
            flow_id: input.flowId,
            status: input.status ?? 'active',
            stage: input.stage ?? 'blocked',
            risk_level: input.riskLevel ?? 'low',
            privacy_level: 'private',
            module_version: '1',
            blocker_type: input.blockerType ?? 'user_blocked',
            payload: input.payload ?? {},
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapFlowBlockerRow(data as Record<string, unknown>);
      }),

    listFlowBlockers: (flowId) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('flow_blockers')
          .select('*')
          .eq('user_id', userId)
          .eq('flow_id', flowId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw new SupabaseDataError('query_failed', error.message);
        return (data ?? []).map((row) => mapFlowBlockerRow(row as Record<string, unknown>));
      }),

    listFollowUps: () => runDataOp(async () => readSupabaseFollowUps()),

    createFollowUp: (input) =>
      runDataOp(async () => {
        await saveSupabaseFollowUp(input);
        return input;
      }),

    updateFollowUp: (id, input) =>
      runDataOp(async () => {
        const existing = (await readSupabaseFollowUps()).find((item) => item.id === id);
        if (!existing) throw new DataValidationError('Follow-up not found.');
        const next = { ...existing, ...input };
        await saveSupabaseFollowUp(next);
        return next;
      }),

    getNextActionState: () => runDataOp(async () => readSupabaseNextActionState()),

    upsertNextActionState: (state) =>
      runDataOp(async () => {
        await saveSupabaseNextActionState(state);
        return state;
      }),

    listDoctorSummaryItems: () => runDataOp(async () => readSupabaseDoctorSummaryItems()),

    createDoctorSummaryItem: (input) =>
      runDataOp(async () => {
        await saveSupabaseDoctorSummaryItem(input);
        return input;
      }),

    listDoctorSummaryDrafts: () => runDataOp(async () => readSupabaseDoctorSummaryDrafts()),

    upsertDoctorSummaryDraft: (input) =>
      runDataOp(async () => {
        await saveSupabaseDoctorSummaryDraft(input);
        return input;
      }),

    listActivityInsights: () =>
      runDataOp(async () => {
        const store = await readSupabaseActivityInsights();
        return store?.insights ?? [];
      }),

    getActivityInsightStore: () => runDataOp(async () => readSupabaseActivityInsights()),

    saveActivityInsightStore: (store) =>
      runDataOp(async () => {
        await saveSupabaseActivityInsights(store);
        return store;
      }),

    createRedFlagLog: (input) =>
      runDataOp(async () => {
        await saveSupabaseRedFlagLog(input);
        return input;
      }),

    listRedFlagLogs: () => runDataOp(async () => readSupabaseRedFlagLogs()),

    getNotificationPreference: () =>
      runDataOp(async () => readSinglePayload<NotificationPreference>('notification_preferences')),

    upsertNotificationPreference: (preference) =>
      runDataOp(async () => {
        await upsertSinglePayload('notification_preferences', preference);
        return preference;
      }),

    getUserPreference: () => runDataOp(async () => readSupabaseUserPreferences()),

    upsertUserPreference: (preference) =>
      runDataOp(async () => {
        await upsertSinglePayload('user_preferences', preference);
        return preference;
      }),

    createAgentEvent: (input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('agent_events')
          .insert({
            user_id: userId,
            flow_id: input.flowId ?? null,
            event_type: input.eventType,
            source: input.source ?? 'app',
            summary: input.summary ?? null,
            status: input.status ?? 'recorded',
            payload: input.payload ?? {},
            occurred_at: input.occurredAt ?? new Date().toISOString(),
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapAgentEventRow(data as Record<string, unknown>, userId);
      }),

    createAiUsageLog: (input) =>
      runDataOp(async () => {
        const userId = await requireSupabaseUserId();
        const occurredAt = input.occurredAt ?? new Date().toISOString();
        await appendSupabaseAiUsageLog({
          taskName: input.taskName,
          model: input.model,
          status: input.status,
          estimatedTokens: input.estimatedTokens,
          occurredAt,
          payload: input.payload ?? {},
        });
        return {
          id: newId(),
          userId,
          taskName: input.taskName,
          model: input.model,
          status: input.status,
          estimatedTokens: input.estimatedTokens,
          occurredAt,
          payload: input.payload,
        };
      }),

    createAiDecisionTrace: (input) =>
      runDataOp(async () => {
        const userId = await requireSupabaseUserId();
        await appendSupabaseAiDecisionTrace(input);
        return { ...input, userId } as import('./dataTypes').AiDecisionTraceRecord;
      }),

    createDataExportRequest: (input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('data_export_requests')
          .insert({
            user_id: userId,
            request_status: input.requestStatus ?? 'requested',
            payload: input.payload ?? {},
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapDataExportRequestRow(data as Record<string, unknown>, userId);
      }),

    createDataDeletionRequest: (input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('data_deletion_requests')
          .insert({
            user_id: userId,
            request_status: input.requestStatus ?? 'requested',
            deletion_scope: input.deletionScope ?? null,
            payload: input.payload ?? {},
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapDataDeletionRequestRow(data as Record<string, unknown>, userId);
      }),

    createCareCircle: (input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('care_circles')
          .insert({
            owner_id: userId,
            name: input.name ?? 'Care Circle',
            status: 'active',
            sharing_rules: input.sharingRules ?? {},
            payload: input.payload ?? {},
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapCareCircleRow(data as Record<string, unknown>);
      }),

    listCareCircles: () =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('care_circles')
          .select('*')
          .eq('owner_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });
        if (error) throw new SupabaseDataError('query_failed', error.message);
        return (data ?? []).map((row) => mapCareCircleRow(row as Record<string, unknown>));
      }),

    createCareCircleInvite: (input) =>
      runDataOp(async () => {
        if (!input.inviteEmail && !input.memberUserId) {
          throw new DataValidationError('Invite requires memberUserId or inviteEmail.');
        }
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const { data, error } = await client
          .from('care_circle_members')
          .insert({
            care_circle_id: input.careCircleId,
            owner_id: userId,
            member_user_id: input.memberUserId ?? null,
            invite_email: input.inviteEmail ?? null,
            permission_level: input.permissionLevel ?? 'metadata_only',
            sharing_rules: input.sharingRules ?? {},
            status: 'pending',
          })
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Insert failed');
        return mapCareCircleMemberRow(data as Record<string, unknown>);
      }),

    updateCareCircleMember: (id, input) =>
      runDataOp(async () => {
        const client = requireClient();
        const userId = await requireSupabaseUserId();
        const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (input.permissionLevel !== undefined) patch.permission_level = input.permissionLevel;
        if (input.sharingRules !== undefined) patch.sharing_rules = input.sharingRules;
        if (input.status !== undefined) patch.status = input.status;
        if (input.memberUserId !== undefined) patch.member_user_id = input.memberUserId;
        if (input.inviteEmail !== undefined) patch.invite_email = input.inviteEmail;

        const { data, error } = await client
          .from('care_circle_members')
          .update(patch)
          .eq('id', id)
          .eq('owner_id', userId)
          .is('deleted_at', null)
          .select('*')
          .single();
        if (error || !data) throw new SupabaseDataError('query_failed', error?.message ?? 'Update failed');
        return mapCareCircleMemberRow(data as Record<string, unknown>);
      }),
  };
}
