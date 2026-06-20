import type { ActivityInsightStore } from '../../types/activityInsights';
import type { DoctorSummaryDraft, DoctorSummaryItem, RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import { getBrowserSupabaseClient } from '../supabase/browserClient';

export type SupabaseDataTable =
  | 'profiles'
  | 'consent_records'
  | 'health_profiles'
  | 'daily_checkins'
  | 'ask_history'
  | 'ask_intake_sessions'
  | 'guide_results'
  | 'health_flows'
  | 'flow_actions'
  | 'flow_blockers'
  | 'follow_ups'
  | 'next_action_state'
  | 'doctor_summary_items'
  | 'doctor_summary_drafts'
  | 'red_flag_logs'
  | 'activity_insights'
  | 'notification_preferences'
  | 'user_preferences'
  | 'agent_events'
  | 'ai_usage_logs'
  | 'ai_decision_traces'
  | 'data_export_requests'
  | 'data_deletion_requests'
  | 'care_circles'
  | 'care_circle_members'
  | 'care_circle_events';

export class SupabaseDataError extends Error {
  readonly code: 'not_configured' | 'not_authenticated' | 'query_failed';

  constructor(code: SupabaseDataError['code'], message: string) {
    super(message);
    this.name = 'SupabaseDataError';
    this.code = code;
  }
}

type PayloadRow = {
  id: string;
  user_id: string;
  payload: unknown;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
};

export function requireClient() {
  const client = getBrowserSupabaseClient();
  if (!client) {
    throw new SupabaseDataError('not_configured', 'Supabase is not configured.');
  }
  return client;
}

export async function getSupabaseUserId(): Promise<string | null> {
  const client = getBrowserSupabaseClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return data.user.id;
}

export async function requireSupabaseUserId(): Promise<string> {
  const userId = await getSupabaseUserId();
  if (!userId) {
    throw new SupabaseDataError('not_authenticated', 'Sign in to your Curavon account first.');
  }
  return userId;
}

export async function readSinglePayload<T>(
  table: SupabaseDataTable,
): Promise<T | null> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { data, error } = await client
    .from(table)
    .select('payload')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }

  return (data?.payload as T | undefined) ?? null;
}

export async function upsertSinglePayload<T>(
  table: SupabaseDataTable,
  payload: T,
  rowId?: string,
): Promise<void> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();
  const id = rowId ?? userId;

  const { error } = await client.from(table).upsert(
    {
      id,
      user_id: userId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }
}

export async function insertEventPayload<T extends Record<string, unknown>>(
  table: SupabaseDataTable,
  payload: T,
): Promise<void> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { error } = await client.from(table).insert({
    user_id: userId,
    payload,
  });

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }
}

export async function softDeleteUserRows(table: SupabaseDataTable): Promise<void> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { error } = await client
    .from(table)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }
}

export async function hardDeleteUserRows(table: SupabaseDataTable): Promise<void> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { error } = await client.from(table).delete().eq('user_id', userId);
  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }
}

export async function readPayloadList<T>(table: SupabaseDataTable): Promise<T[]> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { data, error } = await client
    .from(table)
    .select('payload')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }

  return (data ?? [])
    .map((row: Pick<PayloadRow, 'payload'>) => row.payload as T)
    .filter(Boolean);
}

export async function readSupabaseHealthProfile(): Promise<HealthProfile | null> {
  return readSinglePayload<HealthProfile>('health_profiles');
}

export async function saveSupabaseHealthProfile(profile: HealthProfile): Promise<void> {
  await upsertSinglePayload('health_profiles', profile);
}

export async function readSupabaseDailyCheckins(): Promise<DailyCheckIn[]> {
  return readPayloadList<DailyCheckIn>('daily_checkins');
}

export async function saveSupabaseDailyCheckin(checkin: DailyCheckIn): Promise<void> {
  await upsertSinglePayload('daily_checkins', checkin, checkin.id);
}

export async function readSupabaseNextActionState(): Promise<NextActionState | null> {
  return readSinglePayload<NextActionState>('next_action_state');
}

export async function saveSupabaseNextActionState(state: NextActionState): Promise<void> {
  await upsertSinglePayload('next_action_state', state);
}

export async function readSupabaseDoctorSummaryItems(): Promise<DoctorSummaryItem[]> {
  return readPayloadList<DoctorSummaryItem>('doctor_summary_items');
}

export async function saveSupabaseDoctorSummaryItem(item: DoctorSummaryItem): Promise<void> {
  await upsertSinglePayload('doctor_summary_items', item, item.id);
}

export async function readSupabaseRedFlagLogs(): Promise<RedFlagLog[]> {
  return readPayloadList<RedFlagLog>('red_flag_logs');
}

export async function saveSupabaseRedFlagLog(log: RedFlagLog): Promise<void> {
  await upsertSinglePayload('red_flag_logs', log, log.id);
}

export async function readSupabaseActivityInsights(): Promise<ActivityInsightStore | null> {
  return readSinglePayload<ActivityInsightStore>('activity_insights');
}

export async function saveSupabaseActivityInsights(insights: ActivityInsightStore): Promise<void> {
  await upsertSinglePayload('activity_insights', insights);
}

export async function readSupabaseProfile(): Promise<{
  id: string;
  email: string | null;
  displayName: string | null;
} | null> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { data, error } = await client
    .from('profiles')
    .select('id, email, display_name')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }

  if (!data) return null;

  return {
    id: data.id,
    email: data.email ?? null,
    displayName: data.display_name ?? null,
  };
}

export async function upsertSupabaseProfile(input: {
  email?: string | null;
  displayName?: string | null;
}): Promise<{ id: string; email: string | null; displayName: string | null }> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { data, error } = await client
    .from('profiles')
    .upsert(
      {
        id: userId,
        email: input.email ?? null,
        display_name: input.displayName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    )
    .select('id, email, display_name')
    .single();

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }

  return {
    id: data.id,
    email: data.email ?? null,
    displayName: data.display_name ?? null,
  };
}

export async function readSupabaseAskHistory(): Promise<import('../../types/askIntake').AskHistoryEntry[]> {
  return readPayloadList('ask_history');
}

export async function saveSupabaseAskHistoryEntry(
  entry: import('../../types/askIntake').AskHistoryEntry,
): Promise<void> {
  await upsertSinglePayload('ask_history', entry, entry.id);
}

export async function readSupabaseGuideResults(): Promise<
  import('../../utils/guideResultStorage').GuideResultRecord[]
> {
  return readPayloadList('guide_results');
}

export async function saveSupabaseGuideResult(
  record: import('../../utils/guideResultStorage').GuideResultRecord,
): Promise<void> {
  const rowId = `${record.guideId}-${record.completedAt}`;
  await upsertSinglePayload('guide_results', record, rowId);
}

export async function readSupabaseFollowUps(): Promise<
  import('../followUp/followUpTypes').FollowUpRecord[]
> {
  return readPayloadList('follow_ups');
}

export async function saveSupabaseFollowUp(
  record: import('../followUp/followUpTypes').FollowUpRecord,
): Promise<void> {
  await upsertSinglePayload('follow_ups', record, record.id);
}

export async function readSupabaseDoctorSummaryDrafts(): Promise<DoctorSummaryDraft[]> {
  return readPayloadList<DoctorSummaryDraft>('doctor_summary_drafts');
}

export async function saveSupabaseDoctorSummaryDraft(draft: DoctorSummaryDraft): Promise<void> {
  await upsertSinglePayload('doctor_summary_drafts', draft, draft.id);
}

export async function readSupabaseUserPreferences(): Promise<Record<string, unknown> | null> {
  return readSinglePayload<Record<string, unknown>>('user_preferences');
}

export async function saveSupabaseUserPreferences(preferences: Record<string, unknown>): Promise<void> {
  await upsertSinglePayload('user_preferences', preferences);
}

export async function readSupabaseAiUsageLogs(): Promise<
  Array<{
    id: string;
    taskName: string;
    model?: string;
    status: string;
    estimatedTokens?: number;
    occurredAt: string;
    payload?: Record<string, unknown>;
  }>
> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { data, error } = await client
    .from('ai_usage_logs')
    .select('id, task_name, model, status, estimated_tokens, occurred_at, payload')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false });

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    taskName: row.task_name ?? '',
    model: row.model ?? undefined,
    status: row.status ?? 'unknown',
    estimatedTokens: row.estimated_tokens ?? undefined,
    occurredAt: row.occurred_at ?? new Date().toISOString(),
    payload: (row.payload as Record<string, unknown> | undefined) ?? undefined,
  }));
}

export async function appendSupabaseAiUsageLog(entry: {
  taskName: string;
  model?: string;
  status: string;
  estimatedTokens?: number;
  occurredAt?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { error } = await client.from('ai_usage_logs').insert({
    user_id: userId,
    task_name: entry.taskName,
    model: entry.model ?? null,
    status: entry.status,
    estimated_tokens: entry.estimatedTokens ?? null,
    occurred_at: entry.occurredAt ?? new Date().toISOString(),
    payload: entry.payload ?? {},
  });

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }
}

export async function readSupabaseAiDecisionTraces(): Promise<
  import('../ai/governance/aiObservabilityTypes').AIDecisionTrace[]
> {
  return readPayloadList('ai_decision_traces');
}

export async function appendSupabaseAiDecisionTrace(
  trace: import('../ai/governance/aiObservabilityTypes').AIDecisionTrace,
): Promise<void> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();

  const { error } = await client.from('ai_decision_traces').insert({
    user_id: userId,
    task_name: trace.task,
    decision_status: trace.allowed ? 'allowed' : 'blocked',
    occurred_at: trace.timestamp,
    payload: trace as unknown as Record<string, unknown>,
  });

  if (error) {
    throw new SupabaseDataError('query_failed', error.message);
  }
}
