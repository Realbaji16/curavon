import { describe, expect, it } from 'vitest';
import {
  createDraftFormInsight,
  defaultApprovedForInsightType,
  FORM_INSIGHT_TYPES,
  FORM_INSIGHT_TAXONOMY,
  FORM_SOURCE_ROLES,
  isAllowedFormInsightApproval,
  isFormInsightType,
  isFormSourceRole,
  isModuleInfluenceType,
  MODULE_INFLUENCE_TYPES,
  type FormInsight,
  type NormalizedFormResponse,
} from '../lib/form-insights';

describe('form-insights domain types', () => {
  it('defines form source roles', () => {
    expect(FORM_SOURCE_ROLES).toHaveLength(7);
    expect(isFormSourceRole('nurse')).toBe(true);
    expect(isFormSourceRole('admin')).toBe(false);
  });

  it('defines all required insight types in taxonomy', () => {
    expect(FORM_INSIGHT_TYPES).toHaveLength(16);
    expect(FORM_INSIGHT_TYPES).toContain('common_concern');
    expect(FORM_INSIGHT_TYPES).toContain('nigerian_phrase');
    expect(FORM_INSIGHT_TYPES).toContain('lifestyle_context');
    for (const type of FORM_INSIGHT_TYPES) {
      expect(FORM_INSIGHT_TAXONOMY[type].defaultApprovedFor).not.toBe('medical_advice');
    }
  });

  it('narrows insight and influence type strings', () => {
    expect(isFormInsightType('care_blocker')).toBe(true);
    expect(isFormInsightType('diagnosis')).toBe(false);
    expect(isModuleInfluenceType('summary_field')).toBe(true);
    expect(isModuleInfluenceType('prescription')).toBe(false);
  });

  it('defaults medicalTruth to false and safe approvedFor on draft insights', () => {
    const insight = createDraftFormInsight({
      insightId: 'ins-1',
      sourceBatchId: 'batch-1',
      insightType: 'nigerian_phrase',
      summary: 'Respondents often say body dey hot',
      evidence: {
        supportCount: 12,
        sourceRoles: ['patient'],
        rowRefs: ['resp-1'],
        matchedPatterns: ['nigerian_phrase'],
      },
    });

    expect(insight.medicalTruth).toBe(false);
    expect(insight.approvedFor).toBe('product_context_only');
    expect(insight.status).toBe('draft');
    expect(insight.confidence).toBe('low');
  });

  it('maps safety-sensitive insight types to safety_review_only by default', () => {
    expect(defaultApprovedForInsightType('red_flag_candidate')).toBe('safety_review_only');
    expect(defaultApprovedForInsightType('unsafe_medication_pattern')).toBe('safety_review_only');
    expect(defaultApprovedForInsightType('guardrail_candidate')).toBe('safety_review_only');
    expect(defaultApprovedForInsightType('common_concern')).toBe('product_context_only');
  });

  it('rejects medical_advice as an approval scope', () => {
    expect(isAllowedFormInsightApproval('product_context_only')).toBe(true);
    expect(isAllowedFormInsightApproval('safety_review_only')).toBe(true);
    expect(isAllowedFormInsightApproval('none')).toBe(true);
    expect(isAllowedFormInsightApproval('medical_advice')).toBe(false);
  });

  it('defines module influence types', () => {
    expect(MODULE_INFLUENCE_TYPES).toHaveLength(8);
    expect(MODULE_INFLUENCE_TYPES).toEqual(
      expect.arrayContaining(['trigger', 'question', 'summary_field', 'guardrail']),
    );
  });

  it('accepts minimal FormInsight and NormalizedFormResponse shapes', () => {
    const insight: FormInsight = createDraftFormInsight({
      insightId: 'ins-2',
      sourceBatchId: 'batch-2',
      insightType: 'module_trigger_candidate',
      summary: 'Phrase "belle dey pain" appears often',
      evidence: {
        supportCount: 8,
        sourceRoles: ['doctor', 'patient'],
        rowRefs: ['resp-2', 'resp-3'],
      },
      confidence: 'medium',
      approvedFor: 'product_context_only',
      linkedModules: [
        { moduleId: 'stomach_pain_ng_v1', influenceTypes: ['trigger', 'question'] },
      ],
      productUse: 'Review stomach_pain entry_triggers',
      status: 'review',
    });

    const response: NormalizedFormResponse = {
      responseId: 'resp-1',
      sourceRole: 'patient',
      consentGranted: true,
      coarseRegion: 'lagos_metro',
      deidentifiedAnswers: { concern: 'body hot since yesterday' },
      rawPayloadHash: 'abc123',
      createdAt: new Date().toISOString(),
    };

    expect(insight.medicalTruth).toBe(false);
    expect(insight.linkedModules[0]?.moduleId).toBe('stomach_pain_ng_v1');
    expect(response.consentGranted).toBe(true);
    expect(response.deidentifiedAnswers.concern).toContain('body hot');
  });
});
