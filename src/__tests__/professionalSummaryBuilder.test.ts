import { describe, expect, it } from 'vitest';
import {
  buildProfessionalSummaryPreview,
  resolveProfessionalSummaryType,
} from '../lib/health-intelligence/services/professionalSummaryBuilder';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';
import { isHealthIntelligenceResponseAllowed } from '../lib/health-intelligence/services/responseSafetyValidator';

const REQUIRED_FIELD_LABELS = [
  'Main concern',
  'When it started',
  'Symptoms noticed',
  'Severity',
  'Medication already taken',
  'Known conditions',
  'Allergies',
  'Red flags checked',
  'Questions for health worker',
];

function expectSafeCopy(text: string): void {
  expect(isHealthIntelligenceResponseAllowed(text), text).toBe(true);
}

function fieldLabels(preview: ReturnType<typeof buildProfessionalSummaryPreview>): string[] {
  return preview.fields.map((field) => field.label);
}

describe('buildProfessionalSummaryPreview', () => {
  it('uses pharmacist summary type for medication module', () => {
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
    expect(fieldLabels(preview)).toEqual(
      expect.arrayContaining([
        'Medication already taken',
        'Allergies',
        'Questions for health worker',
      ]),
    );
    expect(fieldLabels(preview).indexOf('Medication already taken')).toBeLessThan(
      fieldLabels(preview).indexOf('Severity'),
    );
  });

  it('uses lab_follow_up summary type for lab result module', () => {
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
    expect(fieldLabels(preview)).toContain('Tests/lab results');
    expect(fieldLabels(preview).indexOf('Tests/lab results')).toBeLessThan(
      fieldLabels(preview).indexOf('Severity'),
    );
  });

  it('uses doctor summary type for fever symptom concern', () => {
    const routing = routeHealthModules({ rawText: 'my body hot since yesterday' });
    const preview = buildProfessionalSummaryPreview({
      rawText: 'my body hot since yesterday',
      selectedModuleIds: routing.selectedModules.map((module) => module.moduleId),
      primaryModuleId: routing.primaryModuleId,
      riskLevel: routing.riskLevel,
    });

    expect(preview.summaryType).toBe('doctor');
    for (const label of REQUIRED_FIELD_LABELS) {
      expect(fieldLabels(preview)).toContain(label);
    }
    expect(fieldLabels(preview).indexOf('Red flags checked')).toBeLessThan(
      fieldLabels(preview).indexOf('Medication already taken'),
    );
  });

  it('uses general summary type for clinic-prep module', () => {
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
    for (const label of REQUIRED_FIELD_LABELS) {
      expect(fieldLabels(preview)).toContain(label);
    }
    expect(fieldLabels(preview)).not.toContain('Tests/lab results');
  });

  it('returns labels only with no field values in Phase 1', () => {
    const preview = buildProfessionalSummaryPreview({
      selectedModuleIds: ['fever_malaria_ng_v1'],
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
      { selectedModuleIds: ['clinic_pharmacy_prep_ng_v1'] as const, riskLevel: 'low' as const },
    ];

    for (const scenario of scenarios) {
      const preview = buildProfessionalSummaryPreview({
        selectedModuleIds: [...scenario.selectedModuleIds],
        riskLevel: scenario.riskLevel,
      });

      expectSafeCopy(preview.title);
      expectSafeCopy(preview.footer);
      for (const field of preview.fields) {
        expect(field.label.toLowerCase()).not.toMatch(
          /\b(prescrib|take amoxicillin|take antimalarial|you have malaria|you have typhoid)\b/,
        );
      }
    }
  });
});
