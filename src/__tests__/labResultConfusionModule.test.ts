import { describe, expect, it } from 'vitest';
import { APPROVED_ACTIONS } from '../lib/health-intelligence/actions/allowedActions';
import { HEALTH_MODULE_BY_ID } from '../lib/health-intelligence';
import { validatePriorityModuleQuality } from '../lib/health-intelligence/modules/moduleQuality';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

const LAB_INPUT = 'Widal 1:160 do I have typhoid';

const TREATMENT_NEXT_STEP_PATTERN =
  /\b(take amoxicillin|take antimalarial|treatment plan|prescrib|start antibiotics|you have typhoid|you have malaria)\b/i;

describe('lab_result_confusion_ng_v1 Phase 2 module', () => {
  const labModule = HEALTH_MODULE_BY_ID.lab_result_confusion_ng_v1;

  it('passes Phase 2 production quality checks', () => {
    const result = validatePriorityModuleQuality(labModule);
    if (!result.passed) {
      const summary = result.issues.map((issue) => `${issue.checkId}: ${issue.message}`).join('\n');
      expect.fail(`lab_result_confusion_ng_v1 quality failed:\n${summary}`);
    }
    expect(result.passed).toBe(true);
  });

  it('is version 1.1.0 in review status', () => {
    expect(labModule.status).toBe('review');
    expect(labModule.version).toBe('1.1.0');
  });

  it('routes Widal 1:160 do I have typhoid to lab and fever modules', () => {
    const routing = routeHealthModules({ rawText: LAB_INPUT });
    const moduleIds = routing.selectedModules.map((module) => module.moduleId);

    expect(moduleIds).toEqual(
      expect.arrayContaining(['lab_result_confusion_ng_v1', 'fever_malaria_ng_v1']),
    );
    expect(routing.primaryModuleId).toBe('lab_result_confusion_ng_v1');
  });

  it('does not diagnose typhoid or malaria in pipeline response', () => {
    const result = runHealthIntelligencePipeline({ rawText: LAB_INPUT });
    const blob = `${result.message} ${result.nextStep}`.toLowerCase();

    expect(result.safety.allowed).toBe(true);
    expect(blob).not.toMatch(/\byou have typhoid\b/);
    expect(blob).not.toMatch(/\byou have malaria\b/);
    expect(blob).not.toMatch(/\bthis confirms typhoid\b/);
    expect(blob).not.toMatch(/\bwidal.*means typhoid\b/);
  });

  it('asks test name, date, symptoms, and who ordered questions', () => {
    const routing = routeHealthModules({ rawText: LAB_INPUT });
    const questions = generateGuidedQuestions({
      rawText: LAB_INPUT,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });
    const prompts = questions.map((question) => question.question.toLowerCase()).join(' ');

    expect(questions.some((question) => question.moduleId === 'lab_result_confusion_ng_v1')).toBe(true);
    expect(prompts).toMatch(/test name|name as written|what test was done|name on the slip/);
    expect(prompts).toMatch(/when was the test done|date/);
    expect(prompts).toMatch(/symptom/);
    expect(prompts).toMatch(/ordered/);
  });

  it('next step favors professional review or summary, not treatment', () => {
    const result = runHealthIntelligencePipeline({ rawText: LAB_INPUT });
    const blob = `${result.nextStep} ${result.message}`;

    expect(blob).not.toMatch(TREATMENT_NEXT_STEP_PATTERN);
    expect(
      result.nextStep.includes(APPROVED_ACTIONS.answer_guided_questions.instruction.slice(0, 20)) ||
        result.nextStep.includes(APPROVED_ACTIONS.ask_for_test_or_lab_context.instruction.slice(0, 20)),
    ).toBe(true);
    expect(result.summaryPreview.title.toLowerCase()).toMatch(/lab|test|clinician|health/);
  });

  it('covers required lab trigger phrases', () => {
    const terms = labModule.entry_triggers
      .flatMap((trigger) => trigger.terms)
      .join(' ')
      .toLowerCase();

    const requiredPhrases = [
      'lab result',
      'test result',
      'widal',
      'typhoid test',
      'malaria test',
      'mp test',
      'blood test',
      'urine test',
      'scan result',
      'result says positive',
      'result says reactive',
      'salmonella',
      '1:160',
      '1:80',
      "don't understand my result",
      'lab said malaria',
      'lab said typhoid',
    ];

    for (const phrase of requiredPhrases) {
      expect(terms, `missing trigger phrase: ${phrase}`).toContain(phrase);
    }
  });

  it('includes expanded overlap modules in the seed', () => {
    expect(labModule.overlapping_modules).toEqual(
      expect.arrayContaining([
        'fever_malaria_ng_v1',
        'medication_question_ng_v1',
        'clinic_pharmacy_prep_ng_v1',
        'pregnancy_concern_ng_v1',
        'blood_sugar_ng_v1',
        'blood_pressure_ng_v1',
      ]),
    );
  });
});
