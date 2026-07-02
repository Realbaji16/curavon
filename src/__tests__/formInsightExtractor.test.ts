import { describe, expect, it } from 'vitest';
import { extractFormInsights, type NormalizedFormResponse } from '../lib/form-insights';

function fixtureResponse(
  id: string,
  role: NormalizedFormResponse['sourceRole'],
  answers: Record<string, string>,
): NormalizedFormResponse {
  return {
    responseId: id,
    sourceRole: role,
    consentGranted: true,
    coarseRegion: 'Lagos',
    deidentifiedAnswers: answers,
    rawPayloadHash: `hash_${id}`,
    createdAt: '2026-03-21T10:00:00.000Z',
  };
}

const PILOT_FIXTURE: NormalizedFormResponse[] = [
  fixtureResponse('r1', 'patient', {
    concern: 'body hot since yesterday and took malaria drug without test',
  }),
  fixtureResponse('r2', 'pharmacy', {
    feedback: 'People buy antibiotics without prescription and chemist first before doctor',
  }),
  fixtureResponse('r3', 'doctor', {
    notes: 'Chest pain and difficulty breathing need urgent wording; this is not a diagnosis',
  }),
  fixtureResponse('r4', 'patient', {
    blocker: 'Hospital queue too long and drugs too expensive so incomplete dose',
    privacy: 'I want delete my data and sensitive mode for health notes',
  }),
  fixtureResponse('r5', 'medical_student', {
    feature: 'Wish the app had visit checklist and export summary for doctor',
    lifestyle: 'Headache after no sleep and work stress',
  }),
  fixtureResponse('r6', 'patient', {
    conflict: 'Curavon should tell users to stop the drug when itching starts',
    lab: 'Widal result confusing and do not understand my result',
  }),
];

describe('extractFormInsights', () => {
  it('extracts common concerns from fixture responses', () => {
    const { insights } = extractFormInsights({
      sourceBatchId: 'batch-fixture-1',
      responses: PILOT_FIXTURE,
    });

    const concerns = insights.filter((insight) => insight.insightType === 'common_concern');
    const concernSummaries = concerns.map((insight) => insight.summary);

    expect(concernSummaries.some((summary) => /fever|malaria/i.test(summary))).toBe(true);
    expect(concernSummaries.some((summary) => /headache/i.test(summary))).toBe(true);
    expect(concernSummaries.some((summary) => /lab|test result/i.test(summary))).toBe(true);
  });

  it('extracts care blockers, routes, and medication risks', () => {
    const { insights } = extractFormInsights({
      sourceBatchId: 'batch-fixture-2',
      responses: PILOT_FIXTURE,
    });

    expect(insights.some((i) => i.insightType === 'care_blocker' && /cost/i.test(i.summary))).toBe(
      true,
    );
    expect(
      insights.some((i) => i.insightType === 'care_blocker' && /waiting|queue/i.test(i.summary)),
    ).toBe(true);
    expect(
      insights.some((i) => i.insightType === 'care_route' && /pharmacy|chemist/i.test(i.summary)),
    ).toBe(true);
    expect(
      insights.some(
        (i) =>
          i.insightType === 'unsafe_medication_pattern' &&
          /antibiotics without prescription/i.test(i.summary),
      ),
    ).toBe(true);
    expect(
      insights.some(
        (i) =>
          i.insightType === 'unsafe_medication_pattern' &&
          /malaria.*without testing/i.test(i.summary),
      ),
    ).toBe(true);
    expect(
      insights.some(
        (i) =>
          i.insightType === 'unsafe_medication_pattern' &&
          /incomplete dose/i.test(i.summary),
      ),
    ).toBe(true);
  });

  it('extracts red flag candidates with safety_review_only approval', () => {
    const { insights } = extractFormInsights({
      sourceBatchId: 'batch-fixture-3',
      responses: [PILOT_FIXTURE[2]!],
    });

    const redFlags = insights.filter((insight) => insight.insightType === 'red_flag_candidate');
    expect(redFlags.length).toBeGreaterThanOrEqual(2);
    for (const insight of redFlags) {
      expect(insight.medicalTruth).toBe(false);
      expect(insight.approvedFor).toBe('safety_review_only');
      expect(insight.status).toBe('review');
      expect(insight.confidence).toBe('low');
    }
  });

  it('extracts trust wording and privacy requirements', () => {
    const { insights } = extractFormInsights({
      sourceBatchId: 'batch-fixture-4',
      responses: [PILOT_FIXTURE[2]!, PILOT_FIXTURE[3]!],
    });

    expect(
      insights.some(
        (i) => i.insightType === 'trust_wording' && /not a diagnosis/i.test(i.summary),
      ),
    ).toBe(true);
    expect(insights.some((i) => i.insightType === 'privacy_requirement')).toBe(true);
  });

  it('extracts professional_opinion_conflict when Curavon should change medication', () => {
    const { insights } = extractFormInsights({
      sourceBatchId: 'batch-fixture-5',
      responses: [PILOT_FIXTURE[5]!],
    });

    const conflict = insights.find(
      (insight) => insight.insightType === 'professional_opinion_conflict',
    );

    expect(conflict).toBeDefined();
    expect(conflict?.approvedFor).toBe('safety_review_only');
    expect(conflict?.productUse).toContain('do_not_promote_without_review');
    expect(conflict?.medicalTruth).toBe(false);
  });

  it('extracts feature requests and lifestyle context', () => {
    const { insights } = extractFormInsights({
      sourceBatchId: 'batch-fixture-6',
      responses: [PILOT_FIXTURE[4]!],
    });

    expect(insights.some((i) => i.insightType === 'feature_request')).toBe(true);
    expect(insights.some((i) => i.insightType === 'lifestyle_context')).toBe(true);
  });

  it('aggregates evidence with supportCount, sourceRoles, and rowRefs', () => {
    const { insights, responseCount } = extractFormInsights({
      sourceBatchId: 'batch-fixture-7',
      responses: PILOT_FIXTURE,
    });

    expect(responseCount).toBe(6);
    expect(insights.length).toBeGreaterThan(0);

    for (const insight of insights) {
      expect(insight.medicalTruth).toBe(false);
      expect(insight.confidence).toBe('low');
      expect(insight.status).toBe('review');
      expect(insight.evidence.supportCount).toBeGreaterThanOrEqual(1);
      expect(insight.evidence.sourceRoles.length).toBeGreaterThanOrEqual(1);
      expect(insight.evidence.rowRefs.length).toBeGreaterThanOrEqual(1);
      expect(insight.evidence.matchedPatterns?.length).toBeGreaterThanOrEqual(1);
    }

    const feverInsight = insights.find(
      (insight) =>
        insight.insightType === 'common_concern' && insight.summary.includes('Fever or malaria'),
    );
    expect(feverInsight?.evidence.supportCount).toBe(1);
    expect(feverInsight?.evidence.rowRefs).toContain('r1');
    expect(feverInsight?.evidence.sourceRoles).toContain('patient');
  });

  it('assigns product_context_only to UX insights and safety_review_only to safety insights', () => {
    const { insights } = extractFormInsights({
      sourceBatchId: 'batch-fixture-8',
      responses: PILOT_FIXTURE,
    });

    const productInsight = insights.find((i) => i.insightType === 'feature_request');
    const safetyInsight = insights.find((i) => i.insightType === 'red_flag_candidate');

    expect(productInsight?.approvedFor).toBe('product_context_only');
    expect(safetyInsight?.approvedFor).toBe('safety_review_only');
  });
});
