import type { HealthModuleId } from '../health-intelligence/modules/moduleIds';
import type { FormInsightType } from './extraction/insightTaxonomy';
import type { ModuleInfluenceType } from './mapping/moduleInfluenceTypes';

/**
 * Uploaded form insights are **product and safety research signals** derived from
 * de-identified form exports. They are **not clinical truth** and must never be
 * surfaced as diagnosis, treatment, or medication advice.
 */

/** Who submitted the original form row (coarse role only — no provider credentials). */
export const FORM_SOURCE_ROLES = [
  'doctor',
  'pharmacy',
  'medical_student',
  'nurse',
  'patient',
  'caregiver',
  'unknown',
] as const;

export type FormSourceRole = (typeof FORM_SOURCE_ROLES)[number];

export function isFormSourceRole(value: string): value is FormSourceRole {
  return (FORM_SOURCE_ROLES as readonly string[]).includes(value);
}

export type FormInsightConfidence = 'low' | 'medium' | 'high';

/**
 * Where an insight may be used inside Curavon. Never includes medical_advice —
 * form insights cannot authorize clinical guidance to end users.
 */
export type FormInsightApprovedFor = 'product_context_only' | 'safety_review_only' | 'none';

export type FormInsightStatus = 'draft' | 'review' | 'approved' | 'rejected';

/**
 * Always `false` on stored insights. Form exports reflect opinions and phrasing,
 * not verified medical facts.
 */
export type FormInsightMedicalTruth = false;

/** Describes internal product use (copy, routing review, module seed backlog). Not user-facing care advice. */
export type FormInsightProductUse = string;

/** Optional link from an insight to one health-intelligence module and influence kinds. */
export type FormInsightLinkedModule = {
  moduleId: HealthModuleId;
  influenceTypes: readonly ModuleInfluenceType[];
};

/** Structured evidence for extracted form insights — no raw row text. */
export type FormInsightEvidence = {
  supportCount: number;
  sourceRoles: readonly FormSourceRole[];
  rowRefs: readonly string[];
  matchedPatterns?: readonly string[];
};

/**
 * A single extracted insight from an uploaded form batch.
 * Default expectations: `medicalTruth: false`, `approvedFor` is never medical advice.
 */
export type FormInsight = {
  insightId: string;
  sourceBatchId: string;
  insightType: FormInsightType;
  /** Short neutral summary for reviewers — not a clinical conclusion. */
  summary: string;
  evidence: FormInsightEvidence;
  confidence: FormInsightConfidence;
  /** Must remain false — form insights are not clinical truth. */
  medicalTruth: FormInsightMedicalTruth;
  approvedFor: FormInsightApprovedFor;
  linkedModules: readonly FormInsightLinkedModule[];
  productUse: FormInsightProductUse;
  status: FormInsightStatus;
  /** Class B shadow-then-promote runtime state after promotion runner. */
  shadowPromotion?: 'pending' | 'activated' | 'blocked';
};

/**
 * One de-identified row from an uploaded form export after normalization.
 * Answers are coarse buckets or redacted text — not a medical record.
 */
export type NormalizedFormResponse = {
  responseId: string;
  sourceRole: FormSourceRole;
  consentGranted: boolean | null;
  /** Coarse geography only (e.g. state/region bucket), never full address. */
  coarseRegion: string | null;
  /** Column id → de-identified answer value. */
  deidentifiedAnswers: Readonly<Record<string, string>>;
  /** SHA-256 of canonical raw row JSON for dedupe — raw payload not stored by default. */
  rawPayloadHash: string;
  createdAt: string;
};

/** Defaults applied when creating new insights — enforces non-clinical posture. */
export const DEFAULT_FORM_INSIGHT_MEDICAL_TRUTH = false as const satisfies FormInsightMedicalTruth;

export const DEFAULT_FORM_INSIGHT_APPROVED_FOR: FormInsightApprovedFor = 'product_context_only';

export type CreateFormInsightInput = {
  insightId: string;
  sourceBatchId: string;
  insightType: FormInsightType;
  summary: string;
  evidence: FormInsightEvidence;
  confidence?: FormInsightConfidence;
  approvedFor?: FormInsightApprovedFor;
  linkedModules?: readonly FormInsightLinkedModule[];
  productUse?: FormInsightProductUse;
  status?: FormInsightStatus;
};

/**
 * Build a draft insight with safe defaults (`medicalTruth: false`, product-context approval).
 */
export function createDraftFormInsight(input: CreateFormInsightInput): FormInsight {
  return {
    insightId: input.insightId,
    sourceBatchId: input.sourceBatchId,
    insightType: input.insightType,
    summary: input.summary,
    evidence: input.evidence,
    confidence: input.confidence ?? 'low',
    medicalTruth: DEFAULT_FORM_INSIGHT_MEDICAL_TRUTH,
    approvedFor: input.approvedFor ?? DEFAULT_FORM_INSIGHT_APPROVED_FOR,
    linkedModules: input.linkedModules ?? [],
    productUse: input.productUse ?? '',
    status: input.status ?? 'draft',
  };
}

/** Reject any approvedFor value that would imply clinical advice (compile-time union excludes it). */
export function isAllowedFormInsightApproval(
  value: string,
): value is FormInsightApprovedFor {
  return value === 'product_context_only' || value === 'safety_review_only' || value === 'none';
}
