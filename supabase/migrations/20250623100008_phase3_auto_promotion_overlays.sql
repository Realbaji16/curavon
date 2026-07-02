-- Curavon / Healthy.Ai — Phase 3 policy-based auto-promotion & product context overlays
-- Migration: 20250623100008
-- Supersedes draft product_context_overlays shape from 20250623100007 when present.
-- Ops/service-role only — no public or client Data API access.

-- =========================================================
-- 1. form_insights — auto-promotion audit columns
-- =========================================================

alter table public.form_insights
  add column if not exists risk_class text,
  add column if not exists auto_eligible boolean not null default false,
  add column if not exists auto_promotion_status text not null default 'pending',
  add column if not exists promotion_score numeric(5, 4) not null default 0,
  add column if not exists promotion_reason text,
  add column if not exists blocked_reason text,
  add column if not exists applied_at timestamptz,
  add column if not exists retired_at timestamptz,
  add column if not exists promotion_version text not null default 'phase3_v1';

comment on column public.form_insights.risk_class is
  'Promotion policy class: auto_promote, shadow_then_promote, or quarantine.';
comment on column public.form_insights.auto_eligible is
  'Whether policy + validators allow live product-context promotion.';
comment on column public.form_insights.auto_promotion_status is
  'Lifecycle: pending, active, shadow, blocked, quarantined, retired.';
comment on column public.form_insights.promotion_score is
  'Normalized promotion confidence score (0–1).';
comment on column public.form_insights.promotion_reason is
  'Human-readable reason when promoted or shadowed.';
comment on column public.form_insights.blocked_reason is
  'Human-readable reason when blocked from live promotion.';
comment on column public.form_insights.promotion_version is
  'Policy engine version used for auto-promotion evaluation.';

alter table public.form_insights
  drop constraint if exists form_insights_risk_class_check;

alter table public.form_insights
  add constraint form_insights_risk_class_check check (
    risk_class is null
    or risk_class in ('auto_promote', 'shadow_then_promote', 'quarantine')
  );

alter table public.form_insights
  drop constraint if exists form_insights_auto_promotion_status_check;

alter table public.form_insights
  add constraint form_insights_auto_promotion_status_check check (
    auto_promotion_status in (
      'pending', 'active', 'shadow', 'blocked', 'quarantined', 'retired'
    )
  );

alter table public.form_insights
  drop constraint if exists form_insights_promotion_score_range_check;

alter table public.form_insights
  add constraint form_insights_promotion_score_range_check check (
    promotion_score >= 0 and promotion_score <= 1
  );

-- Medical/safety-risk insight types must never be auto-eligible for live promotion.
alter table public.form_insights
  drop constraint if exists form_insights_quarantine_no_auto_promote;

alter table public.form_insights
  add constraint form_insights_quarantine_no_auto_promote check (
    insight_type not in (
      'red_flag_candidate',
      'unsafe_medication_pattern',
      'guardrail_candidate',
      'professional_opinion_conflict',
      'distrust_wording'
    )
    or auto_eligible = false
  );

-- Active auto-promotion requires non-quarantine risk class.
alter table public.form_insights
  drop constraint if exists form_insights_active_promotion_requires_eligibility;

alter table public.form_insights
  add constraint form_insights_active_promotion_requires_eligibility check (
    auto_promotion_status <> 'active'
    or (auto_eligible = true and coalesce(risk_class, '') <> 'quarantine')
  );

-- Re-assert medical_truth invariant (also enforced on insert/update below).
alter table public.form_insights
  drop constraint if exists form_insights_medical_truth_false;

alter table public.form_insights
  add constraint form_insights_medical_truth_false check (medical_truth = false);

create or replace function public.enforce_form_insights_medical_truth_false()
returns trigger
language plpgsql
as $$
begin
  new.medical_truth := false;
  return new;
end;
$$;

drop trigger if exists trg_form_insights_medical_truth_false on public.form_insights;
create trigger trg_form_insights_medical_truth_false
before insert or update on public.form_insights
for each row execute function public.enforce_form_insights_medical_truth_false();

create index if not exists idx_form_insights_auto_promotion_status
  on public.form_insights(auto_promotion_status);

create index if not exists idx_form_insights_auto_eligible
  on public.form_insights(auto_eligible)
  where auto_eligible = true;

create index if not exists idx_form_insights_risk_class
  on public.form_insights(risk_class)
  where risk_class is not null;

-- =========================================================
-- 2. product_context_overlays (canonical schema)
-- =========================================================

-- Replace draft overlay table from 20250623100007 when present.
drop table if exists public.product_context_overlays cascade;

create table public.product_context_overlays (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references public.form_insights(id) on delete cascade,
  overlay_type text not null,
  module_id text,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'shadow',
  source text not null default 'form_import',
  validation_hash text,
  safety_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  retired_at timestamptz,
  constraint product_context_overlays_overlay_type_check check (
    overlay_type in (
      'module_trigger',
      'blocker_option',
      'care_route',
      'summary_field',
      'safe_question',
      'response_copy',
      'feature_backlog_item',
      'lifestyle_context'
    )
  ),
  constraint product_context_overlays_status_check check (
    status in ('active', 'shadow', 'blocked', 'retired')
  ),
  constraint product_context_overlays_source_check check (
    source in ('form_import', 'policy_engine', 'manual', 'cli')
  ),
  constraint product_context_overlays_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint product_context_overlays_safety_result_object check (jsonb_typeof(safety_result) = 'object'),
  constraint product_context_overlays_module_id_check check (
    module_id is null
    or module_id in (
      'fever_malaria_ng_v1',
      'headache_ng_v1',
      'stomach_pain_ng_v1',
      'diarrhea_vomiting_ng_v1',
      'cough_catarrh_ng_v1',
      'breathing_difficulty_ng_v1',
      'chest_pain_ng_v1',
      'blood_pressure_ng_v1',
      'blood_sugar_ng_v1',
      'medication_question_ng_v1',
      'missed_medication_ng_v1',
      'lab_result_confusion_ng_v1',
      'pregnancy_concern_ng_v1',
      'child_fever_illness_ng_v1',
      'menstrual_reproductive_ng_v1',
      'skin_rash_itching_ng_v1',
      'injury_wound_swelling_ng_v1',
      'eye_ear_dental_ng_v1',
      'stress_anxiety_sleep_ng_v1',
      'clinic_pharmacy_prep_ng_v1'
    )
  ),
  constraint product_context_overlays_active_timestamps check (
    status <> 'active' or activated_at is not null
  ),
  constraint product_context_overlays_retired_timestamps check (
    status <> 'retired' or retired_at is not null
  )
);

create index if not exists idx_product_context_overlays_status
  on public.product_context_overlays(status);

create index if not exists idx_product_context_overlays_overlay_type
  on public.product_context_overlays(overlay_type);

create index if not exists idx_product_context_overlays_module_id
  on public.product_context_overlays(module_id)
  where module_id is not null;

create index if not exists idx_product_context_overlays_insight_id
  on public.product_context_overlays(insight_id);

create unique index if not exists idx_product_context_overlays_insight_type_module
  on public.product_context_overlays(insight_id, overlay_type, coalesce(module_id, '__global__'));

comment on table public.product_context_overlays is
  'Policy-derived product context overlays. Never mutates core module files.';

-- =========================================================
-- 3. form_insight_promotion_events — audit trail
-- =========================================================

create table if not exists public.form_insight_promotion_events (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references public.form_insights(id) on delete cascade,
  overlay_id uuid references public.product_context_overlays(id) on delete set null,
  event_type text not null,
  actor text not null default 'system',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint form_insight_promotion_events_event_type_check check (
    event_type in (
      'derived',
      'validated',
      'activated',
      'shadowed',
      'blocked',
      'quarantined',
      'retired',
      'promoted',
      'validation_failed'
    )
  ),
  constraint form_insight_promotion_events_actor_check check (
    actor in ('system', 'policy_engine', 'cli', 'admin', 'reviewer')
  ),
  constraint form_insight_promotion_events_details_object check (jsonb_typeof(details) = 'object')
);

create index if not exists idx_form_insight_promotion_events_insight_id
  on public.form_insight_promotion_events(insight_id);

create index if not exists idx_form_insight_promotion_events_overlay_id
  on public.form_insight_promotion_events(overlay_id)
  where overlay_id is not null;

create index if not exists idx_form_insight_promotion_events_event_type
  on public.form_insight_promotion_events(event_type);

create index if not exists idx_form_insight_promotion_events_created_at
  on public.form_insight_promotion_events(created_at desc);

comment on table public.form_insight_promotion_events is
  'Audit trail for auto-promotion and overlay lifecycle changes.';

-- =========================================================
-- 4. Row Level Security — admin/service only, no public access
-- =========================================================

alter table public.product_context_overlays enable row level security;
alter table public.form_insight_promotion_events enable row level security;

-- Explicit deny policies for browser/client roles (service_role bypasses RLS).
drop policy if exists product_context_overlays_deny_anon on public.product_context_overlays;
create policy product_context_overlays_deny_anon
  on public.product_context_overlays
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists product_context_overlays_deny_authenticated on public.product_context_overlays;
create policy product_context_overlays_deny_authenticated
  on public.product_context_overlays
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists form_insight_promotion_events_deny_anon on public.form_insight_promotion_events;
create policy form_insight_promotion_events_deny_anon
  on public.form_insight_promotion_events
  for all
  to anon
  using (false)
  with check (false);

drop policy if exists form_insight_promotion_events_deny_authenticated on public.form_insight_promotion_events;
create policy form_insight_promotion_events_deny_authenticated
  on public.form_insight_promotion_events
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on table public.product_context_overlays from anon, authenticated;
revoke all on table public.form_insight_promotion_events from anon, authenticated;

grant select, insert, update, delete on table public.product_context_overlays to service_role;
grant select, insert, update, delete on table public.form_insight_promotion_events to service_role;
