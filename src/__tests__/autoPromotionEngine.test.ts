import { describe, expect, it } from 'vitest';
import { FORM_INSIGHT_TYPES } from '../lib/form-insights/extraction/insightTaxonomy';
import {
  applyAutoPromotionAuditStatus,
  evaluateInsightPromotion,
  getLiveEligibleInsights,
  isInsightLiveEligible,
} from '../lib/form-insights/promotion/autoPromotionEngine';
import {
  AUTO_PROMOTE_INSIGHT_TYPES,
  isAutoPromoteInsightType,
  isQuarantineInsightType,
  isShadowThenPromoteInsightType,
  QUARANTINE_ALWAYS_INSIGHT_TYPES,
  resolveAutoPromotionPolicy,
  SHADOW_PROMOTE_MIN_SUPPORT,
  SHADOW_THEN_PROMOTE_INSIGHT_TYPES,
} from '../lib/form-insights/promotion/autoPromotionPolicy';
import { buildFormInsightOverlay } from '../lib/form-insights/promotion/overlayBuilder';
import { validateInsightForLivePromotion } from '../lib/form-insights/promotion/promotionValidators';
import { buildFormInsightProductContext } from '../lib/form-insights/formInsightContextService';
import { createDraftFormInsight } from '../lib/form-insights/types';
import type { HealthModuleId } from '../lib/health-intelligence/modules/moduleIds';
import { getFormInsightModuleHintsForText } from '../lib/form-insights/formInsightContextService';

const PHRASE = 'zzcuravon_auto_promote_x1';

function insight(
  overrides: Partial<ReturnType<typeof createDraftFormInsight>> &
    Pick<Parameters<typeof createDraftFormInsight>[0], 'insightId' | 'insightType' | 'summary'>,
) {
  return createDraftFormInsight({
    sourceBatchId: 'batch_promo',
    evidence: {
      supportCount: 1,
      sourceRoles: ['patient'],
      rowRefs: ['r1'],
    },
    linkedModules: [],
    status: 'review',
    ...overrides,
  });
}

describe('autoPromotionPolicy', () => {
  it('assigns every insight type to a promotion policy', () => {
    for (const type of FORM_INSIGHT_TYPES) {
      const policy = resolveAutoPromotionPolicy(type);
      expect(['auto_promote_product_context', 'shadow_then_promote', 'quarantine_always']).toContain(
        policy,
      );
    }

    expect(AUTO_PROMOTE_INSIGHT_TYPES.length).toBeGreaterThan(0);
    expect(SHADOW_THEN_PROMOTE_INSIGHT_TYPES.length).toBeGreaterThan(0);
    expect(QUARANTINE_ALWAYS_INSIGHT_TYPES.length).toBe(5);
  });

  it('classifies quarantine types correctly', () => {
    expect(isQuarantineInsightType('red_flag_candidate')).toBe(true);
    expect(isQuarantineInsightType('nigerian_phrase')).toBe(false);
    expect(isAutoPromoteInsightType('care_blocker')).toBe(true);
    expect(isShadowThenPromoteInsightType('common_concern')).toBe(true);
  });
});

describe('autoPromotionEngine', () => {
  it('auto-promotes low-risk product context without manual approval', () => {
    const phraseInsight = insight({
      insightId: 'phrase_1',
      insightType: 'nigerian_phrase',
      summary: PHRASE,
      evidence: {
        supportCount: 1,
        sourceRoles: ['patient'],
        rowRefs: ['r1'],
        matchedPatterns: [PHRASE],
      },
      linkedModules: [{ moduleId: 'lab_result_confusion_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] }],
      status: 'review',
    });

    const decision = evaluateInsightPromotion(phraseInsight);
    expect(decision.policy).toBe('auto_promote_product_context');
    expect(decision.liveEligible).toBe(true);
    expect(decision.auditStatus).toBe('approved');
    expect(isInsightLiveEligible(phraseInsight)).toBe(true);
  });

  it('keeps shadow insights offline until support threshold is met', () => {
    const lowSupport = insight({
      insightId: 'concern_low',
      insightType: 'common_concern',
      summary: 'Fever concern mentioned',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
      linkedModules: [{ moduleId: 'fever_malaria_ng_v1', influenceTypes: ['trigger'] }],
    });

    const highSupport = { ...lowSupport, evidence: { ...lowSupport.evidence, supportCount: SHADOW_PROMOTE_MIN_SUPPORT } };

    expect(evaluateInsightPromotion(lowSupport).liveEligible).toBe(false);
    expect(evaluateInsightPromotion(lowSupport).outcome).toBe('shadow');
    expect(evaluateInsightPromotion(highSupport).liveEligible).toBe(false);
    expect(evaluateInsightPromotion(highSupport).outcome).toBe('shadow');
    expect(evaluateInsightPromotion(highSupport).validationReasons).toContain(
      'shadow_pending_promotion_tests',
    );

    const activated = {
      ...highSupport,
      shadowPromotion: 'activated' as const,
      status: 'approved' as const,
    };
    expect(evaluateInsightPromotion(activated).liveEligible).toBe(true);
    expect(evaluateInsightPromotion(activated).auditStatus).toBe('approved');
  });

  it('quarantines medical/safety-risk insights from live behavior', () => {
    const redFlag = insight({
      insightId: 'rf_1',
      insightType: 'red_flag_candidate',
      summary: 'Chest pain language',
      approvedFor: 'safety_review_only',
      linkedModules: [{ moduleId: 'chest_pain_ng_v1', influenceTypes: ['guardrail'] }],
      status: 'approved',
    });

    const decision = evaluateInsightPromotion(redFlag);
    expect(decision.quarantined).toBe(true);
    expect(decision.liveEligible).toBe(false);

    const overlay = buildFormInsightOverlay({ insights: [redFlag] });
    expect(overlay.appliedInsightIds).toHaveLength(0);
    expect(overlay.promotion.quarantined).toHaveLength(1);
  });

  it('blocks live promotion for medication start/stop advice text', () => {
    const unsafe = insight({
      insightId: 'unsafe_1',
      insightType: 'trust_wording',
      summary: 'You should stop your antimalarial medicine now',
      linkedModules: [{ moduleId: 'medication_question_ng_v1', influenceTypes: ['response_copy'] }],
    });

    const validation = validateInsightForLivePromotion(unsafe);
    expect(validation.valid).toBe(false);

    const decision = evaluateInsightPromotion(unsafe);
    expect(decision.liveEligible).toBe(false);
    expect(decision.outcome).toBe('blocked');
  });

  it('applies audit statuses on import without requiring manual approval', () => {
    const inputs = [
      insight({
        insightId: 'p1',
        insightType: 'nigerian_phrase',
        summary: PHRASE,
        evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'], matchedPatterns: [PHRASE] },
        linkedModules: [{ moduleId: 'lab_result_confusion_ng_v1', influenceTypes: ['trigger'] }],
      }),
      insight({
        insightId: 'q1',
        insightType: 'red_flag_candidate',
        summary: 'Difficulty breathing language',
        approvedFor: 'safety_review_only',
      }),
    ];

    const promoted = applyAutoPromotionAuditStatus(inputs);
    expect(promoted[0]?.status).toBe('approved');
    expect(promoted[1]?.status).toBe('review');
  });

  it('builds live overlay only from live-eligible insights', () => {
    const phraseInsight = insight({
      insightId: 'phrase_overlay',
      insightType: 'nigerian_phrase',
      summary: PHRASE,
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'], matchedPatterns: [PHRASE] },
      linkedModules: [{ moduleId: 'lab_result_confusion_ng_v1', influenceTypes: ['trigger'] }],
    });

    const quarantined = insight({
      insightId: 'med_risk',
      insightType: 'unsafe_medication_pattern',
      summary: 'Malaria drugs taken without testing mentioned',
      approvedFor: 'safety_review_only',
      linkedModules: [{ moduleId: 'medication_question_ng_v1', influenceTypes: ['guardrail'] }],
    });

    const context = buildFormInsightProductContext({ insights: [phraseInsight, quarantined] });
    const hints = getFormInsightModuleHintsForText(`help with ${PHRASE}`, context);

    expect(hints).toContain('lab_result_confusion_ng_v1');
    expect(getLiveEligibleInsights([phraseInsight, quarantined])).toHaveLength(1);
  });
});
