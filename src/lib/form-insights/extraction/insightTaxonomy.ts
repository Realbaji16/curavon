import type { FormInsightApprovedFor } from '../types';

/**
 * Taxonomy for uploaded-form insights.
 *
 * These labels classify **product research signals** from de-identified exports.
 * They do not assert medical truth and must not drive diagnosis or treatment copy.
 */

export const FORM_INSIGHT_TYPES = [
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
  'lifestyle_context',
] as const;

export type FormInsightType = (typeof FORM_INSIGHT_TYPES)[number];

export type FormInsightTaxonomyEntry = {
  type: FormInsightType;
  label: string;
  description: string;
  /** Default reviewer approval scope — never medical_advice. */
  defaultApprovedFor: FormInsightApprovedFor;
  /** Typical internal product use; not end-user clinical guidance. */
  typicalProductUse: string;
};

export const FORM_INSIGHT_TAXONOMY: Readonly<Record<FormInsightType, FormInsightTaxonomyEntry>> = {
  common_concern: {
    type: 'common_concern',
    label: 'Common concern',
    description: 'Frequently mentioned concern themes in de-identified responses.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'Module priority and intake copy research.',
  },
  nigerian_phrase: {
    type: 'nigerian_phrase',
    label: 'Nigerian phrase',
    description: 'Pidgin or local phrasing candidates for normalization dictionaries.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'healthPhrases seed review — not diagnosis labels.',
  },
  care_blocker: {
    type: 'care_blocker',
    label: 'Care blocker',
    description: 'Barriers to clinic, pharmacy, or follow-up access.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'Clinic-prep and friction-reduction features.',
  },
  care_route: {
    type: 'care_route',
    label: 'Care route',
    description: 'Where users say they seek help (clinic, chemist, etc.) — descriptive only.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'Care-route hints; no facility directives.',
  },
  red_flag_candidate: {
    type: 'red_flag_candidate',
    label: 'Red flag candidate',
    description: 'Language that may need safety screening — requires clinical safety review.',
    defaultApprovedFor: 'safety_review_only',
    typicalProductUse: 'Red-flag dictionary review; never auto-diagnose.',
  },
  unsafe_medication_pattern: {
    type: 'unsafe_medication_pattern',
    label: 'Unsafe medication pattern',
    description: 'Reports of mixing, stopping, or unsupervised medicine use — safety signal only.',
    defaultApprovedFor: 'safety_review_only',
    typicalProductUse: 'Guardrails and blocked-output patterns.',
  },
  summary_field_candidate: {
    type: 'summary_field_candidate',
    label: 'Summary field candidate',
    description: 'Suggested professional-summary field labels from form columns.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'summary_fields seed backlog.',
  },
  safe_question_candidate: {
    type: 'safe_question_candidate',
    label: 'Safe question candidate',
    description: 'Guided-question phrasing that stays within organizational scope.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'required_questions seed review.',
  },
  trust_wording: {
    type: 'trust_wording',
    label: 'Trust wording',
    description: 'Language that increases confidence in organizational (non-diagnostic) help.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'Composer and disclaimer copy research.',
  },
  distrust_wording: {
    type: 'distrust_wording',
    label: 'Distrust wording',
    description: 'Language that reduces trust or implies Curavon gives medical advice.',
    defaultApprovedFor: 'safety_review_only',
    typicalProductUse: 'Copy avoidance and safety review.',
  },
  privacy_requirement: {
    type: 'privacy_requirement',
    label: 'Privacy requirement',
    description: 'Stated expectations about data handling or sharing.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'Privacy UX and retention policy inputs.',
  },
  feature_request: {
    type: 'feature_request',
    label: 'Feature request',
    description: 'Non-clinical product capability requests from forms.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'Roadmap triage.',
  },
  module_trigger_candidate: {
    type: 'module_trigger_candidate',
    label: 'Module trigger candidate',
    description: 'Phrases that may improve entry_triggers routing — not condition names.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'Module router trigger expansion.',
  },
  guardrail_candidate: {
    type: 'guardrail_candidate',
    label: 'Guardrail candidate',
    description: 'Output patterns that should be blocked in intelligence responses.',
    defaultApprovedFor: 'safety_review_only',
    typicalProductUse: 'blockedOutputs and plan boundary review.',
  },
  professional_opinion_conflict: {
    type: 'professional_opinion_conflict',
    label: 'Professional opinion conflict',
    description: 'Conflicting non-verified professional opinions in forms — context only.',
    defaultApprovedFor: 'safety_review_only',
    typicalProductUse: 'Safety review; Curavon must not pick a clinical side.',
  },
  lifestyle_context: {
    type: 'lifestyle_context',
    label: 'Lifestyle context',
    description: 'Sleep, stress, work, or social context — not medical classification.',
    defaultApprovedFor: 'product_context_only',
    typicalProductUse: 'Module overlap and question context research.',
  },
};

export function isFormInsightType(value: string): value is FormInsightType {
  return (FORM_INSIGHT_TYPES as readonly string[]).includes(value);
}

export function getFormInsightTaxonomyEntry(type: FormInsightType): FormInsightTaxonomyEntry {
  return FORM_INSIGHT_TAXONOMY[type];
}

export function defaultApprovedForInsightType(type: FormInsightType): FormInsightApprovedFor {
  return FORM_INSIGHT_TAXONOMY[type].defaultApprovedFor;
}
