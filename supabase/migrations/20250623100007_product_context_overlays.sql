-- Product context overlays derived from form insights.
-- Overlays layer product behavior without mutating core module files.

create table if not exists public.product_context_overlays (
  id text primary key,
  overlay_key text not null,
  source_insight_id text not null,
  source_batch_id uuid references public.form_import_batches(id) on delete set null,
  overlay_type text not null,
  lifecycle text not null default 'shadow',
  payload jsonb not null default '{}'::jsonb,
  module_id text,
  validation_reasons jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_context_overlays_overlay_key_unique unique (overlay_key),
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
  constraint product_context_overlays_lifecycle_check check (
    lifecycle in ('active', 'shadow', 'blocked', 'retired')
  ),
  constraint product_context_overlays_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint product_context_overlays_validation_reasons_array check (
    jsonb_typeof(validation_reasons) = 'array'
  )
);

create index if not exists idx_product_context_overlays_source_insight_id
  on public.product_context_overlays(source_insight_id);

create index if not exists idx_product_context_overlays_source_batch_id
  on public.product_context_overlays(source_batch_id);

create index if not exists idx_product_context_overlays_lifecycle
  on public.product_context_overlays(lifecycle);

create index if not exists idx_product_context_overlays_overlay_type
  on public.product_context_overlays(overlay_type);

drop trigger if exists set_product_context_overlays_updated_at on public.product_context_overlays;
create trigger set_product_context_overlays_updated_at
before update on public.product_context_overlays
for each row execute function public.set_updated_at();

alter table public.product_context_overlays enable row level security;
revoke all on table public.product_context_overlays from anon, authenticated;

comment on table public.product_context_overlays is
  'Policy-derived product context overlays from uploaded form insights. Never clinical truth.';
