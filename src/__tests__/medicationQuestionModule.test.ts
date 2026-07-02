import { describe, expect, it } from 'vitest';
import { HEALTH_MODULE_BY_ID } from '../lib/health-intelligence';
import { validatePriorityModuleQuality } from '../lib/health-intelligence/modules/moduleQuality';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { bridgeRedFlags } from '../lib/health-intelligence/services/redFlagBridge';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

const STOP_START_PATTERN =
  /\b(start|stop|continue)\s+(taking\s+)?(your\s+)?(this\s+)?(medication|medicine|drug|antibiotic|antimalarial)\b/i;

describe('medication_question_ng_v1 Phase 2 module', () => {
  const medicationModule = HEALTH_MODULE_BY_ID.medication_question_ng_v1;

  it('passes Phase 2 production quality checks', () => {
    const result = validatePriorityModuleQuality(medicationModule);
    if (!result.passed) {
      const summary = result.issues.map((issue) => `${issue.checkId}: ${issue.message}`).join('\n');
      expect.fail(`medication_question_ng_v1 quality failed:\n${summary}`);
    }
    expect(result.passed).toBe(true);
  });

  it('is version 1.1.0 in review status', () => {
    expect(medicationModule.status).toBe('review');
    expect(medicationModule.version).toBe('1.1.0');
  });

  it('routes chemist gave me drug and body itching to medication and skin modules', () => {
    const routing = routeHealthModules({
      rawText: 'chemist gave me drug and body itching after drug',
    });
    const moduleIds = routing.selectedModules.map((module) => module.moduleId);

    expect(moduleIds).toEqual(
      expect.arrayContaining(['medication_question_ng_v1', 'skin_rash_itching_ng_v1']),
    );
    expect(routing.primaryModuleId).toBe('medication_question_ng_v1');
  });

  it('does not answer stop or start for can I stop this drug', () => {
    const result = runHealthIntelligencePipeline({ rawText: 'can I stop this drug' });
    const blob = `${result.message} ${result.nextStep}`.toLowerCase();

    expect(result.selectedModules.some((module) => module.moduleId === 'medication_question_ng_v1')).toBe(
      true,
    );
    expect(blob).not.toMatch(STOP_START_PATTERN);
    expect(blob).not.toMatch(/\byou should stop\b/);
    expect(blob).not.toMatch(/\byou can stop\b/);
    expect(blob).not.toMatch(/\bkeep taking\b/);
    expect(result.safety.allowed).toBe(true);
  });

  it('escalates allergic reaction terms to urgent care', () => {
    const urgentInputs = ['difficulty breathing after medicine', 'took too many pills by mistake'];

    for (const rawText of urgentInputs) {
      const bridge = bridgeRedFlags(rawText);
      const pipeline = runHealthIntelligencePipeline({ rawText });

      expect(bridge.isUrgent).toBe(true);
      expect(pipeline.riskLevel).toBe('urgent');
      expect(pipeline.safety.allowed).toBe(false);
    }

    const swellingText = 'chemist gave me drug and throat swelling after medicine';
    const routing = routeHealthModules({ rawText: swellingText });
    const questions = generateGuidedQuestions({
      rawText: swellingText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(questions.length).toBeGreaterThanOrEqual(1);
    expect(questions[0]?.type).toBe('red_flag');
  });

  it('pharmacist summary fields include medicine name, source, timing, reaction, and questions', () => {
    const labels = medicationModule.summary_fields.map((field) => field.label.toLowerCase());

    expect(labels.some((label) => label.includes('medicine name'))).toBe(true);
    expect(labels.some((label) => label.includes('where medicine came from') || label.includes('source'))).toBe(
      true,
    );
    expect(labels.some((label) => label.includes('when taken'))).toBe(true);
    expect(labels.some((label) => label.includes('changed after') || label.includes('reaction'))).toBe(true);
    expect(labels.some((label) => label.includes('questions for pharmacist'))).toBe(true);
  });

  it('covers required medication trigger phrases', () => {
    const terms = medicationModule.entry_triggers
      .flatMap((trigger) => trigger.terms)
      .join(' ')
      .toLowerCase();

    const requiredPhrases = [
      'chemist gave me drug',
      'pharmacy gave me medicine',
      'took malaria drug',
      'took antibiotics',
      'injection',
      'side effect',
      'body itching after drug',
      'swelling after medicine',
      'missed medicine',
      'double dose',
      'drug no work',
      'medicine is making me weak',
      'can i stop this drug',
      'should i continue this drug',
    ];

    for (const phrase of requiredPhrases) {
      expect(terms, `missing trigger phrase: ${phrase}`).toContain(phrase);
    }
  });

  it('includes expanded overlap modules in the seed', () => {
    expect(medicationModule.overlapping_modules).toEqual(
      expect.arrayContaining([
        'missed_medication_ng_v1',
        'skin_rash_itching_ng_v1',
        'fever_malaria_ng_v1',
        'lab_result_confusion_ng_v1',
        'pregnancy_concern_ng_v1',
        'child_fever_illness_ng_v1',
      ]),
    );
  });
});
