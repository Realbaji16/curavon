-- CURAVON FULL SETUP — paste ALL into Supabase SQL Editor, click Run
-- https://supabase.com/dashboard/project/mprfgqnmtobbqycvtatd/sql/new

-- Curavon / Healthy.Ai — extensions and shared helpers
-- Migration: 20250618100000

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Maintains updated_at on Curavon mutable tables.';

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

-- Curavon / Healthy.Ai — auto-create profiles on auth sign-up
-- Migration: 20250618100003

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, email, display_name)
select
  id,
  email,
  coalesce(
    raw_user_meta_data->>'display_name',
    raw_user_meta_data->>'full_name',
    split_part(email, '@', 1)
  )
from auth.users
on conflict (id) do update
set
  email = excluded.email,
  display_name = coalesce(public.profiles.display_name, excluded.display_name),
  updated_at = now();

-- =============================================================================
-- CURAVON — run this ONCE in Supabase SQL Editor
-- https://supabase.com/dashboard/project/mprfgqnmtobbqycvtatd/sql/new
-- Fixes: DataPermissionError / "database incomplete" / Ask "Get next step"
-- =============================================================================

grant usage on schema public to authenticated, service_role, anon;

grant select, insert, update, delete on table public.profiles to authenticated, service_role, anon;
grant select, insert, update, delete on table public.consent_records to authenticated, service_role, anon;
grant select, insert, update, delete on table public.health_profiles to authenticated, service_role, anon;
grant select, insert, update, delete on table public.daily_checkins to authenticated, service_role, anon;
grant select, insert, update, delete on table public.ask_history to authenticated, service_role, anon;
grant select, insert, update, delete on table public.ask_intake_sessions to authenticated, service_role, anon;
grant select, insert, update, delete on table public.guide_results to authenticated, service_role, anon;
grant select, insert, update, delete on table public.health_flows to authenticated, service_role, anon;
grant select, insert, update, delete on table public.flow_actions to authenticated, service_role, anon;
grant select, insert, update, delete on table public.flow_blockers to authenticated, service_role, anon;
grant select, insert, update, delete on table public.follow_ups to authenticated, service_role, anon;
grant select, insert, update, delete on table public.next_action_state to authenticated, service_role, anon;
grant select, insert, update, delete on table public.doctor_summary_items to authenticated, service_role, anon;
grant select, insert, update, delete on table public.doctor_summary_drafts to authenticated, service_role, anon;
grant select, insert, update, delete on table public.red_flag_logs to authenticated, service_role, anon;
grant select, insert, update, delete on table public.activity_insights to authenticated, service_role, anon;
grant select, insert, update, delete on table public.notification_preferences to authenticated, service_role, anon;
grant select, insert, update, delete on table public.user_preferences to authenticated, service_role, anon;
grant select, insert, update, delete on table public.agent_events to authenticated, service_role, anon;
grant select, insert, update, delete on table public.ai_usage_logs to authenticated, service_role, anon;
grant select, insert, update, delete on table public.ai_decision_traces to authenticated, service_role, anon;
grant select, insert, update, delete on table public.data_export_requests to authenticated, service_role, anon;
grant select, insert, update, delete on table public.data_deletion_requests to authenticated, service_role, anon;
grant select, insert, update, delete on table public.care_circles to authenticated, service_role, anon;
grant select, insert, update, delete on table public.care_circle_members to authenticated, service_role, anon;
grant select, insert, update, delete on table public.care_circle_events to authenticated, service_role, anon;

grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;
