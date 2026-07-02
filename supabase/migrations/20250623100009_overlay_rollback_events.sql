-- Allow rollback audit events for product context overlays.

alter table public.form_insight_promotion_events
  drop constraint if exists form_insight_promotion_events_event_type_check;

alter table public.form_insight_promotion_events
  add constraint form_insight_promotion_events_event_type_check check (
    event_type in (
      'derived',
      'validated',
      'activated',
      'shadowed',
      'blocked',
      'quarantined',
      'retired',
      'promoted',
      'validation_failed',
      'rollback'
    )
  );
