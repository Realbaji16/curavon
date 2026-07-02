import { describe, expect, it } from 'vitest';
import {
  createDraftFormInsight,
  extractFormInsights,
  mapInsightToModules,
  mapInsightsToModules,
  resolveInfluenceTypesForInsight,
  resolveModulesFromInsightText,
  type NormalizedFormResponse,
} from '../lib/form-insights';

function fixtureInsight(
  overrides: Parameters<typeof createDraftFormInsight>[0] & { insightType: Parameters<typeof createDraftFormInsight>[0]['insightType'] },
) {
  return createDraftFormInsight({
    confidence: 'low',
    status: 'review',
    linkedModules: [],
    ...overrides,
  });
}

describe('mapInsightToModules', () => {
  it('maps antibiotics insight to medication_question_ng_v1 with guardrail', () => {
    const insight = fixtureInsight({
      insightId: 'ins-antibiotics',
      sourceBatchId: 'batch-1',
      insightType: 'unsafe_medication_pattern',
      summary: 'Antibiotics without prescription mentioned in responses',
      evidence: {
        supportCount: 2,
        sourceRoles: ['pharmacy'],
        rowRefs: ['r1'],
        matchedPatterns: ['antibiotics_without_prescription'],
      },
      productUse: 'Medication safety review',
    });

    const mapped = mapInsightToModules(insight);

    expect(mapped.influenceTypes).toEqual(['guardrail']);
    expect(mapped.linkedModules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleId: 'medication_question_ng_v1',
          influenceTypes: ['guardrail'],
        }),
      ]),
    );
  });

  it('maps Widal to lab_result_confusion_ng_v1 and fever_malaria_ng_v1', () => {
    const insight = fixtureInsight({
      insightId: 'ins-widal',
      sourceBatchId: 'batch-1',
      insightType: 'common_concern',
      summary: 'Lab or test result confusion mentioned',
      evidence: {
        supportCount: 1,
        sourceRoles: ['patient'],
        rowRefs: ['r2'],
        matchedPatterns: ['lab_result_confusion'],
      },
      productUse: 'lab_result_confusion_ng_v1 module priority',
    });

    const mapped = mapInsightToModules({
      ...insight,
      summary: 'Widal test result confusion and typhoid test worry',
    });

    const moduleIds = mapped.linkedModules.map((link) => link.moduleId);
    expect(moduleIds).toContain('lab_result_confusion_ng_v1');
    expect(moduleIds).toContain('fever_malaria_ng_v1');
    expect(mapped.influenceTypes).toEqual(['trigger']);
  });

  it('maps cost blocker to clinic_pharmacy_prep_ng_v1 as blocker', () => {
    const insight = fixtureInsight({
      insightId: 'ins-cost',
      sourceBatchId: 'batch-1',
      insightType: 'care_blocker',
      summary: 'Cost or affordability blocker to care',
      evidence: {
        supportCount: 3,
        sourceRoles: ['patient'],
        rowRefs: ['r3', 'r4'],
        matchedPatterns: ['cost_blocker'],
      },
      productUse: 'Visit blocker research',
    });

    const mapped = mapInsightToModules(insight);

    expect(mapped.influenceTypes).toEqual(['blocker']);
    expect(mapped.linkedModules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleId: 'clinic_pharmacy_prep_ng_v1',
          influenceTypes: ['blocker'],
        }),
      ]),
    );
  });

  it('maps body hot to fever module as trigger', () => {
    const modules = resolveModulesFromInsightText('body hot since yesterday');
    expect(modules).toContain('fever_malaria_ng_v1');

    const insight = fixtureInsight({
      insightId: 'ins-fever',
      sourceBatchId: 'batch-1',
      insightType: 'common_concern',
      summary: 'Fever or malaria-related concern mentioned',
      evidence: {
        supportCount: 1,
        sourceRoles: ['patient'],
        rowRefs: ['r5'],
        matchedPatterns: ['fever_malaria'],
      },
      productUse: 'fever_malaria_ng_v1 module priority',
    });

    const mapped = mapInsightToModules(insight);
    expect(mapped.influenceTypes).toEqual(['trigger']);
    expect(mapped.linkedModules).toEqual(
      expect.objectContaining([
        expect.objectContaining({
          moduleId: 'fever_malaria_ng_v1',
          influenceTypes: ['trigger'],
        }),
      ]),
    );
  });

  it('maps chest pain to chest_pain_ng_v1 as guardrail', () => {
    const insight = fixtureInsight({
      insightId: 'ins-chest',
      sourceBatchId: 'batch-1',
      insightType: 'red_flag_candidate',
      summary: 'Chest pain language',
      evidence: {
        supportCount: 1,
        sourceRoles: ['doctor'],
        rowRefs: ['r6'],
        matchedPatterns: ['chest_pain'],
      },
      productUse: 'red_flags review',
    });

    const mapped = mapInsightToModules(insight);

    expect(mapped.influenceTypes).toEqual(['guardrail']);
    expect(mapped.linkedModules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleId: 'chest_pain_ng_v1',
          influenceTypes: ['guardrail'],
        }),
      ]),
    );
  });

  it('resolves influence types by insight category', () => {
    expect(resolveInfluenceTypesForInsight('safe_question_candidate')).toEqual(['question']);
    expect(resolveInfluenceTypesForInsight('trust_wording')).toEqual(['response_copy']);
    expect(resolveInfluenceTypesForInsight('feature_request')).toEqual(['feature']);
  });

  it('maps extracted insights end-to-end', () => {
    const responses: NormalizedFormResponse[] = [
      {
        responseId: 'r1',
        sourceRole: 'patient',
        consentGranted: true,
        coarseRegion: 'Lagos',
        deidentifiedAnswers: { concern: 'Widal confusing and body hot' },
        rawPayloadHash: 'h1',
        createdAt: '2026-03-21T10:00:00.000Z',
      },
    ];

    const { insights } = extractFormInsights({ sourceBatchId: 'batch-e2e', responses });
    const mapped = mapInsightsToModules(insights);

    expect(mapped.length).toBeGreaterThan(0);
    const widalMapped = mapped.find((entry) =>
      entry.linkedModules.some((link) => link.moduleId === 'lab_result_confusion_ng_v1'),
    );
    expect(widalMapped).toBeDefined();
  });
});
