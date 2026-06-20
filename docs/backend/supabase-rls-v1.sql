-- =========================================================
-- Curavon Supabase RLS v1
-- Row Level Security policies only.
-- Safe to rerun.
-- Run after supabase-schema-v1.sql.
-- =========================================================

-- =========================================================
-- Enable Row Level Security
-- =========================================================

alter table public.profiles enable row level security;
alter table public.consent_records enable row level security;
alter table public.health_profiles enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.ask_history enable row level security;
alter table public.guide_results enable row level security;
alter table public.follow_ups enable row level security;
alter table public.next_action_state enable row level security;
alter table public.memory_snapshots enable row level security;
alter table public.doctor_summary_items enable row level security;
alter table public.doctor_summary_drafts enable row level security;
alter table public.red_flag_logs enable row level security;
alter table public.activity_insights enable row level security;
alter table public.ai_usage_logs enable row level security;
alter table public.ai_decision_traces enable row level security;
alter table public.user_preferences enable row level security;
alter table public.data_export_requests enable row level security;
alter table public.data_deletion_requests enable row level security;

-- =========================================================
-- Drop existing policies so this file can be rerun safely
-- =========================================================

drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_delete_own" on public.profiles;

drop policy if exists "consent_records_select_own" on public.consent_records;
drop policy if exists "consent_records_insert_own" on public.consent_records;
drop policy if exists "consent_records_update_own" on public.consent_records;
drop policy if exists "consent_records_delete_own" on public.consent_records;

drop policy if exists "health_profiles_select_own" on public.health_profiles;
drop policy if exists "health_profiles_insert_own" on public.health_profiles;
drop policy if exists "health_profiles_update_own" on public.health_profiles;
drop policy if exists "health_profiles_delete_own" on public.health_profiles;

drop policy if exists "daily_checkins_select_own" on public.daily_checkins;
drop policy if exists "daily_checkins_insert_own" on public.daily_checkins;
drop policy if exists "daily_checkins_update_own" on public.daily_checkins;
drop policy if exists "daily_checkins_delete_own" on public.daily_checkins;

drop policy if exists "ask_history_select_own" on public.ask_history;
drop policy if exists "ask_history_insert_own" on public.ask_history;
drop policy if exists "ask_history_update_own" on public.ask_history;
drop policy if exists "ask_history_delete_own" on public.ask_history;

drop policy if exists "guide_results_select_own" on public.guide_results;
drop policy if exists "guide_results_insert_own" on public.guide_results;
drop policy if exists "guide_results_update_own" on public.guide_results;
drop policy if exists "guide_results_delete_own" on public.guide_results;

drop policy if exists "follow_ups_select_own" on public.follow_ups;
drop policy if exists "follow_ups_insert_own" on public.follow_ups;
drop policy if exists "follow_ups_update_own" on public.follow_ups;
drop policy if exists "follow_ups_delete_own" on public.follow_ups;

drop policy if exists "next_action_state_select_own" on public.next_action_state;
drop policy if exists "next_action_state_insert_own" on public.next_action_state;
drop policy if exists "next_action_state_update_own" on public.next_action_state;
drop policy if exists "next_action_state_delete_own" on public.next_action_state;

drop policy if exists "memory_snapshots_select_own" on public.memory_snapshots;
drop policy if exists "memory_snapshots_insert_own" on public.memory_snapshots;
drop policy if exists "memory_snapshots_update_own" on public.memory_snapshots;
drop policy if exists "memory_snapshots_delete_own" on public.memory_snapshots;

drop policy if exists "doctor_summary_items_select_own" on public.doctor_summary_items;
drop policy if exists "doctor_summary_items_insert_own" on public.doctor_summary_items;
drop policy if exists "doctor_summary_items_update_own" on public.doctor_summary_items;
drop policy if exists "doctor_summary_items_delete_own" on public.doctor_summary_items;

drop policy if exists "doctor_summary_drafts_select_own" on public.doctor_summary_drafts;
drop policy if exists "doctor_summary_drafts_insert_own" on public.doctor_summary_drafts;
drop policy if exists "doctor_summary_drafts_update_own" on public.doctor_summary_drafts;
drop policy if exists "doctor_summary_drafts_delete_own" on public.doctor_summary_drafts;

drop policy if exists "red_flag_logs_select_own" on public.red_flag_logs;
drop policy if exists "red_flag_logs_insert_own" on public.red_flag_logs;
drop policy if exists "red_flag_logs_update_own" on public.red_flag_logs;
drop policy if exists "red_flag_logs_delete_own" on public.red_flag_logs;

drop policy if exists "activity_insights_select_own" on public.activity_insights;
drop policy if exists "activity_insights_insert_own" on public.activity_insights;
drop policy if exists "activity_insights_update_own" on public.activity_insights;
drop policy if exists "activity_insights_delete_own" on public.activity_insights;

drop policy if exists "ai_usage_logs_select_own" on public.ai_usage_logs;
drop policy if exists "ai_usage_logs_insert_own" on public.ai_usage_logs;
drop policy if exists "ai_usage_logs_update_own" on public.ai_usage_logs;
drop policy if exists "ai_usage_logs_delete_own" on public.ai_usage_logs;

drop policy if exists "ai_decision_traces_select_own" on public.ai_decision_traces;
drop policy if exists "ai_decision_traces_insert_own" on public.ai_decision_traces;
drop policy if exists "ai_decision_traces_update_own" on public.ai_decision_traces;
drop policy if exists "ai_decision_traces_delete_own" on public.ai_decision_traces;

drop policy if exists "user_preferences_select_own" on public.user_preferences;
drop policy if exists "user_preferences_insert_own" on public.user_preferences;
drop policy if exists "user_preferences_update_own" on public.user_preferences;
drop policy if exists "user_preferences_delete_own" on public.user_preferences;

drop policy if exists "data_export_requests_select_own" on public.data_export_requests;
drop policy if exists "data_export_requests_insert_own" on public.data_export_requests;
drop policy if exists "data_export_requests_update_own" on public.data_export_requests;
drop policy if exists "data_export_requests_delete_own" on public.data_export_requests;

drop policy if exists "data_deletion_requests_select_own" on public.data_deletion_requests;
drop policy if exists "data_deletion_requests_insert_own" on public.data_deletion_requests;
drop policy if exists "data_deletion_requests_update_own" on public.data_deletion_requests;
drop policy if exists "data_deletion_requests_delete_own" on public.data_deletion_requests;

-- =========================================================
-- profiles policies
-- =========================================================

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_delete_own"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

-- =========================================================
-- user_id table policies
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

create policy "guide_results_select_own" on public.guide_results for select to authenticated using (auth.uid() = user_id);
create policy "guide_results_insert_own" on public.guide_results for insert to authenticated with check (auth.uid() = user_id);
create policy "guide_results_update_own" on public.guide_results for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "guide_results_delete_own" on public.guide_results for delete to authenticated using (auth.uid() = user_id);

create policy "follow_ups_select_own" on public.follow_ups for select to authenticated using (auth.uid() = user_id);
create policy "follow_ups_insert_own" on public.follow_ups for insert to authenticated with check (auth.uid() = user_id);
create policy "follow_ups_update_own" on public.follow_ups for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "follow_ups_delete_own" on public.follow_ups for delete to authenticated using (auth.uid() = user_id);

create policy "next_action_state_select_own" on public.next_action_state for select to authenticated using (auth.uid() = user_id);
create policy "next_action_state_insert_own" on public.next_action_state for insert to authenticated with check (auth.uid() = user_id);
create policy "next_action_state_update_own" on public.next_action_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "next_action_state_delete_own" on public.next_action_state for delete to authenticated using (auth.uid() = user_id);

create policy "memory_snapshots_select_own" on public.memory_snapshots for select to authenticated using (auth.uid() = user_id);
create policy "memory_snapshots_insert_own" on public.memory_snapshots for insert to authenticated with check (auth.uid() = user_id);
create policy "memory_snapshots_update_own" on public.memory_snapshots for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "memory_snapshots_delete_own" on public.memory_snapshots for delete to authenticated using (auth.uid() = user_id);

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

create policy "ai_usage_logs_select_own" on public.ai_usage_logs for select to authenticated using (auth.uid() = user_id);
create policy "ai_usage_logs_insert_own" on public.ai_usage_logs for insert to authenticated with check (auth.uid() = user_id);
create policy "ai_usage_logs_update_own" on public.ai_usage_logs for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_usage_logs_delete_own" on public.ai_usage_logs for delete to authenticated using (auth.uid() = user_id);

create policy "ai_decision_traces_select_own" on public.ai_decision_traces for select to authenticated using (auth.uid() = user_id);
create policy "ai_decision_traces_insert_own" on public.ai_decision_traces for insert to authenticated with check (auth.uid() = user_id);
create policy "ai_decision_traces_update_own" on public.ai_decision_traces for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "ai_decision_traces_delete_own" on public.ai_decision_traces for delete to authenticated using (auth.uid() = user_id);

create policy "user_preferences_select_own" on public.user_preferences for select to authenticated using (auth.uid() = user_id);
create policy "user_preferences_insert_own" on public.user_preferences for insert to authenticated with check (auth.uid() = user_id);
create policy "user_preferences_update_own" on public.user_preferences for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "user_preferences_delete_own" on public.user_preferences for delete to authenticated using (auth.uid() = user_id);

create policy "data_export_requests_select_own" on public.data_export_requests for select to authenticated using (auth.uid() = user_id);
create policy "data_export_requests_insert_own" on public.data_export_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "data_export_requests_update_own" on public.data_export_requests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "data_export_requests_delete_own" on public.data_export_requests for delete to authenticated using (auth.uid() = user_id);

create policy "data_deletion_requests_select_own" on public.data_deletion_requests for select to authenticated using (auth.uid() = user_id);
create policy "data_deletion_requests_insert_own" on public.data_deletion_requests for insert to authenticated with check (auth.uid() = user_id);
create policy "data_deletion_requests_update_own" on public.data_deletion_requests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "data_deletion_requests_delete_own" on public.data_deletion_requests for delete to authenticated using (auth.uid() = user_id);