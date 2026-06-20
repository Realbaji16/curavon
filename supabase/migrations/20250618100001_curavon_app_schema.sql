-- Curavon / Healthy.Ai — application schema (Supabase-only persistence)
-- Migration: 20250618100001
-- Source: docs/backend/supabase-schema-v1.sql + pilot flow/care-circle entities

-- =========================================================
-- profiles (id = auth.users.id)
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- =========================================================
-- consent_records
-- =========================================================

create table if not exists public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text,
  accepted boolean not null default true,
  accepted_at timestamptz not null default now(),
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_consent_records_updated_at on public.consent_records;
create trigger set_consent_records_updated_at
before update on public.consent_records
for each row execute function public.set_updated_at();

-- =========================================================
-- health_profiles
-- =========================================================

create table if not exists public.health_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint health_profiles_one_per_user unique (user_id)
);

drop trigger if exists set_health_profiles_updated_at on public.health_profiles;
create trigger set_health_profiles_updated_at
before update on public.health_profiles
for each row execute function public.set_updated_at();

-- =========================================================
-- daily_checkins
-- =========================================================

create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  source text default 'today_checkin',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_daily_checkins_updated_at on public.daily_checkins;
create trigger set_daily_checkins_updated_at
before update on public.daily_checkins
for each row execute function public.set_updated_at();

-- =========================================================
-- ask_history (bounded payloads — no raw AI prompts/responses)
-- =========================================================

create table if not exists public.ask_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  source text default 'ask_curavon',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_ask_history_updated_at on public.ask_history;
create trigger set_ask_history_updated_at
before update on public.ask_history
for each row execute function public.set_updated_at();

-- =========================================================
-- ask_intake_sessions
-- =========================================================

create table if not exists public.ask_intake_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid,
  status text not null default 'open',
  stage text not null default 'intake',
  risk_level text not null default 'low',
  privacy_level text not null default 'private',
  module_version text not null default '1',
  source text default 'ask_curavon',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_ask_intake_sessions_updated_at on public.ask_intake_sessions;
create trigger set_ask_intake_sessions_updated_at
before update on public.ask_intake_sessions
for each row execute function public.set_updated_at();

-- =========================================================
-- guide_results
-- =========================================================

create table if not exists public.guide_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  guide_id text,
  guide_title text,
  occurred_at timestamptz not null default now(),
  source text default 'guides',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_guide_results_updated_at on public.guide_results;
create trigger set_guide_results_updated_at
before update on public.guide_results
for each row execute function public.set_updated_at();

-- =========================================================
-- health_flows
-- =========================================================

create table if not exists public.health_flows (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'draft',
  stage text not null default 'intake',
  risk_level text not null default 'low',
  privacy_level text not null default 'private',
  module_version text not null default '1',
  source text default 'ask_curavon',
  title text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_health_flows_updated_at on public.health_flows;
create trigger set_health_flows_updated_at
before update on public.health_flows
for each row execute function public.set_updated_at();

alter table public.ask_intake_sessions
  drop constraint if exists ask_intake_sessions_flow_id_fkey;

alter table public.ask_intake_sessions
  add constraint ask_intake_sessions_flow_id_fkey
  foreign key (flow_id) references public.health_flows(id) on delete set null;

-- =========================================================
-- flow_actions
-- =========================================================

create table if not exists public.flow_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid not null references public.health_flows(id) on delete cascade,
  status text not null default 'pending',
  stage text not null default 'next_action',
  risk_level text not null default 'low',
  privacy_level text not null default 'private',
  module_version text not null default '1',
  action_order integer not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_flow_actions_updated_at on public.flow_actions;
create trigger set_flow_actions_updated_at
before update on public.flow_actions
for each row execute function public.set_updated_at();

-- =========================================================
-- flow_blockers
-- =========================================================

create table if not exists public.flow_blockers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid not null references public.health_flows(id) on delete cascade,
  status text not null default 'active',
  stage text not null default 'blocked',
  risk_level text not null default 'low',
  privacy_level text not null default 'private',
  module_version text not null default '1',
  blocker_type text not null default 'user_blocked',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_flow_blockers_updated_at on public.flow_blockers;
create trigger set_flow_blockers_updated_at
before update on public.flow_blockers
for each row execute function public.set_updated_at();

-- =========================================================
-- follow_ups
-- =========================================================

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid references public.health_flows(id) on delete set null,
  action_id text,
  due_at timestamptz,
  status text not null default 'pending',
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_follow_ups_updated_at on public.follow_ups;
create trigger set_follow_ups_updated_at
before update on public.follow_ups
for each row execute function public.set_updated_at();

-- =========================================================
-- next_action_state
-- =========================================================

create table if not exists public.next_action_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid references public.health_flows(id) on delete set null,
  status text not null default 'pending',
  stage text not null default 'next_action',
  risk_level text not null default 'low',
  privacy_level text not null default 'private',
  module_version text not null default '1',
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint next_action_state_one_per_user unique (user_id)
);

drop trigger if exists set_next_action_state_updated_at on public.next_action_state;
create trigger set_next_action_state_updated_at
before update on public.next_action_state
for each row execute function public.set_updated_at();

-- =========================================================
-- doctor_summary_items / drafts
-- =========================================================

create table if not exists public.doctor_summary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid references public.health_flows(id) on delete set null,
  item_type text,
  included_in_summary boolean not null default true,
  occurred_at timestamptz not null default now(),
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_doctor_summary_items_updated_at on public.doctor_summary_items;
create trigger set_doctor_summary_items_updated_at
before update on public.doctor_summary_items
for each row execute function public.set_updated_at();

create table if not exists public.doctor_summary_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_status text not null default 'draft',
  date_range text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_doctor_summary_drafts_updated_at on public.doctor_summary_drafts;
create trigger set_doctor_summary_drafts_updated_at
before update on public.doctor_summary_drafts
for each row execute function public.set_updated_at();

-- =========================================================
-- red_flag_logs (bounded — avoid unnecessary raw text)
-- =========================================================

create table if not exists public.red_flag_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid references public.health_flows(id) on delete set null,
  source text,
  safety_level text not null default 'urgent',
  risk_level text not null default 'urgent',
  matched_labels text[] not null default array[]::text[],
  self_harm boolean not null default false,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_red_flag_logs_updated_at on public.red_flag_logs;
create trigger set_red_flag_logs_updated_at
before update on public.red_flag_logs
for each row execute function public.set_updated_at();

-- =========================================================
-- activity_insights (safe cards only)
-- =========================================================

create table if not exists public.activity_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_type text,
  source text not null default 'rules',
  safety_label text not null default 'not_medical',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_activity_insights_updated_at on public.activity_insights;
create trigger set_activity_insights_updated_at
before update on public.activity_insights
for each row execute function public.set_updated_at();

-- =========================================================
-- notification_preferences
-- =========================================================

create table if not exists public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint notification_preferences_one_per_user unique (user_id)
);

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

-- =========================================================
-- user_preferences
-- =========================================================

create table if not exists public.user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint user_preferences_one_per_user unique (user_id)
);

drop trigger if exists set_user_preferences_updated_at on public.user_preferences;
create trigger set_user_preferences_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

-- =========================================================
-- agent_events (metadata/summary only — no raw health text by default)
-- =========================================================

create table if not exists public.agent_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_id uuid references public.health_flows(id) on delete set null,
  event_type text not null,
  source text not null default 'app',
  summary text,
  status text not null default 'recorded',
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_agent_events_updated_at on public.agent_events;
create trigger set_agent_events_updated_at
before update on public.agent_events
for each row execute function public.set_updated_at();

-- =========================================================
-- ai_usage_logs / ai_decision_traces (audit metadata only)
-- =========================================================

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_name text,
  model text,
  status text,
  estimated_tokens integer,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_ai_usage_logs_updated_at on public.ai_usage_logs;
create trigger set_ai_usage_logs_updated_at
before update on public.ai_usage_logs
for each row execute function public.set_updated_at();

create table if not exists public.ai_decision_traces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_name text,
  decision_status text,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_ai_decision_traces_updated_at on public.ai_decision_traces;
create trigger set_ai_decision_traces_updated_at
before update on public.ai_decision_traces
for each row execute function public.set_updated_at();

-- =========================================================
-- data_export_requests / data_deletion_requests
-- =========================================================

create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_status text not null default 'requested',
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_data_export_requests_updated_at on public.data_export_requests;
create trigger set_data_export_requests_updated_at
before update on public.data_export_requests
for each row execute function public.set_updated_at();

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_status text not null default 'requested',
  deletion_scope text,
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_data_deletion_requests_updated_at on public.data_deletion_requests;
create trigger set_data_deletion_requests_updated_at
before update on public.data_deletion_requests
for each row execute function public.set_updated_at();

-- =========================================================
-- care_circles (permission-first — no health content)
-- =========================================================

create table if not exists public.care_circles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Care Circle',
  status text not null default 'active',
  sharing_rules jsonb not null default '{}'::jsonb,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_care_circles_updated_at on public.care_circles;
create trigger set_care_circles_updated_at
before update on public.care_circles
for each row execute function public.set_updated_at();

create table if not exists public.care_circle_members (
  id uuid primary key default gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  invite_email text,
  permission_level text not null default 'metadata_only',
  sharing_rules jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint care_circle_members_member_or_invite check (
    member_user_id is not null or invite_email is not null
  )
);

drop trigger if exists set_care_circle_members_updated_at on public.care_circle_members;
create trigger set_care_circle_members_updated_at
before update on public.care_circle_members
for each row execute function public.set_updated_at();

create table if not exists public.care_circle_events (
  id uuid primary key default gen_random_uuid(),
  care_circle_id uuid not null references public.care_circles(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  summary text,
  status text not null default 'recorded',
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_care_circle_events_updated_at on public.care_circle_events;
create trigger set_care_circle_events_updated_at
before update on public.care_circle_events
for each row execute function public.set_updated_at();

-- =========================================================
-- Indexes
-- =========================================================

create index if not exists idx_consent_records_user_id on public.consent_records(user_id);
create index if not exists idx_health_profiles_user_id on public.health_profiles(user_id);
create index if not exists idx_daily_checkins_user_id_occurred_at on public.daily_checkins(user_id, occurred_at desc);
create index if not exists idx_ask_history_user_id_occurred_at on public.ask_history(user_id, occurred_at desc);
create index if not exists idx_ask_intake_sessions_user_id_created_at on public.ask_intake_sessions(user_id, created_at desc);
create index if not exists idx_ask_intake_sessions_flow_id on public.ask_intake_sessions(flow_id);
create index if not exists idx_ask_intake_sessions_status on public.ask_intake_sessions(status);
create index if not exists idx_ask_intake_sessions_risk_level on public.ask_intake_sessions(risk_level);
create index if not exists idx_guide_results_user_id_occurred_at on public.guide_results(user_id, occurred_at desc);
create index if not exists idx_health_flows_user_id_created_at on public.health_flows(user_id, created_at desc);
create index if not exists idx_health_flows_status on public.health_flows(status);
create index if not exists idx_health_flows_risk_level on public.health_flows(risk_level);
create index if not exists idx_flow_actions_user_id_flow_id on public.flow_actions(user_id, flow_id);
create index if not exists idx_flow_actions_status on public.flow_actions(status);
create index if not exists idx_flow_blockers_user_id_flow_id on public.flow_blockers(user_id, flow_id);
create index if not exists idx_flow_blockers_status on public.flow_blockers(status);
create index if not exists idx_follow_ups_user_id_due_at on public.follow_ups(user_id, due_at);
create index if not exists idx_follow_ups_flow_id on public.follow_ups(flow_id);
create index if not exists idx_follow_ups_status on public.follow_ups(status);
create index if not exists idx_next_action_state_user_id on public.next_action_state(user_id);
create index if not exists idx_next_action_state_flow_id on public.next_action_state(flow_id);
create index if not exists idx_doctor_summary_items_user_id_occurred_at on public.doctor_summary_items(user_id, occurred_at desc);
create index if not exists idx_doctor_summary_drafts_user_id_created_at on public.doctor_summary_drafts(user_id, created_at desc);
create index if not exists idx_red_flag_logs_user_id_occurred_at on public.red_flag_logs(user_id, occurred_at desc);
create index if not exists idx_red_flag_logs_risk_level on public.red_flag_logs(risk_level);
create index if not exists idx_activity_insights_user_id_created_at on public.activity_insights(user_id, created_at desc);
create index if not exists idx_notification_preferences_user_id on public.notification_preferences(user_id);
create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);
create index if not exists idx_agent_events_user_id_occurred_at on public.agent_events(user_id, occurred_at desc);
create index if not exists idx_agent_events_flow_id on public.agent_events(flow_id);
create index if not exists idx_ai_usage_logs_user_id_occurred_at on public.ai_usage_logs(user_id, occurred_at desc);
create index if not exists idx_ai_decision_traces_user_id_occurred_at on public.ai_decision_traces(user_id, occurred_at desc);
create index if not exists idx_data_export_requests_user_id_requested_at on public.data_export_requests(user_id, requested_at desc);
create index if not exists idx_data_deletion_requests_user_id_requested_at on public.data_deletion_requests(user_id, requested_at desc);
create index if not exists idx_care_circles_owner_id on public.care_circles(owner_id);
create index if not exists idx_care_circles_status on public.care_circles(status);
create index if not exists idx_care_circle_members_circle_id on public.care_circle_members(care_circle_id);
create index if not exists idx_care_circle_members_member_user_id on public.care_circle_members(member_user_id);
create index if not exists idx_care_circle_members_owner_id on public.care_circle_members(owner_id);
create index if not exists idx_care_circle_members_status on public.care_circle_members(status);
create index if not exists idx_care_circle_events_circle_id_created_at on public.care_circle_events(care_circle_id, created_at desc);
create index if not exists idx_care_circle_events_actor_user_id on public.care_circle_events(actor_user_id);
