import type { FormInsightType } from '../extraction/insightTaxonomy';
import { FORM_INSIGHT_TYPES } from '../extraction/insightTaxonomy';

/** How an insight type is promoted from form research into live product behavior. */
export type AutoPromotionPolicyType =
  | 'auto_promote_product_context'
  | 'shadow_then_promote'
  | 'quarantine_always';

export type InsightPromotionClass = 'auto_promote' | 'shadow_then_promote' | 'quarantine';

/** Low-risk product-context insights — live when promotion validators pass. */
export const AUTO_PROMOTE_INSIGHT_TYPES = [
  'nigerian_phrase',
  'care_blocker',
  'care_route',
  'summary_field_candidate',
  'trust_wording',
  'feature_request',
  'lifestyle_context',
] as const satisfies readonly FormInsightType[];

/** Report-only until support threshold met, then eligible for live product context. */
export const SHADOW_THEN_PROMOTE_INSIGHT_TYPES = [
  'common_concern',
  'module_trigger_candidate',
  'safe_question_candidate',
  'privacy_requirement',
] as const satisfies readonly FormInsightType[];

/** Medical/safety-risk — stored and reported, never live-applied automatically. */
export const QUARANTINE_ALWAYS_INSIGHT_TYPES = [
  'red_flag_candidate',
  'unsafe_medication_pattern',
  'guardrail_candidate',
  'professional_opinion_conflict',
  'distrust_wording',
] as const satisfies readonly FormInsightType[];

export type AutoPromoteInsightType = (typeof AUTO_PROMOTE_INSIGHT_TYPES)[number];
export type ShadowThenPromoteInsightType = (typeof SHADOW_THEN_PROMOTE_INSIGHT_TYPES)[number];
export type QuarantineInsightType = (typeof QUARANTINE_ALWAYS_INSIGHT_TYPES)[number];

const AUTO_PROMOTE_SET = new Set<FormInsightType>(AUTO_PROMOTE_INSIGHT_TYPES);
const SHADOW_SET = new Set<FormInsightType>(SHADOW_THEN_PROMOTE_INSIGHT_TYPES);
const QUARANTINE_SET = new Set<FormInsightType>(QUARANTINE_ALWAYS_INSIGHT_TYPES);

/** Minimum support count before shadow-then-promote insights become live-eligible. */
export const SHADOW_PROMOTE_MIN_SUPPORT = 2;

const POLICY_BY_TYPE: Readonly<Record<AutoPromotionPolicyType, readonly FormInsightType[]>> = {
  auto_promote_product_context: AUTO_PROMOTE_INSIGHT_TYPES,
  shadow_then_promote: SHADOW_THEN_PROMOTE_INSIGHT_TYPES,
  quarantine_always: QUARANTINE_ALWAYS_INSIGHT_TYPES,
};

export function resolveInsightPromotionClass(insightType: FormInsightType): InsightPromotionClass {
  if (QUARANTINE_SET.has(insightType)) return 'quarantine';
  if (SHADOW_SET.has(insightType)) return 'shadow_then_promote';
  if (AUTO_PROMOTE_SET.has(insightType)) return 'auto_promote';
  return 'shadow_then_promote';
}

export function resolveAutoPromotionPolicy(insightType: FormInsightType): AutoPromotionPolicyType {
  const promotionClass = resolveInsightPromotionClass(insightType);
  if (promotionClass === 'quarantine') return 'quarantine_always';
  if (promotionClass === 'shadow_then_promote') return 'shadow_then_promote';
  return 'auto_promote_product_context';
}

export function isQuarantineInsightType(type: FormInsightType): type is QuarantineInsightType {
  return QUARANTINE_SET.has(type);
}

export function isAutoPromoteInsightType(type: FormInsightType): type is AutoPromoteInsightType {
  return AUTO_PROMOTE_SET.has(type);
}

export function isShadowThenPromoteInsightType(
  type: FormInsightType,
): type is ShadowThenPromoteInsightType {
  return SHADOW_SET.has(type);
}

/** Every insight type is assigned exactly one promotion policy. */
export function assertPromotionPolicyCoverage(): void {
  for (const type of FORM_INSIGHT_TYPES) {
    resolveAutoPromotionPolicy(type);
    const policy = resolveAutoPromotionPolicy(type);
    const listed = POLICY_BY_TYPE[policy].includes(type);
    if (!listed && !SHADOW_SET.has(type) && !AUTO_PROMOTE_SET.has(type) && !QUARANTINE_SET.has(type)) {
      throw new Error(`Insight type ${type} is not mapped to a promotion policy.`);
    }
  }
}
