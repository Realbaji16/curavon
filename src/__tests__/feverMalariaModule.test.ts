import { describe, expect, it } from 'vitest';
import { HEALTH_MODULE_BY_ID } from '../lib/health-intelligence';
import { validatePriorityModuleQuality } from '../lib/health-intelligence/modules/moduleQuality';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

const FEVER_INPUT = 'body hot since yesterday and took malaria drug';

describe('fever_malaria_ng_v1 Phase 2 module', () => {
  const feverModule = HEALTH_MODULE_BY_ID.fever_malaria_ng_v1;

  it('passes Phase 2 production quality checks', () => {
    const result = validatePriorityModuleQuality(feverModule);
    if (!result.passed) {
      const summary = result.issues.map((issue) => `${issue.checkId}: ${issue.message}`).join('\n');
      expect.fail(`fever_malaria_ng_v1 quality failed:\n${summary}`);
    }
    expect(result.passed).toBe(true);
  });

  it('is version 1.1.0 in review status', () => {
    expect(feverModule.status).toBe('review');
    expect(feverModule.version).toBe('1.1.0');
  });

  it('routes body hot since yesterday and took malaria drug', () => {
    const routing = routeHealthModules({ rawText: FEVER_INPUT });
    const moduleIds = routing.selectedModules.map((module) => module.moduleId);

    expect(moduleIds).toEqual(
      expect.arrayContaining(['fever_malaria_ng_v1', 'medication_question_ng_v1']),
    );
    expect(routing.primaryModuleId).toBe('fever_malaria_ng_v1');
  });

  it('asks worsening, medication, and fever safety screening questions', () => {
    const routing = routeHealthModules({ rawText: FEVER_INPUT });
    const questions = generateGuidedQuestions({
      rawText: FEVER_INPUT,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(questions.length).toBeLessThanOrEqual(5);
    expect(questions.some((question) => question.type === 'medication_context')).toBe(true);
    expect(questions.some((question) => question.type === 'red_flag')).toBe(true);
    expect(
      questions.some(
        (question) =>
          question.type === 'severity' ||
          /worse|improving|hottest|temperature/i.test(question.question),
      ),
    ).toBe(true);
  });

  it('pipeline message does not say you have malaria', () => {
    const result = runHealthIntelligencePipeline({ rawText: FEVER_INPUT });
    const blob = `${result.message} ${result.nextStep}`.toLowerCase();

    expect(result.safety.allowed).toBe(true);
    expect(blob).not.toMatch(/\byou have malaria\b/);
    expect(blob).not.toMatch(/\byou have typhoid\b/);
    expect(result.selectedModules.some((module) => module.moduleId === 'fever_malaria_ng_v1')).toBe(
      true,
    );
  });

  it('summary fields include medicines already taken and lab or test context', () => {
    const labels = feverModule.summary_fields.map((field) => field.label.toLowerCase());
    expect(labels.some((label) => label.includes('medicines already taken'))).toBe(true);
    expect(labels.some((label) => label.includes('lab') || label.includes('test'))).toBe(true);
  });

  it('includes expanded overlap modules in the seed', () => {
    expect(feverModule.overlapping_modules).toEqual(
      expect.arrayContaining([
        'headache_ng_v1',
        'medication_question_ng_v1',
        'lab_result_confusion_ng_v1',
        'cough_catarrh_ng_v1',
        'diarrhea_vomiting_ng_v1',
        'pregnancy_concern_ng_v1',
        'child_fever_illness_ng_v1',
      ]),
    );
  });

  it('covers required Nigerian fever trigger phrases', () => {
    const terms = feverModule.entry_triggers
      .flatMap((trigger) => trigger.terms)
      .join(' ')
      .toLowerCase();

    const requiredPhrases = [
      'body hot',
      'hot body',
      'fever',
      'temperature',
      'chills',
      'shivering',
      'cold and hot',
      'malaria',
      'malaria and typhoid',
      'typhoid',
      'weakness with fever',
      'fever since yesterday',
      'took malaria drug',
      'still hot after drugs',
    ];

    for (const phrase of requiredPhrases) {
      expect(terms, `missing trigger phrase: ${phrase}`).toContain(phrase);
    }
  });
});
