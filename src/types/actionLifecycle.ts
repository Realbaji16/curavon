/** Sources where the user accepted an action into Today / active next-action state. */
export type AcceptedActionSource =
  | 'today'
  | 'ask_promoted'
  | 'guide_completed'
  | 'checkin_plan'
  | 'followup_adjusted'
  | 'manual_refresh';

/** Preview-only paths — must never schedule follow-ups. */
export type PreviewActionSource =
  | 'ask_preview'
  | 'doctor_summary_note'
  | 'full_flow_overlay'
  | 'activity_insight'
  | 'fallback_preview';

export type ActionLifecycleSource = AcceptedActionSource | PreviewActionSource;

const ACCEPTED_SOURCES = new Set<AcceptedActionSource>([
  'today',
  'ask_promoted',
  'guide_completed',
  'checkin_plan',
  'followup_adjusted',
  'manual_refresh',
]);

const PREVIEW_SOURCES = new Set<PreviewActionSource>([
  'ask_preview',
  'doctor_summary_note',
  'full_flow_overlay',
  'activity_insight',
  'fallback_preview',
]);

export function isAcceptedActionSource(source: string): source is AcceptedActionSource {
  return ACCEPTED_SOURCES.has(source as AcceptedActionSource);
}

export function isPreviewActionSource(source: string): source is PreviewActionSource {
  return PREVIEW_SOURCES.has(source as PreviewActionSource);
}

export function acceptanceSourceFromPlanTrigger(
  trigger: string,
  planSource: 'today' | 'ask' | 'guides' | 'followup',
): AcceptedActionSource {
  if (trigger === 'followup_requested') return 'followup_adjusted';
  if (trigger === 'manual_refresh') return 'manual_refresh';
  if (trigger === 'checkin_completed') return 'checkin_plan';
  if (planSource === 'guides') return 'guide_completed';
  if (planSource === 'ask') return 'ask_promoted';
  return 'today';
}
