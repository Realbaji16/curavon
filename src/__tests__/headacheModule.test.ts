import { describe, expect, it } from 'vitest';
import { HEALTH_MODULE_BY_ID } from '../lib/health-intelligence';
import {
  isHealthIntelligenceOutputBlocked,
  validateHealthIntelligenceResponse,
} from '../lib/health-intelligence';
import { validatePriorityModuleQuality } from '../lib/health-intelligence/modules/moduleQuality';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

const UNSAFE_HEADACHE_OUTPUTS = [
  'You have migraine and should take ibuprofen twice daily.',
  'This is just stress, no need to see a doctor.',
  'You have hypertension from this headache.',
  'Take amoxicillin for the headache.',
];

describe('headache_ng_v1 Phase 2 module', () => {
  const headacheModule = HEALTH_MODULE_BY_ID.headache_ng_v1;

  it('passes Phase 2 production quality checks', () => {
    const result = validatePriorityModuleQuality(headacheModule);
    if (!result.passed) {
      const summary = result.issues.map((issue) => `${issue.checkId}: ${issue.message}`).join('\n');
      expect.fail(`headache_ng_v1 quality failed:\n${summary}`);
    }
    expect(result.passed).toBe(true);
  });

  it('is version 1.1.0 in review status', () => {
    expect(headacheModule.status).toBe('review');
    expect(headacheModule.version).toBe('1.1.0');
  });

  it('routes head dey bang to headache module', () => {
    const routing = routeHealthModules({ rawText: 'my head dey bang since morning' });
    const moduleIds = routing.selectedModules.map((module) => module.moduleId);

    expect(moduleIds).toContain('headache_ng_v1');
    expect(routing.primaryModuleId).toBe('headache_ng_v1');
  });

  it('routes headache and blurry vision with red-flag questions first', () => {
    const rawText = 'headache and blurry vision since morning';
    const routing = routeHealthModules({ rawText });
    const questions = generateGuidedQuestions({
      rawText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(routing.selectedModules.map((module) => module.moduleId)).toContain('headache_ng_v1');
    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(questions[0]?.type).toBe('red_flag');
    expect(questions[0]?.question.toLowerCase()).toMatch(/vision|weakness|confusion|face drooping/);
  });

  it('routes headache and BP to headache and blood pressure modules', () => {
    const routing = routeHealthModules({ rawText: 'headache and BP reading was high' });
    const moduleIds = routing.selectedModules.map((module) => module.moduleId);

    expect(moduleIds).toEqual(
      expect.arrayContaining(['headache_ng_v1', 'blood_pressure_ng_v1']),
    );
  });

  it('blocks diagnosis and prescription language in safety validator', () => {
    for (const text of UNSAFE_HEADACHE_OUTPUTS) {
      expect(isHealthIntelligenceOutputBlocked(text)).toBe(true);
      expect(validateHealthIntelligenceResponse(text).allowed).toBe(false);
    }
  });

  it('pipeline does not diagnose migraine or hypertension', () => {
    const result = runHealthIntelligencePipeline({ rawText: 'my head dey bang and migraine worry' });
    const blob = `${result.message} ${result.nextStep}`.toLowerCase();

    expect(result.safety.allowed).toBe(true);
    expect(blob).not.toMatch(/\byou have migraine\b/);
    expect(blob).not.toMatch(/\byou have hypertension\b/);
    expect(blob).not.toMatch(/\bthis is just stress\b/);
  });

  it('covers required Nigerian and English headache trigger phrases', () => {
    const terms = headacheModule.entry_triggers
      .flatMap((trigger) => trigger.terms)
      .join(' ')
      .toLowerCase();

    const requiredPhrases = [
      'headache',
      'head pain',
      'head dey bang',
      'head is banging',
      'heavy head',
      'pressure in my head',
      'migraine',
      'blurry vision with headache',
      'headache and bp',
      'headache after no sleep',
      'headache after stress',
      'headache with fever',
    ];

    for (const phrase of requiredPhrases) {
      expect(terms, `missing trigger phrase: ${phrase}`).toContain(phrase);
    }
  });
});
