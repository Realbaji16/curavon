import { describe, expect, it } from 'vitest';
import { evaluateInsightPromotion } from '../lib/form-insights/promotion/autoPromotionEngine';
import { SHADOW_PROMOTE_MIN_SUPPORT } from '../lib/form-insights/promotion/autoPromotionPolicy';
import {
  runShadowPromotionOnInsight,
  validateCommonConcern,
  validateModuleTriggerCandidate,
  validateSafeQuestionCandidate,
} from '../lib/form-insights/promotion/shadowPromotionRunner';
import { createDraftFormInsight } from '../lib/form-insights/types';
import type { HealthModuleId } from '../lib/health-intelligence/modules/moduleIds';

function classBInsight(
  overrides: Partial<ReturnType<typeof createDraftFormInsight>> &
    Pick<Parameters<typeof createDraftFormInsight>[0], 'insightId' | 'insightType' | 'summary'>,
) {
  return createDraftFormInsight({
    sourceBatchId: 'batch_shadow_promo',
    evidence: {
      supportCount: SHADOW_PROMOTE_MIN_SUPPORT,
      sourceRoles: ['patient'],
      rowRefs: ['r1'],
    },
    linkedModules: [],
    status: 'review',
    ...overrides,
  });
}

describe('shadowPromotionRunner', () => {
  it('safe question activates', () => {
    const insight = classBInsight({
      insightId: 'safe_q_1',
      insightType: 'safe_question_candidate',
      summary: 'When did your fever start?',
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['question'] },
      ],
    });

    const result = runShadowPromotionOnInsight(insight);

    expect(result.outcome).toBe('activated');
    expect(result.eventType).toBe('activated');
    expect(result.promotionRecord?.autoPromotionStatus).toBe('active');
    expect(result.overlays.every((overlay) => overlay.lifecycle === 'active')).toBe(true);

    const promoted = { ...insight, shadowPromotion: 'activated' as const, status: 'approved' as const };
    expect(evaluateInsightPromotion(promoted).liveEligible).toBe(true);
  });

  it('diagnosis-forcing question blocks', () => {
    const insight = classBInsight({
      insightId: 'unsafe_q_1',
      insightType: 'safe_question_candidate',
      summary: 'Could this be malaria?',
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['question'] },
      ],
    });

    const validation = validateSafeQuestionCandidate(insight);
    expect(validation.valid).toBe(false);

    const result = runShadowPromotionOnInsight(insight);

    expect(result.outcome).toBe('blocked');
    expect(result.eventType).toBe('test_failed');
    expect(result.promotionRecord?.autoPromotionStatus).toBe('blocked');
    expect(result.promotionRecord?.blockedReason).toBeTruthy();
    expect(result.overlays.every((overlay) => overlay.lifecycle === 'blocked')).toBe(true);
  });

  it('safe module trigger activates', () => {
    const insight = classBInsight({
      insightId: 'safe_trigger_1',
      insightType: 'module_trigger_candidate',
      summary: 'Fever and chills mentioned',
      evidence: {
        supportCount: SHADOW_PROMOTE_MIN_SUPPORT,
        sourceRoles: ['patient'],
        rowRefs: ['r1'],
        matchedPatterns: ['fever and chills'],
      },
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const validation = validateModuleTriggerCandidate(insight);
    expect(validation.valid).toBe(true);

    const result = runShadowPromotionOnInsight(insight);

    expect(result.outcome).toBe('activated');
    expect(result.eventType).toBe('activated');
    expect(result.overlays.some((overlay) => overlay.overlayType === 'module_trigger')).toBe(true);
    expect(result.overlays.every((overlay) => overlay.lifecycle === 'active')).toBe(true);
  });

  it('unsafe trigger blocks', () => {
    const insight = classBInsight({
      insightId: 'unsafe_trigger_1',
      insightType: 'module_trigger_candidate',
      summary: 'Chest pain with crushing pressure',
      evidence: {
        supportCount: SHADOW_PROMOTE_MIN_SUPPORT,
        sourceRoles: ['patient'],
        rowRefs: ['r1'],
        matchedPatterns: ['chest pain with crushing pressure'],
      },
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const validation = validateModuleTriggerCandidate(insight);
    expect(validation.valid).toBe(false);
    expect(validation.reasons.some((reason) => reason.includes('red_flag') || reason.includes('urgent'))).toBe(
      true,
    );

    const result = runShadowPromotionOnInsight(insight);

    expect(result.outcome).toBe('blocked');
    expect(result.eventType).toBe('test_failed');
    expect(result.overlays.every((overlay) => overlay.lifecycle === 'blocked')).toBe(true);
  });

  it('concern insight does not create diagnosis', () => {
    const diagnosisLabel = classBInsight({
      insightId: 'concern_diagnosis',
      insightType: 'common_concern',
      summary: 'You have malaria confirmed from home testing',
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const diagnosisValidation = validateCommonConcern(diagnosisLabel);
    expect(diagnosisValidation.valid).toBe(false);

    const blocked = runShadowPromotionOnInsight(diagnosisLabel);
    expect(blocked.outcome).toBe('blocked');
    expect(blocked.overlays.every((overlay) => overlay.lifecycle === 'blocked')).toBe(true);

    const safeConcern = classBInsight({
      insightId: 'concern_safe',
      insightType: 'common_concern',
      summary: 'Fever concern mentioned during intake',
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const safeValidation = validateCommonConcern(safeConcern);
    expect(safeValidation.valid).toBe(true);

    const activated = runShadowPromotionOnInsight(safeConcern);
    expect(activated.outcome).toBe('activated');
    expect(activated.overlays.every((overlay) => overlay.overlayType !== 'diagnosis')).toBe(true);
    expect(activated.overlays.every((overlay) => overlay.lifecycle === 'active')).toBe(true);
  });

  it('keeps Class B insights shadow until promotion runner activates them', () => {
    const pending = classBInsight({
      insightId: 'pending_concern',
      insightType: 'common_concern',
      summary: 'Fever concern mentioned during intake',
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const decision = evaluateInsightPromotion(pending);
    expect(decision.outcome).toBe('shadow');
    expect(decision.liveEligible).toBe(false);
    expect(decision.validationReasons).toContain('shadow_pending_promotion_tests');
  });
});
