-- Curavon / Healthy.Ai — Data API table grants
-- Migration: 20250618100004
--
-- Supabase projects with "default privileges for new entities" disabled require explicit
-- GRANTs before PostgREST can reach tables (error 42501 / permission denied).
-- RLS policies from 20250618100002 still enforce row ownership; grants only expose tables to roles.

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

grant usage, select on all sequences in schema public to authenticated, service_role, anon;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role, anon;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role, anon;
