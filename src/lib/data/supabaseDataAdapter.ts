import type { ActivityInsightStore } from '../../types/activityInsights';
import type { DoctorSummaryItem, RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';
import { getBrowserSupabaseClient } from '../supabase/browserClient';

export type SupabaseDataTable =
  | 'profiles'
  | 'consent_records'
  | 'health_profiles'
  | 'daily_checkins'
  | 'ask_history'
  | 'guide_results'
  | 'follow_ups'
  | 'next_action_state'
  | 'memory_snapshots'
  | 'doctor_summary_items'
  | 'doctor_summary_drafts'
  | 'red_flag_logs'
  | 'activity_insights'
  | 'ai_usage_logs'
  | 'ai_decision_traces'
  | 'user_preferences'
  | 'data_export_requests'
  | 'data_deletion_requests';

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

function requireClient() {
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

async function readPayloadList<T>(table: SupabaseDataTable): Promise<T[]> {
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
