import { describe, expect, it } from 'vitest';
import { bridgeRedFlags } from '../lib/health-intelligence/services/redFlagBridge';
import { composeModuleAwareIntakeMessage } from '../lib/health-intelligence/services/moduleResponseComposer';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { normalizeNigerianHealthLanguage } from '../lib/health-intelligence/services/languageNormalizer';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';
import { buildProfessionalSummaryPreview } from '../lib/health-intelligence/services/professionalSummaryBuilder';
import {
  buildFormInsightProductContext,
  canInsightInfluenceLiveBehavior,
  getFormInsightModuleHintsForText,
} from '../lib/form-insights';
import { createDraftFormInsight, type FormInsight } from '../lib/form-insights/types';
import type { HealthModuleId } from '../lib/health-intelligence/modules/moduleIds';

const OBSCURE_PHRASE = 'zzcuravon_route_signal_x9';

function createInsight(
  overrides: Partial<FormInsight> & Pick<FormInsight, 'insightId' | 'insightType' | 'summary'>,
): FormInsight {
  return createDraftFormInsight({
    insightId: overrides.insightId,
    sourceBatchId: 'batch_test',
    insightType: overrides.insightType,
    summary: overrides.summary,
    evidence: overrides.evidence ?? {
      supportCount: 3,
      sourceRoles: ['patient'],
      rowRefs: ['resp_1'],
      matchedPatterns: overrides.evidence?.matchedPatterns,
    },
    confidence: overrides.confidence,
    approvedFor: overrides.approvedFor,
    linkedModules: overrides.linkedModules ?? [],
    productUse: overrides.productUse,
    status: overrides.status ?? 'approved',
  });
}

function approvedPhraseInsight(term: string, moduleId: HealthModuleId): FormInsight {
  return createInsight({
    insightId: `phrase_${term.replace(/\s+/g, '_')}`,
    insightType: 'nigerian_phrase',
    summary: term,
    status: 'approved',
    evidence: {
      supportCount: 4,
      sourceRoles: ['patient'],
      rowRefs: ['resp_1'],
      matchedPatterns: [term],
    },
    linkedModules: [{ moduleId, influenceTypes: ['trigger'] }],
  });
}

describe('approved form insight product context integration', () => {
  it('lets an approved phrase improve module routing', () => {
    const rawText = `My ${OBSCURE_PHRASE} since morning`;
    const insight = approvedPhraseInsight(OBSCURE_PHRASE, 'lab_result_confusion_ng_v1');
    const context = buildFormInsightProductContext({ insights: [insight] });
    const hints = getFormInsightModuleHintsForText(rawText, context);

    expect(hints).toContain('lab_result_confusion_ng_v1');

    const withoutHints = routeHealthModules({ rawText });
    const withHints = routeHealthModules({ rawText, moduleHints: hints });

    expect(withoutHints.selectedModules.map((module) => module.moduleId)).not.toContain(
      'lab_result_confusion_ng_v1',
    );
    expect(withHints.selectedModules.map((module) => module.moduleId)).toContain(
      'lab_result_confusion_ng_v1',
    );

    const normalization = normalizeNigerianHealthLanguage(rawText, { formInsightContext: context });
    expect(normalization.moduleHints).toContain('lab_result_confusion_ng_v1');
  });

  it('auto-promotes low-risk phrase insights without manual approval', () => {
    const rawText = `My ${OBSCURE_PHRASE} since morning`;
    const phraseInsight = approvedPhraseInsight(OBSCURE_PHRASE, 'lab_result_confusion_ng_v1');
    phraseInsight.status = 'review';

    expect(canInsightInfluenceLiveBehavior(phraseInsight)).toBe(true);

    const context = buildFormInsightProductContext({ insights: [phraseInsight] });
    expect(getFormInsightModuleHintsForText(rawText, context)).toContain('lab_result_confusion_ng_v1');
  });

  it('does not let shadow-below-threshold insights affect live routing', () => {
    const rawText = 'body hot since yesterday';
    const concern = createInsight({
      insightId: 'concern_shadow',
      insightType: 'common_concern',
      summary: 'Fever or malaria-related concern mentioned',
      status: 'review',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
      linkedModules: [{ moduleId: 'fever_malaria_ng_v1', influenceTypes: ['trigger'] }],
    });

    const context = buildFormInsightProductContext({ insights: [concern] });
    expect(context.routingTriggers).toHaveLength(0);
    expect(getFormInsightModuleHintsForText(rawText, context)).toHaveLength(0);
  });

  it('does not let red_flag_candidate insights auto-change the red flag engine', () => {
    const rawText = 'severe chest pain and difficulty breathing';
    const redFlagInsight = createInsight({
      insightId: 'red_flag_test',
      insightType: 'red_flag_candidate',
      summary: 'Chest pain language',
      status: 'approved',
      approvedFor: 'safety_review_only',
      linkedModules: [{ moduleId: 'chest_pain_ng_v1', influenceTypes: ['guardrail'] }],
    });

    const context = buildFormInsightProductContext({ insights: [redFlagInsight] });
    expect(context.routingTriggers).toHaveLength(0);
    expect(context.appliedInsightIds).toHaveLength(0);

    const baseline = bridgeRedFlags(rawText);
    const withContext = bridgeRedFlags(rawText);
    expect(withContext.isUrgent).toBe(baseline.isUrgent);
    expect(withContext.hits.length).toBe(baseline.hits.length);
  });

  it('does not let medication-risk insights create medication advice in intake copy', () => {
    const medicationInsight = createInsight({
      insightId: 'med_risk_test',
      insightType: 'unsafe_medication_pattern',
      summary: 'Respondent expects Curavon to stop antimalarial medicine',
      status: 'approved',
      approvedFor: 'safety_review_only',
      linkedModules: [{ moduleId: 'medication_question_ng_v1', influenceTypes: ['guardrail'] }],
    });

    const context = buildFormInsightProductContext({ insights: [medicationInsight] });
    expect(context.responseCopyLines).toHaveLength(0);

    const message = composeModuleAwareIntakeMessage({
      rawText: 'I took malaria drugs from chemist',
      selectedModules: [{ moduleId: 'medication_question_ng_v1' }],
      primaryModuleId: 'medication_question_ng_v1',
      normalizedTerms: [],
      riskLevel: 'low',
      questions: [],
      nextStep: 'Continue',
      redFlags: [],
      formInsightContext: context,
    });

    expect(message.toLowerCase()).not.toMatch(/you should (take|stop|start)/);
    expect(message).toContain('without telling you to start, stop, or change a medicine');
  });

  it('adds summary field candidates for auto-promoted types without manual approval', () => {
    const approvedSummaryInsight = createInsight({
      insightId: 'summary_field_visit_checklist',
      insightType: 'summary_field_candidate',
      summary: 'Visit checklist items to bring',
      status: 'approved',
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1', influenceTypes: ['summary_field'] },
      ],
    });

    const reviewSummaryInsight = createInsight({
      insightId: 'summary_field_review_only',
      insightType: 'summary_field_candidate',
      summary: 'Pending reviewer field',
      status: 'review',
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1', influenceTypes: ['summary_field'] },
      ],
    });

    const context = buildFormInsightProductContext({
      insights: [approvedSummaryInsight, reviewSummaryInsight],
    });

    expect(context.summaryFieldCandidates).toHaveLength(2);
    expect(context.summaryFieldCandidates[0]?.fieldId).toBe(
      'form_insight_summary_field_visit_checklist',
    );

    const preview = buildProfessionalSummaryPreview({
      selectedModuleIds: ['clinic_pharmacy_prep_ng_v1'],
      primaryModuleId: 'clinic_pharmacy_prep_ng_v1',
      formInsightContext: context,
    });

    expect(preview.fields.some((field) => field.fieldId === 'form_insight_summary_field_visit_checklist')).toBe(
      true,
    );
    expect(preview.fields.some((field) => field.fieldId === 'form_insight_summary_field_review_only')).toBe(
      true,
    );
  });

  it('adds approved blocker options to guided questions', () => {
    const blockerInsight = createInsight({
      insightId: 'blocker_cost',
      insightType: 'care_blocker',
      summary: 'Drug cost is too high',
      status: 'approved',
      linkedModules: [{ moduleId: 'clinic_pharmacy_prep_ng_v1', influenceTypes: ['blocker'] }],
    });

    const context = buildFormInsightProductContext({ insights: [blockerInsight] });
    const questions = generateGuidedQuestions({
      rawText: 'Need clinic visit help',
      selectedModules: ['clinic_pharmacy_prep_ng_v1'],
      primaryModuleId: 'clinic_pharmacy_prep_ng_v1',
      formInsightContext: context,
    });

    expect(
      questions.some(
        (question) =>
          question.type === 'care_blocker' &&
          question.question.includes('Drug cost is too high'),
      ),
    ).toBe(true);
  });

  it('adds approved trust wording to response copy', () => {
    const trustInsight = createInsight({
      insightId: 'trust_clear_notes',
      insightType: 'trust_wording',
      summary: 'Users trust when Curavon says notes are for clinician review only',
      status: 'approved',
      linkedModules: [
        { moduleId: 'clinic_pharmacy_prep_ng_v1', influenceTypes: ['response_copy'] },
      ],
    });

    const context = buildFormInsightProductContext({ insights: [trustInsight] });
    const message = composeModuleAwareIntakeMessage({
      rawText: 'Help me prepare for clinic',
      selectedModules: [{ moduleId: 'clinic_pharmacy_prep_ng_v1' }],
      primaryModuleId: 'clinic_pharmacy_prep_ng_v1',
      normalizedTerms: [],
      riskLevel: 'low',
      questions: [],
      nextStep: 'Continue',
      redFlags: [],
      formInsightContext: context,
    });

    expect(message).toContain('clinician review only');
  });
});
