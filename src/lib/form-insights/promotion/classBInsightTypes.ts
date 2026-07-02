import type { FormInsightType } from '../extraction/insightTaxonomy';
import { SHADOW_PROMOTE_MIN_SUPPORT } from './autoPromotionPolicy';

/** Class B insights — shadow first, active only after promotion tests pass. */
export const CLASS_B_INSIGHT_TYPES = [
  'common_concern',
  'module_trigger_candidate',
  'safe_question_candidate',
] as const satisfies readonly FormInsightType[];

export type ClassBInsightType = (typeof CLASS_B_INSIGHT_TYPES)[number];

const CLASS_B_SET = new Set<FormInsightType>(CLASS_B_INSIGHT_TYPES);

export type ShadowPromotionRuntimeStatus = 'pending' | 'activated' | 'blocked';

export function isClassBInsightType(type: FormInsightType): type is ClassBInsightType {
  return CLASS_B_SET.has(type);
}

export function requiresShadowPromotionRunner(type: FormInsightType): boolean {
  return isClassBInsightType(type);
}

export function meetsClassBShadowSupportThreshold(supportCount: number): boolean {
  return supportCount >= SHADOW_PROMOTE_MIN_SUPPORT;
}

export function resolveClassBShadowPromotionStatus(
  shadowPromotion?: ShadowPromotionRuntimeStatus,
): ShadowPromotionRuntimeStatus {
  return shadowPromotion ?? 'pending';
}
