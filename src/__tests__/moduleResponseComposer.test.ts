import { describe, expect, it } from 'vitest';
import { APPROVED_ACTIONS } from '../lib/health-intelligence/actions/allowedActions';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { composeModuleAwareIntakeMessage } from '../lib/health-intelligence/services/moduleResponseComposer';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';
import { validateHealthIntelligenceResponse } from '../lib/health-intelligence/services/responseSafetyValidator';

function composeForScenario(rawText: string): string {
  const routing = routeHealthModules({ rawText });
  const guidedQuestions = generateGuidedQuestions({
    rawText,
    selectedModules: routing.selectedModules,
    primaryModuleId: routing.primaryModuleId,
  });
  const questions = guidedQuestions.map((question) => ({
    id: question.id,
    prompt: question.question,
    source: question.generatedBy === 'module' ? ('module_required' as const) : ('ai_generated' as const),
    moduleId: question.moduleId,
  }));

  return composeModuleAwareIntakeMessage({
    rawText,
    selectedModules: routing.selectedModules,
    primaryModuleId: routing.primaryModuleId,
    normalizedTerms: [],
    riskLevel: routing.riskLevel,
    questions,
    nextStep: APPROVED_ACTIONS.answer_guided_questions.instruction,
    redFlags: [],
  });
}

function expectSafeMessage(message: string): void {
  const validation = validateHealthIntelligenceResponse(message);
  expect(validation.allowed, validation.violations.map((v) => v.label).join(', ')).toBe(true);
  expect(message.toLowerCase()).toMatch(/not a diagnosis|does not diagnose/);
}

describe('composeModuleAwareIntakeMessage', () => {
  it('fever message does not say you have malaria', () => {
    const message = composeForScenario('my body hot since yesterday and took malaria drug');

    expect(message.toLowerCase()).not.toMatch(/\byou have malaria\b/);
    expect(message.toLowerCase()).toMatch(/fever|hot body|body feeling hot/);
    expect(message.toLowerCase()).toMatch(/medicine|taken/);
    expectSafeMessage(message);
  });

  it('lab result message does not interpret result', () => {
    const message = composeForScenario('my Widal is 1:160 do I have typhoid');

    expect(message.toLowerCase()).not.toMatch(/\byou have typhoid\b/);
    expect(message.toLowerCase()).not.toMatch(/\bthis means\b/);
    expect(message.toLowerCase()).not.toMatch(/\bdefinitely\b/);
    expect(message.toLowerCase()).toMatch(/test name|test slip|clinician|professional review/);
    expectSafeMessage(message);
  });

  it('medication message does not advise stop, start, or change', () => {
    const message = composeForScenario('chemist gave me drug and body itching after drug');

    expect(message.toLowerCase()).not.toMatch(/\byou should stop\b/);
    expect(message.toLowerCase()).not.toMatch(/\byou should start\b/);
    expect(message.toLowerCase()).not.toMatch(/\bchange your medicine\b/);
    expect(message.toLowerCase()).toMatch(/organize|medicine|what changed/);
    expectSafeMessage(message);
  });

  it('headache blurry vision message explains safety questions first', () => {
    const message = composeForScenario('headache and blurry vision since morning');

    expect(message.toLowerCase()).toMatch(/safety/);
    expect(message.toLowerCase()).toMatch(/vision/);
    expect(message.toLowerCase()).toMatch(/before organizing|before/);
    expectSafeMessage(message);
  });

  it('clinic prep message mentions clear notes and questions', () => {
    const message = composeForScenario('what should I tell doctor at clinic tomorrow');

    expect(message.toLowerCase()).toMatch(/clinic|pharmacy/);
    expect(message.toLowerCase()).toMatch(/notes|questions/);
    expectSafeMessage(message);
  });

  it('passes responseSafetyValidator across Phase 2 module scenarios', () => {
    const scenarios = [
      'my body hot since yesterday and took malaria drug',
      'my Widal is 1:160 do I have typhoid',
      'chemist gave me drug and body itching after drug',
      'headache and blurry vision since morning',
      'what should I tell doctor at clinic tomorrow',
      'my head dey bang and migraine worry',
      'my belle dey pain me and I am stooling',
    ];

    for (const rawText of scenarios) {
      const message = composeForScenario(rawText);
      expectSafeMessage(message);
    }
  });
});
