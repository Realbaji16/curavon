-- Curavon / Healthy.Ai — Phase 3 uploaded form insights (ops-only, de-identified)
-- Migration: 20250623100006
-- No raw CSV storage. Admin/service imports only — no client read or insert.

-- =========================================================
-- form_import_batches
-- =========================================================

create table if not exists public.form_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_filename text,
  source_role text not null default 'unknown',
  import_status text not null default 'pending',
  row_count integer not null default 0,
  response_count integer not null default 0,
  insight_count integer not null default 0,
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_import_batches_source_role_check check (
    source_role in (
      'doctor', 'pharmacy', 'medical_student', 'nurse',
      'patient', 'caregiver', 'unknown'
    )
  ),
  constraint form_import_batches_import_status_check check (
    import_status in ('pending', 'processing', 'completed', 'failed')
  )
);

drop trigger if exists set_form_import_batches_updated_at on public.form_import_batches;
create trigger set_form_import_batches_updated_at
before update on public.form_import_batches
for each row execute function public.set_updated_at();

-- =========================================================
-- form_responses (de-identified rows only)
-- =========================================================

create table if not exists public.form_responses (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.form_import_batches(id) on delete cascade,
  external_response_id text not null,
  source_role text not null default 'unknown',
  consent_granted boolean,
  coarse_region text,
  deidentified_payload jsonb not null default '{}'::jsonb,
  raw_payload_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_responses_source_role_check check (
    source_role in (
      'doctor', 'pharmacy', 'medical_student', 'nurse',
      'patient', 'caregiver', 'unknown'
    )
  ),
  constraint form_responses_deidentified_payload_object check (jsonb_typeof(deidentified_payload) = 'object'),
  constraint form_responses_external_id_unique unique (batch_id, external_response_id)
);

drop trigger if exists set_form_responses_updated_at on public.form_responses;
create trigger set_form_responses_updated_at
before update on public.form_responses
for each row execute function public.set_updated_at();

-- =========================================================
-- form_insights
-- =========================================================

create table if not exists public.form_insights (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.form_import_batches(id) on delete cascade,
  insight_key text not null,
  insight_type text not null,
  summary text not null,
  evidence jsonb not null default '{}'::jsonb,
  confidence text not null default 'low',
  medical_truth boolean not null default false,
  approved_for text not null default 'product_context_only',
  status text not null default 'review',
  product_use text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_insights_insight_key_unique unique (batch_id, insight_key),
  constraint form_insights_insight_type_check check (
    insight_type in (
      'common_concern',
      'nigerian_phrase',
      'care_blocker',
      'care_route',
      'red_flag_candidate',
      'unsafe_medication_pattern',
      'summary_field_candidate',
      'safe_question_candidate',
      'trust_wording',
      'distrust_wording',
      'privacy_requirement',
      'feature_request',
      'module_trigger_candidate',
      'guardrail_candidate',
      'professional_opinion_conflict',
      'lifestyle_context'
    )
  ),
  constraint form_insights_confidence_check check (
    confidence in ('low', 'medium', 'high')
  ),
  constraint form_insights_medical_truth_false check (medical_truth = false),
  constraint form_insights_approved_for_check check (
    approved_for in ('product_context_only', 'safety_review_only', 'none')
  ),
  constraint form_insights_status_check check (
    status in ('draft', 'review', 'approved', 'rejected')
  ),
  constraint form_insights_evidence_object check (jsonb_typeof(evidence) = 'object')
);

drop trigger if exists set_form_insights_updated_at on public.form_insights;
create trigger set_form_insights_updated_at
before update on public.form_insights
for each row execute function public.set_updated_at();

-- =========================================================
-- form_insight_module_links
-- =========================================================

create table if not exists public.form_insight_module_links (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references public.form_insights(id) on delete cascade,
  module_id text not null,
  influence_types text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint form_insight_module_links_module_id_check check (
    module_id ~ '^[a-z][a-z0-9_]*_ng_v1$'
  ),
  constraint form_insight_module_links_influence_types_check check (
    influence_types <@ array[
      'trigger', 'question', 'summary_field', 'guardrail',
      'response_copy', 'feature', 'blocker', 'care_route'
    ]::text[]
  ),
  constraint form_insight_module_links_unique unique (insight_id, module_id)
);

drop trigger if exists set_form_insight_module_links_updated_at on public.form_insight_module_links;
create trigger set_form_insight_module_links_updated_at
before update on public.form_insight_module_links
for each row execute function public.set_updated_at();

-- =========================================================
-- form_insight_review_events
-- =========================================================

create table if not exists public.form_insight_review_events (
  id uuid primary key default gen_random_uuid(),
  insight_id uuid not null references public.form_insights(id) on delete cascade,
  event_type text not null,
  reviewer_note text,
  previous_status text,
  new_status text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint form_insight_review_events_event_type_check check (
    event_type in ('submitted', 'approved', 'rejected', 'note', 'status_change')
  ),
  constraint form_insight_review_events_previous_status_check check (
    previous_status is null or previous_status in ('draft', 'review', 'approved', 'rejected')
  ),
  constraint form_insight_review_events_new_status_check check (
    new_status is null or new_status in ('draft', 'review', 'approved', 'rejected')
  )
);

-- =========================================================
-- Indexes
-- =========================================================

create index if not exists idx_form_insights_status on public.form_insights(status);
create index if not exists idx_form_insights_insight_type on public.form_insights(insight_type);
create index if not exists idx_form_insight_module_links_module_id on public.form_insight_module_links(module_id);
create index if not exists idx_form_responses_batch_id on public.form_responses(batch_id);
create index if not exists idx_form_insights_batch_id on public.form_insights(batch_id);
create index if not exists idx_form_insight_review_events_insight_id on public.form_insight_review_events(insight_id);

-- =========================================================
-- Row Level Security — enabled, no client policies (admin/service only)
-- =========================================================

alter table public.form_import_batches enable row level security;
alter table public.form_responses enable row level security;
alter table public.form_insights enable row level security;
alter table public.form_insight_module_links enable row level security;
alter table public.form_insight_review_events enable row level security;

-- Deny Data API access for browser/client roles (imports use server admin path only).
revoke all on table public.form_import_batches from anon, authenticated;
revoke all on table public.form_responses from anon, authenticated;
revoke all on table public.form_insights from anon, authenticated;
revoke all on table public.form_insight_module_links from anon, authenticated;
revoke all on table public.form_insight_review_events from anon, authenticated;

comment on table public.form_import_batches is
  'Phase 3 form import batch metadata. No raw CSV bytes stored.';
comment on table public.form_responses is
  'De-identified form rows (deidentified_payload jsonb only).';
comment on table public.form_insights is
  'Extracted product/safety insights — medical_truth is always false.';
comment on table public.form_insight_module_links is
  'Module influence links for reviewer-approved insight backlog.';
comment on table public.form_insight_review_events is
  'Reviewer audit trail for form insight approval workflow.';
