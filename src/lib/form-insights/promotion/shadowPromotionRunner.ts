import { detectRedFlags } from '../../health/redFlags';
import { isSafeGuidedQuestionPrompt } from '../../health-intelligence/services/guidedQuestionEngine';
import { routeHealthModules } from '../../health-intelligence/services/moduleRouter';
import { HEALTH_MODULE_BY_ID } from '../../health-intelligence/modules/moduleCatalog';
import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';
import { isHealthModuleId } from '../../health-intelligence/modules/moduleIds';
import type { HealthModuleRiskLevel } from '../../health-intelligence/modules/moduleTypes';
import type { FormInsight } from '../types';
import {
  buildInsightPromotionRecord,
  evaluateInsightPromotion,
  type InsightPromotionRecord,
} from './autoPromotionEngine';
import {
  CLASS_B_INSIGHT_TYPES,
  isClassBInsightType,
  meetsClassBShadowSupportThreshold,
} from './classBInsightTypes';
import {
  deriveOverlaysFromInsight,
  deriveOverlaysFromInsights,
  type DeriveOverlaysResult,
} from './productContextOverlayService';
import type {
  ModuleTriggerOverlayPayload,
  ProductContextOverlay,
  SafeQuestionOverlayPayload,
} from './productContextOverlayTypes';
import {
  validateInsightForLivePromotion,
  validateInsightTextForLivePromotion,
  type PromotionValidationResult,
} from './promotionValidators';

export { CLASS_B_INSIGHT_TYPES, isClassBInsightType };

export type ShadowPromotionOutcome = 'activated' | 'blocked' | 'skipped';

export type ShadowPromotionEventType = 'activated' | 'test_failed';

export type ShadowPromotionInsightResult = {
  insightId: string;
  insightType: FormInsight['insightType'];
  outcome: ShadowPromotionOutcome;
  reasons: readonly string[];
  eventType: ShadowPromotionEventType | null;
  promotionRecord: InsightPromotionRecord | null;
  overlays: ProductContextOverlay[];
};

export type ShadowPromotionBatchResult = {
  results: ShadowPromotionInsightResult[];
  insights: FormInsight[];
  overlays: DeriveOverlaysResult;
  activatedCount: number;
  blockedCount: number;
  skippedCount: number;
  events: Array<{
    insightId: string;
    overlayId?: string;
    eventType: ShadowPromotionEventType;
    actor: 'policy_engine' | 'cli';
    details: Record<string, unknown>;
  }>;
};

const RISK_RANK: Record<HealthModuleRiskLevel, number> = {
  low: 0,
  medium: 1,
  medium_high: 2,
  high: 3,
  urgent: 4,
};

const DIAGNOSIS_LABEL_PATTERNS: readonly RegExp[] = [
  /\byou have (malaria|typhoid|ulcer|infection|meningitis|appendicitis|hypertension|diabetes)\b/i,
  /\bthis is (malaria|typhoid|an infection)\b/i,
  /\bconfirmed (malaria|typhoid)\b/i,
  /\bdiagnosed with\b/i,
];

const DISEASE_CHOICE_QUESTION_PATTERNS: readonly RegExp[] = [
  /\bwhich (disease|illness|condition) do you have\b/i,
  /\bis it (malaria|typhoid|ulcer|meningitis)\b/i,
  /\bcould this be (malaria|typhoid|ulcer)\b/i,
  /\bdo you have (malaria|typhoid|ulcer|meningitis|appendicitis)\b/i,
];

const EMERGENCY_DELAY_PATTERNS: readonly RegExp[] = [
  /\bnot (an? )?emergency\b/i,
  /\bcan wait\b/i,
  /\bno need (to|for) (urgent|emergency|hospital)\b/i,
  /\bdon't (go|visit) (the )?(hospital|doctor|emergency)\b/i,
];

const TREATMENT_RECOMMENDATION_PATTERNS: readonly RegExp[] = [
  /\byou should (take|use|start|stop)\b/i,
  /\brecommend(s|ed)?\s+(treatment|medication)\b/i,
  /\b(prescribe|prescription)\b/i,
];

const ALLOWED_SAFE_QUESTION_TYPES = new Set([
  'timing',
  'severity',
  'associated_symptom',
  'medication_context',
  'risk_context',
  'summary',
  'care_blocker',
]);

export function isShadowPromotionCandidate(insight: FormInsight): boolean {
  if (!isClassBInsightType(insight.insightType)) return false;
  if (!meetsClassBShadowSupportThreshold(insight.evidence.supportCount)) return false;
  if (insight.shadowPromotion === 'activated' || insight.shadowPromotion === 'blocked') return false;
  return true;
}

export function validateShadowPromotionInsight(insight: FormInsight): PromotionValidationResult {
  const reasons: string[] = [];

  if (!isClassBInsightType(insight.insightType)) {
    return { valid: false, reasons: ['not_class_b_insight'] };
  }

  if (!meetsClassBShadowSupportThreshold(insight.evidence.supportCount)) {
    return { valid: false, reasons: [`support_below_${insight.evidence.supportCount}`] };
  }

  const base = validateInsightForLivePromotion(insight);
  if (!base.valid) {
    reasons.push(...base.reasons);
  }

  if (insight.insightType === 'module_trigger_candidate') {
    reasons.push(...validateModuleTriggerCandidate(insight).reasons);
  } else if (insight.insightType === 'safe_question_candidate') {
    reasons.push(...validateSafeQuestionCandidate(insight).reasons);
  } else if (insight.insightType === 'common_concern') {
    reasons.push(...validateCommonConcern(insight).reasons);
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateModuleTriggerCandidate(insight: FormInsight): PromotionValidationResult {
  const reasons: string[] = [];

  for (const link of insight.linkedModules) {
    if (!isHealthModuleId(link.moduleId)) {
      reasons.push(`unknown_module:${link.moduleId}`);
      continue;
    }

    if (!link.influenceTypes.includes('trigger')) {
      reasons.push('missing_trigger_influence');
    }
  }

  const terms = collectTriggerTerms(insight);
  if (terms.length === 0) {
    reasons.push('empty_trigger_terms');
    return { valid: false, reasons };
  }

  for (const term of terms) {
    const textCheck = validateInsightTextForLivePromotion(term);
    if (!textCheck.valid) {
      reasons.push(...textCheck.reasons.map((reason) => `trigger:${reason}`));
    }
  }

  for (const link of insight.linkedModules) {
    if (!link.influenceTypes.includes('trigger')) continue;
    const moduleId = link.moduleId;
    const sampleText = terms.join(' ');
    const riskCheck = validateTriggerDoesNotLowerRisk(sampleText, moduleId);
    if (!riskCheck.valid) {
      reasons.push(...riskCheck.reasons);
    }

    const redFlagCheck = validateTriggerDoesNotBypassRedFlags(sampleText, moduleId);
    if (!redFlagCheck.valid) {
      reasons.push(...redFlagCheck.reasons);
    }
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateSafeQuestionCandidate(insight: FormInsight): PromotionValidationResult {
  const reasons: string[] = [];
  const prompt = insight.summary.trim();

  if (!prompt) {
    return { valid: false, reasons: ['empty_question_prompt'] };
  }

  if (!isSafeGuidedQuestionPrompt(prompt)) {
    reasons.push('unsafe_guided_question_prompt');
  }

  for (const pattern of DISEASE_CHOICE_QUESTION_PATTERNS) {
    if (pattern.test(prompt)) {
      reasons.push(`disease_choice:${pattern.source}`);
    }
  }

  for (const pattern of EMERGENCY_DELAY_PATTERNS) {
    if (pattern.test(prompt)) {
      reasons.push(`emergency_delay:${pattern.source}`);
    }
  }

  for (const pattern of TREATMENT_RECOMMENDATION_PATTERNS) {
    if (pattern.test(prompt)) {
      reasons.push(`treatment_recommendation:${pattern.source}`);
    }
  }

  const questionType = inferSafeQuestionType(prompt);
  if (!ALLOWED_SAFE_QUESTION_TYPES.has(questionType)) {
    reasons.push(`disallowed_question_type:${questionType}`);
  }

  const textCheck = validateInsightTextForLivePromotion(prompt);
  if (!textCheck.valid) {
    reasons.push(...textCheck.reasons.map((reason) => `question:${reason}`));
  }

  return { valid: reasons.length === 0, reasons };
}

export function validateCommonConcern(insight: FormInsight): PromotionValidationResult {
  const reasons: string[] = [];

  const textCheck = validateInsightTextForLivePromotion(insight.summary);
  if (!textCheck.valid) {
    reasons.push(...textCheck.reasons.map((reason) => `summary:${reason}`));
  }

  for (const pattern of DIAGNOSIS_LABEL_PATTERNS) {
    if (pattern.test(insight.summary)) {
      reasons.push(`diagnosis_label:${pattern.source}`);
    }
  }

  const allowedInfluence = new Set(['trigger']);
  for (const link of insight.linkedModules) {
    for (const influence of link.influenceTypes) {
      if (!allowedInfluence.has(influence)) {
        reasons.push(`common_concern_disallowed_influence:${influence}`);
      }
    }
    if (!isHealthModuleId(link.moduleId)) {
      reasons.push(`unknown_module:${link.moduleId}`);
    }
  }

  if (insight.linkedModules.length === 0) {
    reasons.push('common_concern_missing_module_link');
  }

  return { valid: reasons.length === 0, reasons };
}

export function runShadowPromotionOnInsight(insight: FormInsight): ShadowPromotionInsightResult {
  if (!isShadowPromotionCandidate(insight)) {
    return {
      insightId: insight.insightId,
      insightType: insight.insightType,
      outcome: 'skipped',
      reasons: ['not_shadow_promotion_candidate'],
      eventType: null,
      promotionRecord: null,
      overlays: deriveOverlaysFromInsight(insight),
    };
  }

  const validation = validateShadowPromotionInsight(insight);

  if (!validation.valid) {
    const blockedInsight = applyShadowPromotionOutcome(insight, 'blocked', validation.reasons);
    const overlays = deriveOverlaysFromInsight(blockedInsight);
    const decision = evaluateInsightPromotion(blockedInsight);
    const promotionRecord = buildInsightPromotionRecord(blockedInsight, {
      ...decision,
      validationReasons:
        validation.reasons.length > 0 ? validation.reasons : decision.validationReasons,
    });

    return {
      insightId: insight.insightId,
      insightType: insight.insightType,
      outcome: 'blocked',
      reasons: validation.reasons,
      eventType: 'test_failed',
      promotionRecord,
      overlays,
    };
  }

  const activatedInsight = applyShadowPromotionOutcome(insight, 'activated', []);
  const overlays = deriveOverlaysFromInsight(activatedInsight);
  const promotionRecord = buildInsightPromotionRecord(
    activatedInsight,
    evaluateInsightPromotion(activatedInsight),
  );

  return {
    insightId: insight.insightId,
    insightType: insight.insightType,
    outcome: 'activated',
    reasons: [],
    eventType: 'activated',
    promotionRecord,
    overlays,
  };
}

export function runShadowPromotionBatch(insights: readonly FormInsight[]): ShadowPromotionBatchResult {
  const results = insights.map((insight) => runShadowPromotionOnInsight(insight));
  const updatedInsights = insights.map((insight) => {
    const result = results.find((entry) => entry.insightId === insight.insightId);
    if (!result || result.outcome === 'skipped') return insight;
    return applyShadowPromotionOutcome(
      insight,
      result.outcome === 'activated' ? 'activated' : 'blocked',
      [...result.reasons],
    );
  });

  const overlays = deriveOverlaysFromInsights(updatedInsights);
  const events = results
    .filter((result) => result.eventType)
    .map((result) => ({
      insightId: result.insightId,
      eventType: result.eventType!,
      actor: 'policy_engine' as const,
      details: {
        insightType: result.insightType,
        reasons: result.reasons,
        overlayCount: result.overlays.length,
      },
    }));

  return {
    results,
    insights: updatedInsights,
    overlays,
    activatedCount: results.filter((result) => result.outcome === 'activated').length,
    blockedCount: results.filter((result) => result.outcome === 'blocked').length,
    skippedCount: results.filter((result) => result.outcome === 'skipped').length,
    events,
  };
}

export function applyShadowPromotionOutcome(
  insight: FormInsight,
  outcome: 'activated' | 'blocked',
  reasons: readonly string[],
): FormInsight {
  return {
    ...insight,
    shadowPromotion: outcome,
    status: outcome === 'activated' ? 'approved' : 'review',
    productUse:
      outcome === 'activated'
        ? appendProductUseTag(insight.productUse, 'shadow_promotion:activated')
        : appendProductUseTag(insight.productUse, `shadow_promotion:blocked:${reasons.join(',')}`),
  };
}

function appendProductUseTag(productUse: string, tag: string): string {
  if (!productUse) return tag;
  if (productUse.includes(tag)) return productUse;
  return `${productUse}; ${tag}`;
}

function collectTriggerTerms(insight: FormInsight): string[] {
  const fromPatterns = insight.evidence.matchedPatterns ?? [];
  if (fromPatterns.length > 0) return [...fromPatterns];
  if (
    insight.insightType === 'module_trigger_candidate' ||
    insight.insightType === 'common_concern'
  ) {
    return insight.summary.trim() ? [insight.summary.trim()] : [];
  }
  return [];
}

function validateTriggerDoesNotLowerRisk(
  sampleText: string,
  moduleId: HealthModuleId,
): PromotionValidationResult {
  const baseline = routeHealthModules({ rawText: sampleText });
  const withHint = routeHealthModules({ rawText: sampleText, moduleHints: [moduleId] });

  const baselineRank = maxRiskRank(baseline.selectedModules.map((module) => module.riskLevel));
  const hintedRank = maxRiskRank(withHint.selectedModules.map((module) => module.riskLevel));
  const targetRank = moduleRiskRank(moduleId);

  if (targetRank < baselineRank) {
    return { valid: false, reasons: ['trigger_lowers_risk_level'] };
  }

  if (hintedRank < baselineRank) {
    return { valid: false, reasons: ['trigger_lowers_aggregate_risk'] };
  }

  return { valid: true, reasons: [] };
}

function validateTriggerDoesNotBypassRedFlags(
  sampleText: string,
  moduleId: HealthModuleId,
): PromotionValidationResult {
  const redFlags = detectRedFlags(sampleText);
  if (!redFlags.hasUrgent) {
    return { valid: true, reasons: [] };
  }

  const prepOnlyModules = new Set<HealthModuleId>([
    'clinic_pharmacy_prep_ng_v1',
    'lab_result_confusion_ng_v1',
  ]);

  if (prepOnlyModules.has(moduleId)) {
    return { valid: false, reasons: ['trigger_bypasses_red_flag_checks'] };
  }

  if (moduleRiskRank(moduleId) < RISK_RANK.high) {
    return { valid: false, reasons: ['urgent_text_routes_to_lower_risk_module'] };
  }

  return { valid: true, reasons: [] };
}

function moduleRiskRank(moduleId: HealthModuleId): number {
  const module = HEALTH_MODULE_BY_ID[moduleId];
  return RISK_RANK[module.risk_level] ?? 0;
}

function maxRiskRank(levels: readonly HealthModuleRiskLevel[]): number {
  return levels.reduce((max, level) => Math.max(max, RISK_RANK[level] ?? 0), 0);
}

function inferSafeQuestionType(prompt: string): string {
  const normalized = prompt.toLowerCase();
  if (/\b(when|since|how long|started)\b/.test(normalized)) return 'timing';
  if (/\b(how severe|worse|better|scale)\b/.test(normalized)) return 'severity';
  if (/\b(also|other symptom|associated)\b/.test(normalized)) return 'associated_symptom';
  if (/\b(medicine|medication|drug|chemist|pharmacy)\b/.test(normalized)) return 'medication_context';
  if (/\b(pregnant|child|travel|risk)\b/.test(normalized)) return 'risk_context';
  if (/\b(prepare|summary|bring|visit)\b/.test(normalized)) return 'summary';
  return 'summary';
}

export function validateModuleTriggerOverlay(
  overlay: ProductContextOverlay,
): PromotionValidationResult {
  if (overlay.overlayType !== 'module_trigger') {
    return { valid: false, reasons: ['not_module_trigger_overlay'] };
  }

  const payload = overlay.payload as ModuleTriggerOverlayPayload;
  if (!isHealthModuleId(payload.moduleId)) {
    return { valid: false, reasons: ['unknown_module'] };
  }

  const sampleText = payload.terms.join(' ');
  const reasons: string[] = [];

  for (const term of payload.terms) {
    const check = validateInsightTextForLivePromotion(term);
    if (!check.valid) reasons.push(...check.reasons);
  }

  reasons.push(...validateTriggerDoesNotLowerRisk(sampleText, payload.moduleId).reasons);
  reasons.push(...validateTriggerDoesNotBypassRedFlags(sampleText, payload.moduleId).reasons);

  return { valid: reasons.length === 0, reasons };
}

export function validateSafeQuestionOverlay(
  overlay: ProductContextOverlay,
): PromotionValidationResult {
  if (overlay.overlayType !== 'safe_question') {
    return { valid: false, reasons: ['not_safe_question_overlay'] };
  }

  const payload = overlay.payload as SafeQuestionOverlayPayload;
  const fakeInsight: FormInsight = {
    insightId: overlay.sourceInsightId,
    sourceBatchId: overlay.sourceBatchId,
    insightType: 'safe_question_candidate',
    summary: payload.prompt,
    evidence: { supportCount: 2, sourceRoles: ['patient'], rowRefs: ['shadow'] },
    confidence: 'low',
    medicalTruth: false,
    approvedFor: 'product_context_only',
    linkedModules: payload.moduleId
      ? [{ moduleId: payload.moduleId, influenceTypes: ['question'] }]
      : [],
    productUse: '',
    status: 'review',
  };

  return validateSafeQuestionCandidate(fakeInsight);
}
