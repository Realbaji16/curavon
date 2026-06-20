-- =========================================================
-- Curavon Supabase Schema v1
-- Tables only: no RLS policies, no auth profile trigger.
-- Run this first.
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- Shared updated_at trigger function
-- =========================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- profiles
-- One row per Supabase Auth user.
-- Auto-create trigger is in supabase-profile-trigger-v1.sql
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
for each row
execute function public.set_updated_at();

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
for each row
execute function public.set_updated_at();

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
for each row
execute function public.set_updated_at();

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
for each row
execute function public.set_updated_at();

-- =========================================================
-- ask_history
-- Do not store raw AI prompts/model responses.
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
for each row
execute function public.set_updated_at();

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
for each row
execute function public.set_updated_at();

-- =========================================================
-- follow_ups
-- =========================================================

create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  action_id text,
  due_at timestamptz,
  status text default 'pending',
  source text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_follow_ups_updated_at on public.follow_ups;
create trigger set_follow_ups_updated_at
before update on public.follow_ups
for each row
execute function public.set_updated_at();

-- =========================================================
-- next_action_state
-- One active state row per user.
-- =========================================================

create table if not exists public.next_action_state (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text default 'pending',
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
for each row
execute function public.set_updated_at();

-- =========================================================
-- memory_snapshots
-- No raw prompts, model responses, or hidden reasoning.
-- =========================================================

create table if not exists public.memory_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_version text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint memory_snapshots_one_per_user unique (user_id)
);

drop trigger if exists set_memory_snapshots_updated_at on public.memory_snapshots;
create trigger set_memory_snapshots_updated_at
before update on public.memory_snapshots
for each row
execute function public.set_updated_at();

-- =========================================================
-- doctor_summary_items
-- =========================================================

create table if not exists public.doctor_summary_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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
for each row
execute function public.set_updated_at();

-- =========================================================
-- doctor_summary_drafts
-- No raw AI prompts/model responses.
-- =========================================================

create table if not exists public.doctor_summary_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  draft_status text default 'draft',
  date_range text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_doctor_summary_drafts_updated_at on public.doctor_summary_drafts;
create trigger set_doctor_summary_drafts_updated_at
before update on public.doctor_summary_drafts
for each row
execute function public.set_updated_at();

-- =========================================================
-- red_flag_logs
-- Keep payload bounded. Avoid unnecessary raw text.
-- =========================================================

create table if not exists public.red_flag_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text,
  safety_level text default 'urgent',
  matched_labels text[] default array[]::text[],
  self_harm boolean default false,
  occurred_at timestamptz not null default now(),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_red_flag_logs_updated_at on public.red_flag_logs;
create trigger set_red_flag_logs_updated_at
before update on public.red_flag_logs
for each row
execute function public.set_updated_at();

-- =========================================================
-- activity_insights
-- Final safe user-facing insight cards only.
-- No raw prompts/responses/hidden reasoning.
-- =========================================================

create table if not exists public.activity_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  insight_type text,
  source text default 'rules',
  safety_label text default 'not_medical',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

drop trigger if exists set_activity_insights_updated_at on public.activity_insights;
create trigger set_activity_insights_updated_at
before update on public.activity_insights
for each row
execute function public.set_updated_at();

-- =========================================================
-- ai_usage_logs
-- Metadata only. No raw prompts/responses.
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
for each row
execute function public.set_updated_at();

-- =========================================================
-- ai_decision_traces
-- Safe metadata only. No chain-of-thought, prompts, or responses.
-- =========================================================

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
for each row
execute function public.set_updated_at();

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
for each row
execute function public.set_updated_at();

-- =========================================================
-- data_export_requests
-- =========================================================

create table if not exists public.data_export_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_status text default 'requested',
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
for each row
execute function public.set_updated_at();

-- =========================================================
-- data_deletion_requests
-- =========================================================

create table if not exists public.data_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_status text default 'requested',
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
for each row
execute function public.set_updated_at();

-- =========================================================
-- Indexes
-- =========================================================

create index if not exists idx_consent_records_user_id on public.consent_records(user_id);
create index if not exists idx_daily_checkins_user_id_occurred_at on public.daily_checkins(user_id, occurred_at desc);
create index if not exists idx_ask_history_user_id_occurred_at on public.ask_history(user_id, occurred_at desc);
create index if not exists idx_guide_results_user_id_occurred_at on public.guide_results(user_id, occurred_at desc);
create index if not exists idx_follow_ups_user_id_due_at on public.follow_ups(user_id, due_at);
create index if not exists idx_next_action_state_user_id on public.next_action_state(user_id);
create index if not exists idx_memory_snapshots_user_id on public.memory_snapshots(user_id);
create index if not exists idx_doctor_summary_items_user_id_occurred_at on public.doctor_summary_items(user_id, occurred_at desc);
create index if not exists idx_doctor_summary_drafts_user_id_created_at on public.doctor_summary_drafts(user_id, created_at desc);
create index if not exists idx_red_flag_logs_user_id_occurred_at on public.red_flag_logs(user_id, occurred_at desc);
create index if not exists idx_activity_insights_user_id_created_at on public.activity_insights(user_id, created_at desc);
create index if not exists idx_ai_usage_logs_user_id_occurred_at on public.ai_usage_logs(user_id, occurred_at desc);
create index if not exists idx_ai_decision_traces_user_id_occurred_at on public.ai_decision_traces(user_id, occurred_at desc);
create index if not exists idx_user_preferences_user_id on public.user_preferences(user_id);
create index if not exists idx_data_export_requests_user_id_requested_at on public.data_export_requests(user_id, requested_at desc);
create index if not exists idx_data_deletion_requests_user_id_requested_at on public.data_deletion_requests(user_id, requested_at desc);