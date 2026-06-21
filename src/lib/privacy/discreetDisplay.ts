import type { FlowPrivacyLevel } from '../data/dataTypes';

export const DISCREET_FLOW_LABEL = 'Private health flow';
export const DISCREET_ACTION_TITLE = 'Private health step';
export const DISCREET_ACTION_PREVIEW = 'Your next step is ready — open to view.';
export const DISCREET_REASON_PREVIEW = 'Based on your private notes.';
export const DISCREET_SUMMARY_ITEM_TITLE = 'Private summary item';

export function isSensitivePrivacyLevel(level?: string | FlowPrivacyLevel | null): boolean {
  return level === 'sensitive';
}

export function shouldUseDiscreetDisplay(
  sensitiveMode: boolean,
  privacyLevel?: string | FlowPrivacyLevel | null,
): boolean {
  return sensitiveMode || isSensitivePrivacyLevel(privacyLevel);
}

export function getDiscreetFlowLabel(): string {
  return DISCREET_FLOW_LABEL;
}

export function getDiscreetActionTitle(rawTitle?: string, discreet = false): string {
  if (discreet) return DISCREET_ACTION_TITLE;
  return rawTitle?.trim() || "Today's next step";
}

export function getDiscreetActionPreview(rawAction?: string, discreet = false): string {
  if (discreet) return DISCREET_ACTION_PREVIEW;
  return rawAction?.trim() || '';
}

export function getDiscreetReasonPreview(rawReason?: string, discreet = false): string {
  if (discreet) return DISCREET_REASON_PREVIEW;
  return rawReason?.trim() || 'Based on your latest check-in and notes.';
}

export function getDiscreetSummaryItemTitle(rawTitle?: string, discreet = false): string {
  if (discreet) return DISCREET_SUMMARY_ITEM_TITLE;
  return rawTitle?.trim() || 'Summary item';
}
