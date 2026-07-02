import { describe, expect, it } from 'vitest';
import {
  applyModuleMappingsToInsights,
  buildFormInsightReportFromImportResult,
  buildFormInsightProductContext,
  canInsightInfluenceLiveBehavior,
  extractFormInsights,
  getFormInsightModuleHintsForText,
  mapInsightToModules,
  runFormImport,
} from '../lib/form-insights';
import { createDraftFormInsight } from '../lib/form-insights/types';
import { normalizeNigerianHealthLanguage } from '../lib/health-intelligence/services/languageNormalizer';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

const DOCTOR_CSV = [
  'Timestamp,Full Name,Email,Clinical feedback,State,I consent',
  '3/21/2026 10:00:00,Dr Ada Okafor,ada@clinic.com,Chest pain wording needs urgent care screening not diagnosis,Lagos,Yes',
  '3/21/2026 11:00:00,Dr John Smith,john@clinic.com,Widal and typhoid test confusion in patient notes,Abuja,Yes',
].join('\n');

const PHARMACY_CSV = [
  'Timestamp,Full Name,Email,Pharmacy concern,State,I consent',
  '3/21/2026 10:00:00,Pharm Oka,pharm@example.com,Customers buy antibiotics without prescription every day,Lagos,Yes',
  '3/21/2026 11:00:00,Chemist User,chemist@example.com,People take malaria drugs without test before doctor,Rivers,Yes',
].join('\n');

const MEDICAL_STUDENT_CSV = [
  'Timestamp,Full Name,Email,Learning feedback,State,I consent',
  '3/21/2026 10:00:00,Student One,student@uni.edu,Hospital queue too long and drugs too expensive for patients,Kano,Yes',
  '3/21/2026 11:00:00,Student Two,student2@uni.edu,Wish Curavon had visit checklist for clinic prep,Lagos,Yes',
].join('\n');

const CONFLICT_CSV = [
  'Timestamp,Concern,I consent',
  '3/21/2026 10:00:00,Curavon should tell users to stop the drug when itching starts,Yes',
].join('\n');

const OBSCURE_APPROVED_PHRASE = 'zzcuravon_phase3_accept_x9';

function importRoleFixture(filename: string, csvText: string, sourceRole: 'doctor' | 'pharmacy' | 'medical_student') {
  return runFormImport({
    sourceName: filename.replace(/\.csv$/i, ''),
    sourceRole,
    filename,
    csvText,
    batchId: `batch_${sourceRole}_acceptance`,
  });
}

function approvedPhraseInsight(term: string) {
  return createDraftFormInsight({
    insightId: 'phrase_acceptance',
    sourceBatchId: 'batch_acceptance',
    insightType: 'nigerian_phrase',
    summary: term,
    status: 'approved',
    evidence: {
      supportCount: 5,
      sourceRoles: ['patient'],
      rowRefs: ['resp_1'],
      matchedPatterns: [term],
    },
    linkedModules: [{ moduleId: 'lab_result_confusion_ng_v1', influenceTypes: ['trigger'] }],
  });
}

describe('Healthy.Ai Phase 3 acceptance', () => {
  it('1. imports doctor, pharmacy, and medical-student fixture CSVs successfully', () => {
    const doctor = importRoleFixture('Doctor Pilot.csv', DOCTOR_CSV, 'doctor');
    const pharmacy = importRoleFixture('Pharmacy Feedback.csv', PHARMACY_CSV, 'pharmacy');
    const student = importRoleFixture('Medical Student.csv', MEDICAL_STUDENT_CSV, 'medical_student');

    for (const result of [doctor, pharmacy, student]) {
      expect(result.rowCount).toBeGreaterThan(0);
      expect(result.insights.length).toBeGreaterThan(0);
      expect(result.moduleMappings.length).toBe(result.insights.length);
    }
  });

  it('2. de-identifies form rows (no direct identifiers in payloads)', () => {
    const result = importRoleFixture('Doctor Pilot.csv', DOCTOR_CSV, 'doctor');

    for (const response of result.normalizedResponses) {
      expect(response.deidentifiedAnswers).not.toHaveProperty('Full Name');
      expect(response.deidentifiedAnswers).not.toHaveProperty('Email');
      expect(JSON.stringify(response.deidentifiedAnswers)).not.toContain('ada@clinic.com');
      expect(JSON.stringify(response.deidentifiedAnswers)).not.toContain('Dr Ada Okafor');
    }
  });

  it('3. generates insights with medicalTruth=false', () => {
    const result = importRoleFixture('Pharmacy Feedback.csv', PHARMACY_CSV, 'pharmacy');

    expect(result.insights.length).toBeGreaterThan(0);
    for (const insight of result.insights) {
      expect(insight.medicalTruth).toBe(false);
    }
  });

  it('4. classifies medication stop/start advice as professional_opinion_conflict', () => {
    const result = runFormImport({
      sourceName: 'conflict-fixture',
      sourceRole: 'patient',
      filename: 'Patient.csv',
      csvText: CONFLICT_CSV,
      batchId: 'batch_conflict',
    });

    expect(
      result.insights.some((insight) => insight.insightType === 'professional_opinion_conflict'),
    ).toBe(true);
    expect(
      result.insights.some(
        (insight) =>
          insight.insightType === 'professional_opinion_conflict' &&
          /stop|start|change/i.test(insight.summary),
      ),
    ).toBe(true);
  });

  it('5. maps antibiotic and malaria-drug misuse to medication module guardrail', () => {
    const result = importRoleFixture('Pharmacy Feedback.csv', PHARMACY_CSV, 'pharmacy');
    const medicationInsights = result.insights.filter(
      (insight) => insight.insightType === 'unsafe_medication_pattern',
    );

    expect(medicationInsights.length).toBeGreaterThan(0);

    const mapped = medicationInsights.flatMap((insight) => mapInsightToModules(insight).linkedModules);
    expect(
      mapped.some(
        (link) =>
          link.moduleId === 'medication_question_ng_v1' && link.influenceTypes.includes('guardrail'),
      ),
    ).toBe(true);
  });

  it('6. maps Widal/typhoid confusion to lab result and fever modules', () => {
    const result = importRoleFixture('Doctor Pilot.csv', DOCTOR_CSV, 'doctor');
    const labConcern = result.insights.find(
      (insight) =>
        insight.insightType === 'common_concern' && /lab|test result|widal|typhoid/i.test(insight.summary),
    );

    expect(labConcern).toBeDefined();
    if (!labConcern) return;

    const mapped = mapInsightToModules({
      ...labConcern,
      summary: 'Widal test result confusion and typhoid test worry',
    });

    const moduleIds = mapped.linkedModules.map((link) => link.moduleId);
    expect(moduleIds).toContain('lab_result_confusion_ng_v1');
    expect(moduleIds).toContain('fever_malaria_ng_v1');
  });

  it('7. maps cost blockers to clinic/pharmacy prep module', () => {
    const result = importRoleFixture('Medical Student.csv', MEDICAL_STUDENT_CSV, 'medical_student');
    const blockers = result.insights.filter((insight) => insight.insightType === 'care_blocker');

    expect(blockers.some((insight) => /cost|afford|expensive/i.test(insight.summary))).toBe(true);
    expect(blockers.some((insight) => /queue|waiting/i.test(insight.summary))).toBe(true);

    const costBlocker = blockers.find((insight) => /cost|afford|expensive/i.test(insight.summary));
    expect(costBlocker).toBeDefined();
    if (!costBlocker) return;

    const mapped = mapInsightToModules(costBlocker);
    expect(mapped.linkedModules.some((link) => link.moduleId === 'clinic_pharmacy_prep_ng_v1')).toBe(
      true,
    );
    expect(mapped.influenceTypes).toContain('blocker');
  });

  it('8. lets an approved phrase insight influence routing', () => {
    const rawText = `Need help with ${OBSCURE_APPROVED_PHRASE} today`;
    const approved = approvedPhraseInsight(OBSCURE_APPROVED_PHRASE);
    const context = buildFormInsightProductContext({ insights: [approved] });
    const hints = getFormInsightModuleHintsForText(rawText, context);

    expect(hints).toContain('lab_result_confusion_ng_v1');

    const withoutHints = routeHealthModules({ rawText });
    const withHints = routeHealthModules({ rawText, moduleHints: hints });

    expect(withoutHints.selectedModules.map((m) => m.moduleId)).not.toContain(
      'lab_result_confusion_ng_v1',
    );
    expect(withHints.selectedModules.map((m) => m.moduleId)).toContain('lab_result_confusion_ng_v1');

    const normalization = normalizeNigerianHealthLanguage(rawText, { formInsightContext: context });
    expect(normalization.moduleHints).toContain('lab_result_confusion_ng_v1');
  });

  it('9. prevents quarantined and shadow-below-threshold insights from affecting live behavior', () => {
    const rawText = `Need help with ${OBSCURE_APPROVED_PHRASE} today`;

    const quarantinedInsight = createDraftFormInsight({
      insightId: 'quarantine_phrase',
      sourceBatchId: 'batch_accept',
      insightType: 'red_flag_candidate',
      summary: OBSCURE_APPROVED_PHRASE,
      status: 'approved',
      approvedFor: 'safety_review_only',
      evidence: {
        supportCount: 5,
        sourceRoles: ['patient'],
        rowRefs: ['r1'],
        matchedPatterns: [OBSCURE_APPROVED_PHRASE],
      },
      linkedModules: [{ moduleId: 'lab_result_confusion_ng_v1', influenceTypes: ['trigger'] }],
    });

    expect(canInsightInfluenceLiveBehavior(quarantinedInsight)).toBe(false);

    const context = buildFormInsightProductContext({ insights: [quarantinedInsight] });
    expect(context.routingTriggers).toHaveLength(0);
    expect(getFormInsightModuleHintsForText(rawText, context)).toHaveLength(0);
    expect(context.appliedInsightIds).toHaveLength(0);

    const shadowConcern = createDraftFormInsight({
      insightId: 'shadow_concern',
      sourceBatchId: 'batch_accept',
      insightType: 'common_concern',
      summary: 'Fever concern',
      status: 'review',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
      linkedModules: [{ moduleId: 'fever_malaria_ng_v1', influenceTypes: ['trigger'] }],
    });

    expect(canInsightInfluenceLiveBehavior(shadowConcern)).toBe(false);
    const shadowContext = buildFormInsightProductContext({ insights: [shadowConcern] });
    expect(shadowContext.routingTriggers).toHaveLength(0);
  });

  it('10. report includes limitations and product-evidence warnings', () => {
    const result = importRoleFixture('Pharmacy Feedback.csv', PHARMACY_CSV, 'pharmacy');
    const report = buildFormInsightReportFromImportResult(result);

    expect(report).toContain('## Limitations');
    expect(report).toContain('product research evidence, not clinical evidence');
    expect(report).toContain('Sample size is low');
    expect(report).toContain('## Do Not Promote Without Review');
    expect(report).not.toContain('pharm@example.com');
  });

  it('maps extracted insights through module mapper end-to-end', () => {
    const responses = importRoleFixture('Pharmacy Feedback.csv', PHARMACY_CSV, 'pharmacy')
      .normalizedResponses;
    const extracted = extractFormInsights({
      sourceBatchId: 'batch_e2e',
      responses,
    });
    const mapped = applyModuleMappingsToInsights(extracted.insights);

    expect(mapped.every((insight) => insight.medicalTruth === false)).toBe(true);
    expect(mapped.some((insight) => insight.linkedModules.length > 0)).toBe(true);
  });
});
