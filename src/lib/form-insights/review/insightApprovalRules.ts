import type { ModuleInfluenceType } from '../mapping/moduleInfluenceTypes';
import type { FormInsight } from '../types';
import { isInsightLiveEligible } from '../promotion/autoPromotionEngine';
import { isQuarantineInsightType } from '../promotion/autoPromotionPolicy';

/** Product-context influence kinds that may shape live behavior when promotion policy allows. */
export const AUTO_APPLICABLE_INFLUENCE_TYPES = [
  'trigger',
  'blocker',
  'summary_field',
  'response_copy',
  'feature',
] as const;

export type AutoApplicableInfluenceType = (typeof AUTO_APPLICABLE_INFLUENCE_TYPES)[number];

export function filterAutoApplicableInfluenceTypes(
  types: readonly ModuleInfluenceType[],
): AutoApplicableInfluenceType[] {
  return types.filter(canAutoApplyInfluenceType);
}

/** @deprecated Use isQuarantineInsightType from autoPromotionPolicy */
export const REVIEW_ONLY_INSIGHT_TYPES = [
  'red_flag_candidate',
  'unsafe_medication_pattern',
  'guardrail_candidate',
  'professional_opinion_conflict',
  'distrust_wording',
] as const;

export type ReviewOnlyInsightType = (typeof REVIEW_ONLY_INSIGHT_TYPES)[number];

export function isReviewOnlyInsightType(type: FormInsight['insightType']): type is ReviewOnlyInsightType {
  return isQuarantineInsightType(type);
}

export function canAutoApplyInfluenceType(
  type: ModuleInfluenceType,
): type is AutoApplicableInfluenceType {
  return (AUTO_APPLICABLE_INFLUENCE_TYPES as readonly string[]).includes(type);
}

/**
 * Whether an insight may shape live product behavior.
 * Uses policy-based auto-promotion — manual approval is not required for low-risk types.
 */
export function canInsightInfluenceLiveBehavior(insight: FormInsight): boolean {
  return isInsightLiveEligible(insight);
}

export function isApprovedInsightStatus(status: FormInsight['status']): boolean {
  return status === 'approved';
}
