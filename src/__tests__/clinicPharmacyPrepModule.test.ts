import { describe, expect, it } from 'vitest';
import { HEALTH_MODULE_BY_ID } from '../lib/health-intelligence';
import { validatePriorityModuleQuality } from '../lib/health-intelligence/modules/moduleQuality';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

describe('clinic_pharmacy_prep_ng_v1 Phase 2 module', () => {
  const clinicModule = HEALTH_MODULE_BY_ID.clinic_pharmacy_prep_ng_v1;

  it('passes Phase 2 production quality checks', () => {
    const result = validatePriorityModuleQuality(clinicModule);
    if (!result.passed) {
      const summary = result.issues.map((issue) => `${issue.checkId}: ${issue.message}`).join('\n');
      expect.fail(`clinic_pharmacy_prep_ng_v1 quality failed:\n${summary}`);
    }
    expect(result.passed).toBe(true);
  });

  it('is version 1.1.0 in review status', () => {
    expect(clinicModule.status).toBe('review');
    expect(clinicModule.version).toBe('1.1.0');
  });

  it('routes what should I tell doctor to clinic prep', () => {
    const routing = routeHealthModules({ rawText: 'what should I tell doctor at clinic tomorrow' });
    const moduleIds = routing.selectedModules.map((module) => module.moduleId);

    expect(moduleIds).toContain('clinic_pharmacy_prep_ng_v1');
    expect(routing.primaryModuleId).toBe('clinic_pharmacy_prep_ng_v1');
  });

  it('routes pharmacy phrasing to clinic prep and medication when medicine is mentioned', () => {
    const routing = routeHealthModules({
      rawText: 'pharmacy visit tomorrow and need to ask pharmacist about my medicine',
    });
    const moduleIds = routing.selectedModules.map((module) => module.moduleId);

    expect(moduleIds).toEqual(
      expect.arrayContaining(['clinic_pharmacy_prep_ng_v1', 'medication_question_ng_v1']),
    );
  });

  it('urgent symptoms override planned visit', () => {
    const routing = routeHealthModules({
      rawText: 'going to clinic tomorrow but chest pain now',
    });
    const pipeline = runHealthIntelligencePipeline({
      rawText: 'going to clinic tomorrow but chest pain now',
    });

    expect(routing.selectedModules.map((module) => module.moduleId)).toContain('clinic_pharmacy_prep_ng_v1');
    expect(routing.primaryModuleId).toBe('chest_pain_ng_v1');
    expect(pipeline.riskLevel).toBe('urgent');
    expect(pipeline.safety.allowed).toBe(false);
    expect(pipeline.safety.blockedReason).toBe('urgent_red_flags');
  });

  it('summary fields include visit type, timeline, meds, labs, questions, and blockers', () => {
    const labels = clinicModule.summary_fields.map((field) => field.label.toLowerCase());

    expect(labels.some((label) => label.includes('visit type'))).toBe(true);
    expect(labels.some((label) => label.includes('timeline'))).toBe(true);
    expect(labels.some((label) => label.includes('medicines'))).toBe(true);
    expect(labels.some((label) => label.includes('test results') || label.includes('lab'))).toBe(true);
    expect(labels.some((label) => label.includes('questions'))).toBe(true);
    expect(labels.some((label) => label.includes('blocker'))).toBe(true);
  });

  it('covers required clinic and pharmacy trigger phrases', () => {
    const terms = clinicModule.entry_triggers
      .flatMap((trigger) => trigger.terms)
      .join(' ')
      .toLowerCase();

    const requiredPhrases = [
      'going to clinic',
      'going to hospital',
      'see doctor',
      'doctor appointment',
      'pharmacy visit',
      'go to chemist',
      'ask pharmacist',
      'what should i tell doctor',
      'prepare for doctor',
      'prepare summary',
      'what questions should i ask',
      "don't know where to start",
      'hospital queue',
      'clinic tomorrow',
    ];

    for (const phrase of requiredPhrases) {
      expect(terms, `missing trigger phrase: ${phrase}`).toContain(phrase);
    }
  });

  it('includes expanded overlap modules in the seed', () => {
    expect(clinicModule.overlapping_modules).toEqual(
      expect.arrayContaining([
        'medication_question_ng_v1',
        'lab_result_confusion_ng_v1',
        'fever_malaria_ng_v1',
        'headache_ng_v1',
        'blood_pressure_ng_v1',
        'pregnancy_concern_ng_v1',
        'child_fever_illness_ng_v1',
      ]),
    );
  });
});
