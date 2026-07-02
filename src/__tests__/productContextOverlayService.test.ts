import { describe, expect, it } from 'vitest';
import { createDraftFormInsight } from '../lib/form-insights/types';
import type { HealthModuleId } from '../lib/health-intelligence/modules/moduleIds';
import {
  deriveOverlaysFromInsight,
  getActiveOverlays,
} from '../lib/form-insights/promotion/productContextOverlayService';
import { validateOverlayPayload } from '../lib/form-insights/promotion/productContextOverlayTypes';

const PHRASE = 'zzcuravon_overlay_phrase_x2';

function insight(
  overrides: Partial<ReturnType<typeof createDraftFormInsight>> &
    Pick<Parameters<typeof createDraftFormInsight>[0], 'insightId' | 'insightType' | 'summary'>,
) {
  return createDraftFormInsight({
    sourceBatchId: 'batch_overlay',
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

describe('productContextOverlayService', () => {
  it('nigerian_phrase creates module_trigger overlay', () => {
    const phraseInsight = insight({
      insightId: 'phrase_overlay',
      insightType: 'nigerian_phrase',
      summary: PHRASE,
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

    const overlays = deriveOverlaysFromInsight(phraseInsight);
    const trigger = overlays.find((overlay) => overlay.overlayType === 'module_trigger');

    expect(trigger).toBeDefined();
    expect(trigger?.lifecycle).toBe('active');
    expect(trigger?.payload).toMatchObject({
      moduleId: 'lab_result_confusion_ng_v1',
      terms: [PHRASE],
    });
    expect(getActiveOverlays(overlays)).toHaveLength(1);
  });

  it('care_blocker creates blocker_option overlay', () => {
    const blockerInsight = insight({
      insightId: 'blocker_overlay',
      insightType: 'care_blocker',
      summary: 'Drug cost is too high',
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['blocker'] },
      ],
    });

    const overlays = deriveOverlaysFromInsight(blockerInsight);
    const blocker = overlays.find((overlay) => overlay.overlayType === 'blocker_option');

    expect(blocker).toBeDefined();
    expect(blocker?.lifecycle).toBe('active');
    expect(blocker?.payload).toMatchObject({
      label: 'Drug cost is too high',
      moduleId: 'clinic_pharmacy_prep_ng_v1',
    });
  });

  it('summary_field_candidate creates summary_field overlay', () => {
    const summaryInsight = insight({
      insightId: 'summary_overlay',
      insightType: 'summary_field_candidate',
      summary: 'Visit checklist items to bring',
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['summary_field'] },
      ],
    });

    const overlays = deriveOverlaysFromInsight(summaryInsight);
    const summary = overlays.find((overlay) => overlay.overlayType === 'summary_field');

    expect(summary).toBeDefined();
    expect(summary?.lifecycle).toBe('active');
    expect(summary?.payload).toMatchObject({
      label: 'Visit checklist items to bring',
      moduleId: 'clinic_pharmacy_prep_ng_v1',
    });
  });

  it('trust_wording creates response_copy overlay', () => {
    const trustInsight = insight({
      insightId: 'trust_overlay',
      insightType: 'trust_wording',
      summary: 'Users trust when Curavon says notes are for clinician review only',
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1' as HealthModuleId, influenceTypes: ['response_copy'] },
      ],
    });

    const overlays = deriveOverlaysFromInsight(trustInsight);
    const copy = overlays.find((overlay) => overlay.overlayType === 'response_copy');

    expect(copy).toBeDefined();
    expect(copy?.lifecycle).toBe('active');
    expect(copy?.payload).toMatchObject({
      line: 'Users trust when Curavon says notes are for clinician review only',
      moduleId: 'clinic_pharmacy_prep_ng_v1',
    });
  });

  it('unsafe_medication_pattern creates no active overlay', () => {
    const medRiskInsight = insight({
      insightId: 'med_risk_overlay',
      insightType: 'unsafe_medication_pattern',
      summary: 'Malaria drugs taken without testing mentioned',
      approvedFor: 'safety_review_only',
      linkedModules: [
        { moduleId: 'medication_question_ng_v1' as HealthModuleId, influenceTypes: ['guardrail'] },
      ],
    });

    const overlays = deriveOverlaysFromInsight(medRiskInsight);

    expect(getActiveOverlays(overlays)).toHaveLength(0);
    expect(overlays).toHaveLength(0);
  });

  it('professional_opinion_conflict creates no active overlay', () => {
    const conflictInsight = insight({
      insightId: 'conflict_overlay',
      insightType: 'professional_opinion_conflict',
      summary: 'Clinicians disagree on when to refer chest pain',
      approvedFor: 'safety_review_only',
      linkedModules: [
        { moduleId: 'chest_pain_ng_v1' as HealthModuleId, influenceTypes: ['guardrail'] },
      ],
    });

    const overlays = deriveOverlaysFromInsight(conflictInsight);

    expect(getActiveOverlays(overlays)).toHaveLength(0);
  });

  it('rejects overlay payloads with medication start/stop advice', () => {
    const validation = validateOverlayPayload({
      line: 'You should stop your antimalarial medicine now',
      moduleId: 'medication_question_ng_v1',
    });

    expect(validation.valid).toBe(false);
    expect(validation.reasons.length).toBeGreaterThan(0);
  });

  it('rejects overlay payloads with emergency minimization language', () => {
    const validation = validateOverlayPayload({
      line: 'This is not an emergency so you can wait',
      moduleId: 'chest_pain_ng_v1',
    });

    expect(validation.valid).toBe(false);
  });
});
