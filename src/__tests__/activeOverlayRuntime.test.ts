import { afterEach, describe, expect, it } from 'vitest';
import { buildProductContextFromActiveOverlays } from '../lib/form-insights/promotion/productContextOverlayService';
import { deriveOverlaysFromInsight } from '../lib/form-insights/promotion/productContextOverlayService';
import { runImportAutoPromotion } from '../lib/form-insights/promotion/autoPromotionEngine';
import {
  resetActiveProductContextCache,
  seedActiveProductContextForTests,
} from '../lib/form-insights/runtime/productContextProvider';
import { validateRuntimeOverlay } from '../lib/form-insights/runtime/activeOverlayLoader';
import { createDraftFormInsight } from '../lib/form-insights/types';
import type { HealthModuleId } from '../lib/health-intelligence/modules/moduleIds';
import { composeModuleAwareIntakeMessage } from '../lib/health-intelligence/services/moduleResponseComposer';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { normalizeNigerianHealthLanguage } from '../lib/health-intelligence/services/languageNormalizer';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';
import { buildProfessionalSummaryPreview } from '../lib/health-intelligence/services/professionalSummaryBuilder';
import { bridgeRedFlags } from '../lib/health-intelligence/services/redFlagBridge';

const PHRASE = 'zzcuravon_runtime_route_x8';

function phraseInsight(status: 'review' | 'approved' = 'review') {
  return createDraftFormInsight({
    insightId: 'runtime_phrase',
    sourceBatchId: 'batch_runtime',
    insightType: 'nigerian_phrase',
    summary: PHRASE,
    status,
    evidence: {
      supportCount: 1,
      sourceRoles: ['patient'],
      rowRefs: ['r1'],
      matchedPatterns: [PHRASE],
    },
    linkedModules: [
      { moduleId: 'lab_result_confusion_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
    ],
  });
}

function seedActiveFromInsight(insight: ReturnType<typeof createDraftFormInsight>) {
  const overlays = deriveOverlaysFromInsight(insight).filter((overlay) => overlay.lifecycle === 'active');
  seedActiveProductContextForTests(buildProductContextFromActiveOverlays(overlays));
}

describe('active overlay runtime influence', () => {
  afterEach(() => {
    resetActiveProductContextCache();
  });

  it('active phrase overlay improves routing', () => {
    const rawText = `Need help with ${PHRASE} today`;

    resetActiveProductContextCache();
    const baseline = routeHealthModules({ rawText });

    seedActiveFromInsight(phraseInsight());
    const withRuntime = routeHealthModules({ rawText });
    const normalization = normalizeNigerianHealthLanguage(rawText);

    expect(baseline.selectedModules.map((module) => module.moduleId)).not.toContain(
      'lab_result_confusion_ng_v1',
    );
    expect(withRuntime.selectedModules.map((module) => module.moduleId)).toContain(
      'lab_result_confusion_ng_v1',
    );
    expect(normalization.moduleHints).toContain('lab_result_confusion_ng_v1');
  });

  it('shadow phrase overlay does not affect routing', () => {
    const shadowInsight = createDraftFormInsight({
      insightId: 'runtime_shadow_phrase',
      sourceBatchId: 'batch_runtime',
      insightType: 'common_concern',
      summary: PHRASE,
      status: 'review',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'], matchedPatterns: [PHRASE] },
      linkedModules: [
        { moduleId: 'lab_result_confusion_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const derived = deriveOverlaysFromInsight(shadowInsight);
    expect(derived.some((overlay) => overlay.lifecycle === 'shadow')).toBe(true);
    seedActiveProductContextForTests(buildProductContextFromActiveOverlays(derived));

    const rawText = `Need help with ${PHRASE} today`;
    const routing = routeHealthModules({ rawText });

    expect(routing.selectedModules.map((module) => module.moduleId)).not.toContain(
      'lab_result_confusion_ng_v1',
    );
  });

  it('active blocker overlay appears in blocker options', () => {
    const blockerInsight = createDraftFormInsight({
      insightId: 'runtime_blocker',
      sourceBatchId: 'batch_runtime',
      insightType: 'care_blocker',
      summary: 'Drug cost is too high',
      status: 'review',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['blocker'] },
      ],
    });

    seedActiveFromInsight(blockerInsight);

    const questions = generateGuidedQuestions({
      rawText: 'Need clinic visit help',
      selectedModules: ['clinic_pharmacy_prep_ng_v1'],
      primaryModuleId: 'clinic_pharmacy_prep_ng_v1',
    });

    expect(
      questions.some(
        (question) =>
          question.type === 'care_blocker' && question.question.includes('Drug cost is too high'),
      ),
    ).toBe(true);
  });

  it('active summary overlay appears in summary preview', () => {
    const summaryInsight = createDraftFormInsight({
      insightId: 'runtime_summary',
      sourceBatchId: 'batch_runtime',
      insightType: 'summary_field_candidate',
      summary: 'Visit checklist items to bring',
      status: 'review',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['summary_field'] },
      ],
    });

    seedActiveFromInsight(summaryInsight);

    const preview = buildProfessionalSummaryPreview({
      selectedModuleIds: ['clinic_pharmacy_prep_ng_v1'],
      primaryModuleId: 'clinic_pharmacy_prep_ng_v1',
    });

    expect(
      preview.fields.some((field) => field.fieldId === 'form_insight_runtime_summary'),
    ).toBe(true);
  });

  it('active trust wording appears in response composer', () => {
    const trustInsight = createDraftFormInsight({
      insightId: 'runtime_trust',
      sourceBatchId: 'batch_runtime',
      insightType: 'trust_wording',
      summary: 'Users trust when Curavon says notes are for clinician review only',
      status: 'review',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['response_copy'] },
      ],
    });

    seedActiveFromInsight(trustInsight);

    const message = composeModuleAwareIntakeMessage({
      rawText: 'Help me prepare for clinic',
      selectedModules: [{ moduleId: 'clinic_pharmacy_prep_ng_v1' }],
      primaryModuleId: 'clinic_pharmacy_prep_ng_v1',
      normalizedTerms: [],
      riskLevel: 'low',
      questions: [],
      nextStep: 'Continue',
      redFlags: [],
    });

    expect(message).toContain('clinician review only');
  });

  it('ignores unsafe overlay payload', () => {
    const unsafeInsight = createDraftFormInsight({
      insightId: 'runtime_unsafe',
      sourceBatchId: 'batch_runtime',
      insightType: 'trust_wording',
      summary: 'You should stop your antimalarial medicine now',
      status: 'review',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
      linkedModules: [
        { moduleId: 'medication_question_ng_v1' as HealthModuleId, influenceTypes: ['response_copy'] },
      ],
    });

    const promotion = runImportAutoPromotion([unsafeInsight]);
    expect(promotion.promotionSummary.activeOverlayCount).toBe(0);

    const overlays = deriveOverlaysFromInsight(unsafeInsight);
    const validated = overlays.map((overlay) => validateRuntimeOverlay(overlay));
    expect(validated.every((entry) => entry.overlay === null)).toBe(true);
  });

  it('red flag and medication-risk insights cannot affect live behavior', () => {
    const redFlagInsight = createDraftFormInsight({
      insightId: 'runtime_red_flag',
      sourceBatchId: 'batch_runtime',
      insightType: 'red_flag_candidate',
      summary: 'Chest pain language',
      status: 'approved',
      approvedFor: 'safety_review_only',
      evidence: { supportCount: 3, sourceRoles: ['doctor'], rowRefs: ['r1'], matchedPatterns: [PHRASE] },
      linkedModules: [
        { moduleId: 'chest_pain_ng_v1' as HealthModuleId, influenceTypes: ['guardrail'] },
      ],
    });

    const medRiskInsight = createDraftFormInsight({
      insightId: 'runtime_med_risk',
      sourceBatchId: 'batch_runtime',
      insightType: 'unsafe_medication_pattern',
      summary: 'Respondent expects Curavon to stop antimalarial medicine',
      status: 'approved',
      approvedFor: 'safety_review_only',
      evidence: { supportCount: 2, sourceRoles: ['pharmacy'], rowRefs: ['r1'] },
      linkedModules: [
        { moduleId: 'medication_question_ng_v1' as HealthModuleId, influenceTypes: ['guardrail'] },
      ],
    });

    const promotion = runImportAutoPromotion([redFlagInsight, medRiskInsight]);
    seedActiveProductContextForTests(
      buildProductContextFromActiveOverlays(promotion.overlays.overlays),
    );

    const rawText = `severe chest pain and ${PHRASE}`;
    const routing = routeHealthModules({ rawText });
    const baseline = bridgeRedFlags(rawText);
    const withCache = bridgeRedFlags(rawText);

    expect(promotion.promotionSummary.activeOverlayCount).toBe(0);
    expect(routing.selectedModules.map((module) => module.moduleId)).not.toContain(
      'lab_result_confusion_ng_v1',
    );
    expect(withCache.isUrgent).toBe(baseline.isUrgent);
  });
});
