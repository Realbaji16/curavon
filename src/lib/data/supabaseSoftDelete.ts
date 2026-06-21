import type { SupabaseDataTable } from './supabaseDataClient';

/** Tables that use `deleted_at` soft delete (profiles does not). */
export const SOFT_DELETE_TABLES = new Set<SupabaseDataTable>([
  'consent_records',
  'health_profiles',
  'daily_checkins',
  'ask_history',
  'ask_intake_sessions',
  'guide_results',
  'health_flows',
  'flow_actions',
  'flow_blockers',
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
  'care_circles',
  'care_circle_members',
  'care_circle_events',
]);

export type ReadQueryOptions = {
  /** Default false — normal app reads must hide soft-deleted rows. */
  includeDeleted?: boolean;
};

export type SoftDeleteQueryable = {
  is(column: string, value: null): SoftDeleteQueryable;
};

export function tableSupportsSoftDelete(table: SupabaseDataTable): boolean {
  return SOFT_DELETE_TABLES.has(table);
}

/** Apply default not-deleted filter for tables that support soft delete. */
export function applyNotDeleted<T extends SoftDeleteQueryable>(
  query: T,
  table: SupabaseDataTable,
  options?: ReadQueryOptions,
): T {
  if (options?.includeDeleted) return query;
  if (!tableSupportsSoftDelete(table)) return query;
  return query.is('deleted_at', null) as T;
}
