-- Curavon / Healthy.Ai — Row Level Security policies
-- Migration: 20250618100002
-- No public anon access. Care Circle is permission-first; no health content sharing yet.

-- =========================================================
-- Enable RLS on all application tables
-- =========================================================

alter table public.profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.health_profiles enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.ask_history enable row level security;
alter table public.ask_intake_sessions enable row level security;
alter table public.guide_results enable row level security;
alter table public.health_flows enable row level security;
alter table public.flow_actions enable row level security;
alter table public.flow_blockers enable row level security;
alter table public.follow_ups enable row level security;
alter table public.next_action_state enable row level security;
alter table public.doctor_summary_items enable row level security;
alter table public.doctor_summary_drafts enable row level security;
alter table public.red_flag_logs enable row level security;
alter table public.activity_insights enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_preferences enable row level security;
alter table public.agent_events enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_decision_traces enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.data_deletion_requests enable row level security;
alter table public.care_circles enable row level security;
alter table public.care_circle_members enable row level security;
alter table public.care_circle_events enable row level security;

-- =========================================================
-- Drop existing policies (idempotent reruns)
-- =========================================================

do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles', 'consent_records', 'health_profiles', 'daily_checkins',
        'ask_history', 'ask_intake_sessions', 'guide_results', 'health_flows',
        'flow_actions', 'flow_blockers', 'follow_ups', 'next_action_state',
        'doctor_summary_items', 'doctor_summary_drafts', 'red_flag_logs',
        'activity_insights', 'notification_preferences', 'user_preferences',
        'agent_events', 'ai_usage_logs', 'ai_decision_traces',
        'data_export_requests', 'data_deletion_requests',
        'care_circles', 'care_circle_members', 'care_circle_events'
      )
  loop
    execute format('drop policy if exists %I on public.%I', rec.policyname, rec.tablename);
  end loop;
end $$;

-- =========================================================
-- profiles (auth.uid() = id)
-- =========================================================

create policy "profiles_select_own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "profiles_delete_own" on public.profiles for delete to authenticated using (auth.uid() = id);

-- =========================================================
-- user_id-owned tables (auth.uid() = user_id)
-- =========================================================

create policy "consent_records_select_own" on public.consent_records for select to authenticated using (auth.uid() = user_id);
create policy "consent_records_insert_own" on public.consent_records for insert to authenticated with check (auth.uid() = user_id);
create policy "consent_records_update_own" on public.consent_records for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "consent_records_delete_own" on public.consent_records for delete to authenticated using (auth.uid() = user_id);

create policy "health_profiles_select_own" on public.health_profiles for select to authenticated using (auth.uid() = user_id);
create policy "health_profiles_insert_own" on public.health_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "health_profiles_update_own" on public.health_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_profiles_delete_own" on public.health_profiles for delete to authenticated using (auth.uid() = user_id);

create policy "daily_checkins_select_own" on public.daily_checkins for select to authenticated using (auth.uid() = user_id);
create policy "daily_checkins_insert_own" on public.daily_checkins for insert to authenticated with check (auth.uid() = user_id);
create policy "daily_checkins_update_own" on public.daily_checkins for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "daily_checkins_delete_own" on public.daily_checkins for delete to authenticated using (auth.uid() = user_id);

create policy "ask_history_select_own" on public.ask_history for select to authenticated using (auth.uid() = user_id);
create policy "ask_history_insert_own" on public.ask_history for insert to authenticated with check (auth.uid() = user_id);
create policy "ask_history_update_own" on public.ask_history for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ask_history_delete_own" on public.ask_history for delete to authenticated using (auth.uid() = user_id);

create policy "ask_intake_sessions_select_own" on public.ask_intake_sessions for select to authenticated using (auth.uid() = user_id);
create policy "ask_intake_sessions_insert_own" on public.ask_intake_sessions for insert to authenticated with check (auth.uid() = user_id);
create policy "ask_intake_sessions_update_own" on public.ask_intake_sessions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ask_intake_sessions_delete_own" on public.ask_intake_sessions for delete to authenticated using (auth.uid() = user_id);

create policy "guide_results_select_own" on public.guide_results for select to authenticated using (auth.uid() = user_id);
create policy "guide_results_insert_own" on public.guide_results for insert to authenticated with check (auth.uid() = user_id);
create policy "guide_results_update_own" on public.guide_results for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "guide_results_delete_own" on public.guide_results for delete to authenticated using (auth.uid() = user_id);

create policy "health_flows_select_own" on public.health_flows for select to authenticated using (auth.uid() = user_id);
create policy "health_flows_insert_own" on public.health_flows for insert to authenticated with check (auth.uid() = user_id);
create policy "health_flows_update_own" on public.health_flows for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "health_flows_delete_own" on public.health_flows for delete to authenticated using (auth.uid() = user_id);

create policy "flow_actions_select_own" on public.flow_actions for select to authenticated using (auth.uid() = user_id);
create policy "flow_actions_insert_own" on public.flow_actions for insert to authenticated with check (auth.uid() = user_id);
create policy "flow_actions_update_own" on public.flow_actions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flow_actions_delete_own" on public.flow_actions for delete to authenticated using (auth.uid() = user_id);

create policy "flow_blockers_select_own" on public.flow_blockers for select to authenticated using (auth.uid() = user_id);
create policy "flow_blockers_insert_own" on public.flow_blockers for insert to authenticated with check (auth.uid() = user_id);
create policy "flow_blockers_update_own" on public.flow_blockers for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "flow_blockers_delete_own" on public.flow_blockers for delete to authenticated using (auth.uid() = user_id);

create policy "follow_ups_select_own" on public.follow_ups for select to authenticated using (auth.uid() = user_id);
create policy "follow_ups_insert_own" on public.follow_ups for insert to authenticated with check (auth.uid() = user_id);
create policy "follow_ups_update_own" on public.follow_ups for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "follow_ups_delete_own" on public.follow_ups for delete to authenticated using (auth.uid() = user_id);

create policy "next_action_state_select_own" on public.next_action_state for select to authenticated using (auth.uid() = user_id);
create policy "next_action_state_insert_own" on public.next_action_state for insert to authenticated with check (auth.uid() = user_id);
create policy "next_action_state_update_own" on public.next_action_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "next_action_state_delete_own" on public.next_action_state for delete to authenticated using (auth.uid() = user_id);

create policy "doctor_summary_items_select_own" on public.doctor_summary_items for select to authenticated using (auth.uid() = user_id);
create policy "doctor_summary_items_insert_own" on public.doctor_summary_items for insert to authenticated with check (auth.uid() = user_id);
create policy "doctor_summary_items_update_own" on public.doctor_summary_items for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "doctor_summary_items_delete_own" on public.doctor_summary_items for delete to authenticated using (auth.uid() = user_id);

create policy "doctor_summary_drafts_select_own" on public.doctor_summary_drafts for select to authenticated using (auth.uid() = user_id);
create policy "doctor_summary_drafts_insert_own" on public.doctor_summary_drafts for insert to authenticated with check (auth.uid() = user_id);
create policy "doctor_summary_drafts_update_own" on public.doctor_summary_drafts for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "doctor_summary_drafts_delete_own" on public.doctor_summary_drafts for delete to authenticated using (auth.uid() = user_id);

create policy "red_flag_logs_select_own" on public.red_flag_logs for select to authenticated using (auth.uid() = user_id);
create policy "red_flag_logs_insert_own" on public.red_flag_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "red_flag_logs_update_own" on public.red_flag_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "red_flag_logs_delete_own" on public.red_flag_logs for delete to authenticated using (auth.uid() = user_id);

create policy "activity_insights_select_own" on public.activity_insights for select to authenticated using (auth.uid() = user_id);
create policy "activity_insights_insert_own" on public.activity_insights for insert to authenticated with check (auth.uid() = user_id);
create policy "activity_insights_update_own" on public.activity_insights for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "activity_insights_delete_own" on public.activity_insights for delete to authenticated using (auth.uid() = user_id);

create policy "notification_preferences_select_own" on public.notification_preferences for select to authenticated using (auth.uid() = user_id);
create policy "notification_preferences_insert_own" on public.notification_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy "notification_preferences_update_own" on public.notification_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notification_preferences_delete_own" on public.notification_preferences for delete to authenticated using (auth.uid() = user_id);

create policy "user_preferences_select_own" on public.user_preferences for select to authenticated using (auth.uid() = user_id);
create policy "user_preferences_insert_own" on public.user_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy "user_preferences_update_own" on public.user_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_preferences_delete_own" on public.user_preferences for delete to authenticated using (auth.uid() = user_id);

create policy "agent_events_select_own" on public.agent_events for select to authenticated using (auth.uid() = user_id);
create policy "agent_events_insert_own" on public.agent_events for insert to authenticated with check (auth.uid() = user_id);
create policy "agent_events_update_own" on public.agent_events for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "agent_events_delete_own" on public.agent_events for delete to authenticated using (auth.uid() = user_id);

create policy "ai_usage_logs_select_own" on public.ai_usage_logs for select to authenticated using (auth.uid() = user_id);
create policy "ai_usage_logs_insert_own" on public.ai_usage_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "ai_usage_logs_update_own" on public.ai_usage_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_usage_logs_delete_own" on public.ai_usage_logs for delete to authenticated using (auth.uid() = user_id);

create policy "ai_decision_traces_select_own" on public.ai_decision_traces for select to authenticated using (auth.uid() = user_id);
create policy "ai_decision_traces_insert_own" on public.ai_decision_traces for insert to authenticated with check (auth.uid() = user_id);
create policy "ai_decision_traces_update_own" on public.ai_decision_traces for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_decision_traces_delete_own" on public.ai_decision_traces for delete to authenticated using (auth.uid() = user_id);

create policy "data_export_requests_select_own" on public.data_export_requests for select to authenticated using (auth.uid() = user_id);
create policy "data_export_requests_insert_own" on public.data_export_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "data_export_requests_update_own" on public.data_export_requests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "data_export_requests_delete_own" on public.data_export_requests for delete to authenticated using (auth.uid() = user_id);

create policy "data_deletion_requests_select_own" on public.data_deletion_requests for select to authenticated using (auth.uid() = user_id);
create policy "data_deletion_requests_insert_own" on public.data_deletion_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "data_deletion_requests_update_own" on public.data_deletion_requests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "data_deletion_requests_delete_own" on public.data_deletion_requests for delete to authenticated using (auth.uid() = user_id);

-- =========================================================
-- Care Circle — permission-first; no health-flow/summary access
-- =========================================================

create policy "care_circles_select_owner" on public.care_circles for select to authenticated using (auth.uid() = owner_id);
create policy "care_circles_insert_owner" on public.care_circles for insert to authenticated with check (auth.uid() = owner_id);
create policy "care_circles_update_owner" on public.care_circles for update to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "care_circles_delete_owner" on public.care_circles for delete to authenticated using (auth.uid() = owner_id);

-- Members: owner manages; members see only their own membership row.
create policy "care_circle_members_select_own_or_owner" on public.care_circle_members
  for select to authenticated
  using (auth.uid() = member_user_id or auth.uid() = owner_id);

create policy "care_circle_members_insert_owner" on public.care_circle_members
  for insert to authenticated
  with check (auth.uid() = owner_id);

create policy "care_circle_members_update_owner" on public.care_circle_members
  for update to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "care_circle_members_delete_owner" on public.care_circle_members
  for delete to authenticated
  using (auth.uid() = owner_id);

-- Events: owner and actor only — no member visibility of circle activity yet.
create policy "care_circle_events_select_owner_or_actor" on public.care_circle_events
  for select to authenticated
  using (
    auth.uid() = actor_user_id
    or exists (
      select 1 from public.care_circles c
      where c.id = care_circle_id and c.owner_id = auth.uid()
    )
  );

create policy "care_circle_events_insert_owner_actor" on public.care_circle_events
  for insert to authenticated
  with check (
    auth.uid() = actor_user_id
    and exists (
      select 1 from public.care_circles c
      where c.id = care_circle_id and c.owner_id = auth.uid()
    )
  );

create policy "care_circle_events_update_owner_or_actor" on public.care_circle_events
  for update to authenticated
  using (
    auth.uid() = actor_user_id
    or exists (
      select 1 from public.care_circles c
      where c.id = care_circle_id and c.owner_id = auth.uid()
    )
  )
  with check (
    auth.uid() = actor_user_id
    or exists (
      select 1 from public.care_circles c
      where c.id = care_circle_id and c.owner_id = auth.uid()
    )
  );

create policy "care_circle_events_delete_owner" on public.care_circle_events
  for delete to authenticated
  using (
    exists (
      select 1 from public.care_circles c
      where c.id = care_circle_id and c.owner_id = auth.uid()
    )
  );
