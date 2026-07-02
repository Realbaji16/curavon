import { afterEach, describe, expect, it } from 'vitest';
import {
  buildFormInsightProductContext,
  canInsightInfluenceLiveBehavior,
  runFormImport,
} from '../lib/form-insights';
import { SHADOW_PROMOTE_MIN_SUPPORT } from '../lib/form-insights/promotion/autoPromotionPolicy';
import { runImportAutoPromotion } from '../lib/form-insights/promotion/autoPromotionEngine';
import {
  buildProductContextFromActiveOverlays,
  getActiveOverlays,
} from '../lib/form-insights/promotion/productContextOverlayService';
import { collectOverlayPayloadText } from '../lib/form-insights/promotion/productContextOverlayTypes';
import { rollbackOverlays } from '../lib/form-insights/promotion/overlayRollbackService';
import { runShadowPromotionOnInsight } from '../lib/form-insights/promotion/shadowPromotionRunner';
import {
  resetActiveProductContextCache,
  seedActiveProductContextForTests,
} from '../lib/form-insights/runtime/productContextProvider';
import { createDraftFormInsight } from '../lib/form-insights/types';
import type { FormInsight } from '../lib/form-insights/types';
import type { HealthModuleId } from '../lib/health-intelligence/modules/moduleIds';
import { normalizeNigerianHealthLanguage } from '../lib/health-intelligence/services/languageNormalizer';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';
import { buildProfessionalSummaryPreview } from '../lib/health-intelligence/services/professionalSummaryBuilder';
import { bridgeRedFlags } from '../lib/health-intelligence/services/redFlagBridge';

const NIGERIAN_PHRASE = 'zzcuravon_accept_phrase_x1';

/** Comprehensive fixture — extracts Class A/C signals without raw identifiers in assertions. */
const ACCEPTANCE_CSV = [
  'Timestamp,Concern,State,I consent',
  '3/21/2026 10:00:00,Hospital queue too long and drugs too expensive,Lagos,Yes',
  '3/21/2026 10:05:00,This is not a diagnosis and when did symptoms start since yesterday,Lagos,Yes',
  '3/21/2026 10:10:00,Chest pain and difficulty breathing need urgent wording,Lagos,Yes',
  '3/21/2026 11:00:00,Customers buy antibiotics without prescription every day,Lagos,Yes',
  '3/21/2026 11:05:00,Curavon should tell users to stop the drug when itching starts,Lagos,Yes',
  '3/21/2026 11:10:00,body hot since yesterday already took malaria drug any allergies,Lagos,Yes',
].join('\n');

const FORBIDDEN_LIVE_TEXT_PATTERNS: readonly RegExp[] = [
  /\bdiagnos(e|is|ing|ed)\b/i,
  /\bprescri(be|ption|bed|bing)\b/i,
  /\b\d+\s*(mg|ml|mcg|tablet|tablets|pill|pills|capsule|capsules|dose|doses)\b/i,
  /\byou should (take|use|start|stop)\b/i,
];

function importAcceptanceFixture() {
  return runFormImport({
    sourceName: 'auto-promotion-acceptance',
    sourceRole: 'patient',
    filename: 'Acceptance.csv',
    csvText: ACCEPTANCE_CSV,
    batchId: 'batch_auto_promotion_acceptance',
  });
}

function insightByType(result: ReturnType<typeof importAcceptanceFixture>, type: FormInsight['insightType']) {
  return result.insights.filter((insight) => insight.insightType === type);
}

function activeOverlayForInsight(
  result: ReturnType<typeof importAcceptanceFixture>,
  insightId: string,
  overlayType: string,
) {
  return result.overlays.active.find(
    (overlay) => overlay.sourceInsightId === insightId && overlay.overlayType === overlayType,
  );
}

function classAInsight(
  overrides: Partial<ReturnType<typeof createDraftFormInsight>> &
    Pick<Parameters<typeof createDraftFormInsight>[0], 'insightId' | 'insightType' | 'summary'>,
) {
  return createDraftFormInsight({
    sourceBatchId: 'batch_auto_promotion_acceptance',
    evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
    linkedModules: [],
    status: 'review',
    ...overrides,
  });
}

function seedActiveOverlaysFromInsights(insights: FormInsight[]) {
  const promotion = runImportAutoPromotion(insights);
  const active = getActiveOverlays(promotion.overlays.overlays);
  seedActiveProductContextForTests(buildProductContextFromActiveOverlays(active));
  return { promotion, active };
}

describe('Phase 3 auto-promotion acceptance (no manual approval)', () => {
  afterEach(() => {
    resetActiveProductContextCache();
  });

  it('1. CSV import extracts insights', () => {
    const result = importAcceptanceFixture();
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.insights.length).toBeGreaterThan(0);
    expect(result.moduleMappings.length).toBe(result.insights.length);
    expect(result.promotionSummary).toBeDefined();
    expect(result.overlays.overlays.length).toBeGreaterThan(0);
  });

  it('2. all insights have medicalTruth=false', () => {
    const result = importAcceptanceFixture();
    expect(result.insights.every((insight) => insight.medicalTruth === false)).toBe(true);
  });

  it('3. nigerian_phrase insight auto-creates active module_trigger overlay', () => {
    const phrase = classAInsight({
      insightId: 'accept_phrase',
      insightType: 'nigerian_phrase',
      summary: NIGERIAN_PHRASE,
      evidence: {
        supportCount: 1,
        sourceRoles: ['patient'],
        rowRefs: ['r1'],
        matchedPatterns: [NIGERIAN_PHRASE],
      },
      linkedModules: [
        { moduleId: 'lab_result_confusion_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const promotion = runImportAutoPromotion([phrase]);
    const overlay = promotion.overlays.active.find((entry) => entry.overlayType === 'module_trigger');

    expect(promotion.promotionSummary.activeOverlayCount).toBe(1);
    expect(overlay?.lifecycle).toBe('active');
    expect(overlay?.moduleId).toBe('lab_result_confusion_ng_v1');
    expect(phrase.status).not.toBe('rejected');
    expect(promotion.insights[0]?.status).toBe('approved');
  });

  it('4. care_blocker insight auto-creates active blocker_option overlay', () => {
    const result = importAcceptanceFixture();
    const blocker = insightByType(result, 'care_blocker').find((insight) =>
      /queue|waiting/i.test(insight.summary),
    );

    expect(blocker).toBeDefined();
    const overlay = activeOverlayForInsight(result, blocker!.insightId, 'blocker_option');
    expect(overlay).toBeDefined();
    expect(overlay?.lifecycle).toBe('active');
  });

  it('5. summary_field_candidate auto-creates active summary_field overlay', () => {
    const result = importAcceptanceFixture();
    const summaryInsight = insightByType(result, 'summary_field_candidate').find((insight) =>
      /allerg/i.test(insight.summary),
    );

    expect(summaryInsight).toBeDefined();
    const overlay = activeOverlayForInsight(result, summaryInsight!.insightId, 'summary_field');
    expect(overlay).toBeDefined();
    expect(overlay?.lifecycle).toBe('active');
  });

  it('6. trust_wording auto-creates active response_copy overlay', () => {
    const trust = classAInsight({
      insightId: 'accept_trust',
      insightType: 'trust_wording',
      summary: 'Users trust when Curavon says notes are for clinician review only',
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['response_copy'] },
      ],
    });

    const promotion = runImportAutoPromotion([trust]);
    const overlay = promotion.overlays.active.find((entry) => entry.overlayType === 'response_copy');

    expect(overlay).toBeDefined();
    expect(overlay?.lifecycle).toBe('active');
    expect(promotion.promotionSummary.activeOverlayCount).toBe(1);
  });

  it('7. module_trigger_candidate starts as shadow', () => {
    const trigger = classAInsight({
      insightId: 'accept_trigger_shadow',
      insightType: 'module_trigger_candidate',
      summary: 'Fever routing phrase candidate',
      evidence: {
        supportCount: SHADOW_PROMOTE_MIN_SUPPORT,
        sourceRoles: ['patient'],
        rowRefs: ['r1', 'r2'],
        matchedPatterns: ['fever routing phrase'],
      },
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const promotion = runImportAutoPromotion([trigger]);
    const overlay = promotion.overlays.shadow.find((entry) => entry.overlayType === 'module_trigger');

    expect(promotion.promotion.decisions[0]?.outcome).toBe('shadow');
    expect(promotion.promotionSummary.activeOverlayCount).toBe(0);
    expect(overlay?.lifecycle).toBe('shadow');
  });

  it('8. safe_question_candidate starts as shadow', () => {
    const result = importAcceptanceFixture();
    const question = insightByType(result, 'safe_question_candidate').find((insight) =>
      /allerg/i.test(insight.summary),
    );

    expect(question).toBeDefined();
    const overlays = result.overlays.shadow.filter(
      (entry) =>
        entry.sourceInsightId === question!.insightId && entry.overlayType === 'safe_question',
    );

    expect(overlays.length).toBeGreaterThan(0);
    expect(overlays.every((overlay) => overlay.lifecycle === 'shadow')).toBe(true);
    expect(result.promotion.decisions.some((decision) => decision.insightId === question!.insightId && decision.outcome === 'shadow')).toBe(
      true,
    );
  });

  it('9. safe shadow question can promote to active', () => {
    const question = classAInsight({
      insightId: 'accept_safe_question',
      insightType: 'safe_question_candidate',
      summary: 'When did your fever start?',
      evidence: {
        supportCount: SHADOW_PROMOTE_MIN_SUPPORT,
        sourceRoles: ['patient'],
        rowRefs: ['r1', 'r2'],
      },
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['question'] },
      ],
    });

    const shadowed = runImportAutoPromotion([question]);
    expect(shadowed.overlays.shadow.some((overlay) => overlay.overlayType === 'safe_question')).toBe(
      true,
    );

    const promoted = runShadowPromotionOnInsight(question);
    expect(promoted.outcome).toBe('activated');
    expect(promoted.overlays.every((overlay) => overlay.lifecycle === 'active')).toBe(true);
  });

  it('10. diagnosis-forcing shadow question is blocked', () => {
    const unsafeQuestion = classAInsight({
      insightId: 'accept_unsafe_question',
      insightType: 'safe_question_candidate',
      summary: 'Could this be malaria?',
      evidence: {
        supportCount: SHADOW_PROMOTE_MIN_SUPPORT,
        sourceRoles: ['patient'],
        rowRefs: ['r1', 'r2'],
      },
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['question'] },
      ],
    });

    const result = runShadowPromotionOnInsight(unsafeQuestion);
    expect(result.outcome).toBe('blocked');
    expect(result.eventType).toBe('test_failed');
    expect(result.overlays.every((overlay) => overlay.lifecycle === 'blocked')).toBe(true);
  });

  it('11. red_flag_candidate is quarantined', () => {
    const result = importAcceptanceFixture();
    const redFlag = insightByType(result, 'red_flag_candidate')[0];

    expect(redFlag).toBeDefined();
    expect(redFlag!.approvedFor).toBe('safety_review_only');
    expect(result.promotion.quarantined.some((insight) => insight.insightId === redFlag!.insightId)).toBe(
      true,
    );
    expect(canInsightInfluenceLiveBehavior(redFlag!)).toBe(false);
  });

  it('12. unsafe_medication_pattern is quarantined', () => {
    const result = importAcceptanceFixture();
    const medRisk = insightByType(result, 'unsafe_medication_pattern')[0];

    expect(medRisk).toBeDefined();
    expect(medRisk!.approvedFor).toBe('safety_review_only');
    expect(result.promotion.quarantined.some((insight) => insight.insightId === medRisk!.insightId)).toBe(
      true,
    );
    expect(canInsightInfluenceLiveBehavior(medRisk!)).toBe(false);
  });

  it('13. professional_opinion_conflict is quarantined', () => {
    const result = importAcceptanceFixture();
    const conflict = insightByType(result, 'professional_opinion_conflict')[0];

    expect(conflict).toBeDefined();
    expect(conflict!.approvedFor).toBe('safety_review_only');
    expect(
      result.promotion.quarantined.some((insight) => insight.insightId === conflict!.insightId),
    ).toBe(true);
    expect(canInsightInfluenceLiveBehavior(conflict!)).toBe(false);
  });

  it('14. active overlays influence language normalizer and summary builder', () => {
    const phrase = classAInsight({
      insightId: 'accept_runtime_phrase',
      insightType: 'nigerian_phrase',
      summary: NIGERIAN_PHRASE,
      evidence: {
        supportCount: 1,
        sourceRoles: ['patient'],
        rowRefs: ['r1'],
        matchedPatterns: [NIGERIAN_PHRASE],
      },
      linkedModules: [
        { moduleId: 'lab_result_confusion_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const summary = classAInsight({
      insightId: 'accept_runtime_summary',
      insightType: 'summary_field_candidate',
      summary: 'Allergy context appears in responses',
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['summary_field'] },
      ],
    });

    seedActiveOverlaysFromInsights([phrase, summary]);

    const rawText = `Need help with ${NIGERIAN_PHRASE} today`;
    const normalization = normalizeNigerianHealthLanguage(rawText);
    expect(normalization.moduleHints).toContain('lab_result_confusion_ng_v1');

    const preview = buildProfessionalSummaryPreview({
      selectedModuleIds: ['clinic_pharmacy_prep_ng_v1'],
      primaryModuleId: 'clinic_pharmacy_prep_ng_v1',
    });
    expect(
      preview.fields.some((field) => field.fieldId === 'form_insight_accept_runtime_summary'),
    ).toBe(true);
  });

  it('15. quarantined insights do not influence live product', () => {
    const result = importAcceptanceFixture();
    const quarantined = result.promotion.quarantined;
    expect(quarantined.length).toBeGreaterThan(0);

    const context = buildFormInsightProductContext({ insights: quarantined });
    expect(context.appliedInsightIds).toHaveLength(0);
    expect(context.routingTriggers).toHaveLength(0);
    expect(context.blockerOptions).toHaveLength(0);
    expect(context.responseCopyLines).toHaveLength(0);
    expect(result.promotionSummary.activeOverlayCount).toBeGreaterThan(0);
  });

  it('16. no diagnosis/prescription/dosage strings are introduced in active overlays', () => {
    const result = importAcceptanceFixture();
    const activeTexts = result.overlays.active.flatMap((overlay) =>
      collectOverlayPayloadText(overlay.payload),
    );

    expect(activeTexts.length).toBeGreaterThan(0);
    for (const text of activeTexts) {
      for (const pattern of FORBIDDEN_LIVE_TEXT_PATTERNS) {
        expect(pattern.test(text)).toBe(false);
      }
    }
  });

  it('17. emergency red flag behavior is unchanged', () => {
    const result = importAcceptanceFixture();
    seedActiveProductContextForTests(
      buildProductContextFromActiveOverlays(result.overlays.active),
    );

    const urgentText = 'severe chest pain and difficulty breathing right now';
    const baseline = bridgeRedFlags(urgentText);
    const withOverlays = bridgeRedFlags(urgentText);

    expect(withOverlays.isUrgent).toBe(baseline.isUrgent);
    expect(withOverlays.isUrgent).toBe(true);
    expect(withOverlays.hits.length).toBeGreaterThan(0);
    expect(withOverlays.detection.matches.length).toBeGreaterThan(0);
  });

  it('18. rollback disables overlay influence', () => {
    const phrase = classAInsight({
      insightId: 'accept_rollback_phrase',
      insightType: 'nigerian_phrase',
      summary: NIGERIAN_PHRASE,
      evidence: {
        supportCount: 1,
        sourceRoles: ['patient'],
        rowRefs: ['r1'],
        matchedPatterns: [NIGERIAN_PHRASE],
      },
      linkedModules: [
        { moduleId: 'lab_result_confusion_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const promotion = runImportAutoPromotion([phrase]);
    const activeOverlay = promotion.overlays.active[0];
    expect(activeOverlay).toBeDefined();

    seedActiveProductContextForTests(buildProductContextFromActiveOverlays(promotion.overlays.active));
    const rawText = `Need help with ${NIGERIAN_PHRASE} today`;
    expect(routeHealthModules({ rawText }).selectedModules.map((module) => module.moduleId)).toContain(
      'lab_result_confusion_ng_v1',
    );

    const rolled = rollbackOverlays(promotion.overlays.overlays, {
      overlayId: activeOverlay!.overlayId,
    });
    expect(rolled.result.retiredCount).toBe(1);
    expect(getActiveOverlays(rolled.overlays)).toHaveLength(0);

    resetActiveProductContextCache();
    seedActiveProductContextForTests(buildProductContextFromActiveOverlays(getActiveOverlays(rolled.overlays)));
    expect(routeHealthModules({ rawText }).selectedModules.map((module) => module.moduleId)).not.toContain(
      'lab_result_confusion_ng_v1',
    );
  });
});
