import { describe, expect, it } from 'vitest';
import {
  buildProfessionalSummaryPreview,
  resolveProfessionalSummaryType,
} from '../lib/health-intelligence/services/professionalSummaryBuilder';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';
import { isHealthIntelligenceResponseAllowed } from '../lib/health-intelligence/services/responseSafetyValidator';

function expectSafeCopy(text: string): void {
  expect(isHealthIntelligenceResponseAllowed(text), text).toBe(true);
}

function fieldLabels(preview: ReturnType<typeof buildProfessionalSummaryPreview>): string[] {
  return preview.fields.map((field) => field.label);
}

describe('buildProfessionalSummaryPreview', () => {
  it('builds fever module summary with conditional lab field', () => {
    const withoutLab = buildProfessionalSummaryPreview({
      selectedModuleIds: ['fever_malaria_ng_v1'],
      primaryModuleId: 'fever_malaria_ng_v1',
      rawText: 'my body hot since yesterday',
      riskLevel: 'medium',
    });

    expect(withoutLab.summaryType).toBe('doctor');
    expect(fieldLabels(withoutLab)).toEqual([
      'Main concern',
      'When it started',
      'Temperature if known',
      'Other symptoms',
      'Fluids and urine',
      'Medicines already taken',
      'Questions for clinician',
    ]);
    expect(fieldLabels(withoutLab)).not.toContain('Tests/lab results');

    const withLab = buildProfessionalSummaryPreview({
      selectedModuleIds: ['fever_malaria_ng_v1', 'lab_result_confusion_ng_v1'],
      primaryModuleId: 'fever_malaria_ng_v1',
      rawText: 'fever since yesterday and my Widal is 1:160',
      riskLevel: 'medium',
    });

    expect(fieldLabels(withLab)).toContain('Tests/lab results');
    expect(fieldLabels(withLab).indexOf('Tests/lab results')).toBeLessThan(
      fieldLabels(withLab).indexOf('Questions for clinician'),
    );
  });

  it('builds headache module summary fields', () => {
    const preview = buildProfessionalSummaryPreview({
      selectedModuleIds: ['headache_ng_v1'],
      primaryModuleId: 'headache_ng_v1',
      riskLevel: 'medium',
    });

    expect(preview.summaryType).toBe('doctor');
    expect(fieldLabels(preview)).toEqual([
      'Headache description',
      'Start and pattern',
      'Severity',
      'Vision changes',
      'Weakness, confusion, or speech symptoms',
      'Blood pressure reading if known',
      'Medicines already taken',
      'Questions for clinician',
    ]);
  });

  it('prefers pharmacist summary type and medication-specific fields', () => {
    const routing = routeHealthModules({
      rawText: 'chemist gave me drug and now my body is itching',
    });
    const preview = buildProfessionalSummaryPreview({
      rawText: 'chemist gave me drug and now my body is itching',
      selectedModuleIds: routing.selectedModules.map((module) => module.moduleId),
      primaryModuleId: routing.primaryModuleId,
      riskLevel: routing.riskLevel,
    });

    expect(preview.summaryType).toBe('pharmacist');
    expect(resolveProfessionalSummaryType({ selectedModuleIds: ['medication_question_ng_v1'] })).toBe(
      'pharmacist',
    );
    expect(fieldLabels(preview)).toEqual([
      'Medicine name',
      'Where it came from',
      'When taken',
      'Instructions received',
      'What changed after taking it',
      'Allergies',
      'Questions for pharmacist',
    ]);
  });

  it('prefers lab_follow_up summary type and lab-specific fields', () => {
    const routing = routeHealthModules({
      rawText: 'my Widal is 1:160 do I have typhoid',
    });
    const preview = buildProfessionalSummaryPreview({
      rawText: 'my Widal is 1:160 do I have typhoid',
      selectedModuleIds: routing.selectedModules.map((module) => module.moduleId),
      primaryModuleId: routing.primaryModuleId,
      riskLevel: routing.riskLevel,
    });

    expect(preview.summaryType).toBe('lab_follow_up');
    expect(fieldLabels(preview)).toEqual([
      'Test name',
      'Date and facility',
      'Result section you are confused about',
      'Symptoms now',
      'Who ordered the test',
      'Medicines started because of result',
      'Questions for clinician',
    ]);
  });

  it('builds clinic/pharmacy prep summary fields', () => {
    const routing = routeHealthModules({
      rawText: 'prepare for doctor visit tomorrow',
      moduleHints: ['clinic_pharmacy_prep_ng_v1'],
    });
    const preview = buildProfessionalSummaryPreview({
      rawText: 'prepare for doctor visit tomorrow',
      selectedModuleIds: routing.selectedModules.map((module) => module.moduleId),
      primaryModuleId: routing.primaryModuleId,
      riskLevel: routing.riskLevel,
    });

    expect(preview.summaryType).toBe('general');
    expect(fieldLabels(preview)).toEqual([
      'Visit type',
      'Main concern',
      'Timeline',
      'Medicines',
      'Lab/test documents',
      'Top questions',
      'Blocker',
    ]);
  });

  it('returns labels only with no field values', () => {
    const preview = buildProfessionalSummaryPreview({
      selectedModuleIds: ['fever_malaria_ng_v1'],
      primaryModuleId: 'fever_malaria_ng_v1',
      riskLevel: 'high',
    });

    for (const field of preview.fields) {
      expect(field).toEqual({ fieldId: expect.any(String), label: expect.any(String) });
      expect(field).not.toHaveProperty('value');
    }
  });

  it('never includes diagnosis or prescription wording in title, labels, or footer', () => {
    const scenarios = [
      { selectedModuleIds: ['medication_question_ng_v1'] as const, riskLevel: 'medium' as const },
      { selectedModuleIds: ['lab_result_confusion_ng_v1'] as const, riskLevel: 'high' as const },
      { selectedModuleIds: ['fever_malaria_ng_v1'] as const, riskLevel: 'high' as const },
      { selectedModuleIds: ['headache_ng_v1'] as const, riskLevel: 'medium' as const },
      { selectedModuleIds: ['clinic_pharmacy_prep_ng_v1'] as const, riskLevel: 'low' as const },
    ];

    for (const scenario of scenarios) {
      const preview = buildProfessionalSummaryPreview({
        selectedModuleIds: [...scenario.selectedModuleIds],
        primaryModuleId: scenario.selectedModuleIds[0],
        riskLevel: scenario.riskLevel,
      });

      expectSafeCopy(preview.title);
      expectSafeCopy(preview.footer);
      for (const field of preview.fields) {
        expect(field.label.toLowerCase()).not.toMatch(
          /\b(prescrib|take amoxicillin|take antimalarial|you have malaria|you have typhoid|dosage|dose)\b/,
        );
      }
    }
  });
});
