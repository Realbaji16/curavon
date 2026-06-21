import type { SupabaseDataTable } from './supabaseDataClient';
import {
  hardDeleteUserRows,
  requireClient,
  requireSupabaseUserId,
  SupabaseDataError,
} from './supabaseDataClient';

/**
 * Child tables before parents where cascade may not exist in older DBs.
 * Best-effort: one table failure must not block profile removal.
 */
export const ACCOUNT_PURGE_USER_ID_TABLES: SupabaseDataTable[] = [
  'flow_actions',
  'flow_blockers',
  'health_flows',
  'consent_records',
  'health_profiles',
  'daily_checkins',
  'ask_history',
  'ask_intake_sessions',
  'guide_results',
  'follow_ups',
  'next_action_state',
  'doctor_summary_items',
  'doctor_summary_drafts',
  'red_flag_logs',
  'activity_insights',
  'notification_preferences',
  'user_preferences',
  'agent_events',
  'ai_usage_logs',
  'ai_decision_traces',
  'data_export_requests',
  'data_deletion_requests',
];

export type AccountDataPurgeResult = {
  profileDeleted: boolean;
  tablesPurged: number;
  failedTables: string[];
};

async function tryDeleteUserTable(table: SupabaseDataTable): Promise<boolean> {
  try {
    await hardDeleteUserRows(table);
    return true;
  } catch {
    return false;
  }
}

export async function purgeSupabaseAccountData(): Promise<AccountDataPurgeResult> {
  const client = requireClient();
  const userId = await requireSupabaseUserId();
  const failedTables: string[] = [];
  let tablesPurged = 0;

  for (const table of ACCOUNT_PURGE_USER_ID_TABLES) {
    const deleted = await tryDeleteUserTable(table);
    if (deleted) {
      tablesPurged += 1;
    } else {
      failedTables.push(table);
    }
  }

  const { error: memberError } = await client
    .from('care_circle_members')
    .delete()
    .eq('member_user_id', userId);
  if (memberError) {
    failedTables.push('care_circle_members');
  } else {
    tablesPurged += 1;
  }

  const { error: circleError } = await client.from('care_circles').delete().eq('owner_id', userId);
  if (circleError) {
    failedTables.push('care_circles');
  } else {
    tablesPurged += 1;
  }

  const { error: profileError } = await client.from('profiles').delete().eq('id', userId);
  if (profileError) {
    throw new SupabaseDataError('query_failed', profileError.message);
  }

  return {
    profileDeleted: true,
    tablesPurged,
    failedTables,
  };
}
