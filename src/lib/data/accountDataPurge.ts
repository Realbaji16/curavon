import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseDataTable } from './supabaseDataClient';
import {
  hardDeleteUserRows,
  requireClient,
  requireSupabaseUserId,
  SupabaseDataError,
} from './supabaseDataClient';

/**
 * Child tables before parents where cascade may not exist in older DBs.
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

async function deleteUserTableAdmin(
  client: SupabaseClient,
  userId: string,
  table: SupabaseDataTable,
): Promise<void> {
  const { error } = await client.from(table).delete().eq('user_id', userId);
  if (error) {
    throw new SupabaseDataError('query_failed', `${table}: ${error.message}`);
  }
}

async function purgeCareCircleData(
  client: SupabaseClient,
  userId: string,
  onError: (table: string) => void,
): Promise<number> {
  let purged = 0;

  const { error: actorEventsError } = await client
    .from('care_circle_events')
    .delete()
    .eq('actor_user_id', userId);
  if (actorEventsError) {
    onError('care_circle_events');
  } else {
    purged += 1;
  }

  const { error: memberError } = await client
    .from('care_circle_members')
    .delete()
    .eq('member_user_id', userId);
  if (memberError) {
    onError('care_circle_members');
  } else {
    purged += 1;
  }

  const { error: ownedMembersError } = await client
    .from('care_circle_members')
    .delete()
    .eq('owner_id', userId);
  if (ownedMembersError) {
    onError('care_circle_members_owner');
  } else {
    purged += 1;
  }

  const { error: circleError } = await client.from('care_circles').delete().eq('owner_id', userId);
  if (circleError) {
    onError('care_circles');
  } else {
    purged += 1;
  }

  return purged;
}

/** Server-only purge using service role — bypasses RLS for reliable account deletion. */
export async function purgeSupabaseAccountDataForUser(
  adminClient: SupabaseClient,
  userId: string,
): Promise<AccountDataPurgeResult> {
  const failedTables: string[] = [];
  let tablesPurged = 0;

  for (const table of ACCOUNT_PURGE_USER_ID_TABLES) {
    try {
      await deleteUserTableAdmin(adminClient, userId, table);
      tablesPurged += 1;
    } catch {
      failedTables.push(table);
    }
  }

  tablesPurged += await purgeCareCircleData(adminClient, userId, (table) => {
    failedTables.push(table);
  });

  const { error: profileError } = await adminClient.from('profiles').delete().eq('id', userId);
  if (profileError) {
    throw new SupabaseDataError('query_failed', profileError.message);
  }

  if (failedTables.length > 0) {
    throw new SupabaseDataError(
      'query_failed',
      `Could not delete all account data (${failedTables.join(', ')}).`,
    );
  }

  return {
    profileDeleted: true,
    tablesPurged,
    failedTables,
  };
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

  tablesPurged += await purgeCareCircleData(client, userId, (table) => {
    failedTables.push(table);
  });

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
