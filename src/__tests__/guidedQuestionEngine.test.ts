import { describe, expect, it } from 'vitest';
import { detectRedFlags } from '../lib/health/redFlags';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

const FORBIDDEN_QUESTION_PATTERNS = [
  /\bdo you have\b/i,
  /\bshould (you|i) take\b/i,
  /\bwhat dose\b/i,
  /\bhow many (tablets|pills)\b/i,
  /\brecommend\b.*\b(medicine|drug)\b/i,
];

describe('generateGuidedQuestions', () => {
  it('asks red-flag/safety questions first for headache with blurry vision', () => {
    const routing = routeHealthModules({ rawText: 'headache and blurry vision since morning' });
    const questions = generateGuidedQuestions({
      rawText: 'headache and blurry vision since morning',
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(questions.length).toBeGreaterThanOrEqual(2);
    expect(questions[0]?.type).toBe('red_flag');
    expect(questions.some((q) => q.type === 'red_flag')).toBe(true);
    expect(questions[0]?.question.toLowerCase()).toMatch(/vision|weakness|confusion|face drooping/);
  });

  it('asks duration and medication already taken for fever with malaria drug', () => {
    const routing = routeHealthModules({
      rawText: 'my body hot and I took malaria drug',
    });
    const questions = generateGuidedQuestions({
      rawText: 'my body hot and I took malaria drug',
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(questions.some((q) => q.type === 'timing')).toBe(true);
    expect(questions.some((q) => q.type === 'medication_context')).toBe(true);

    const timingIndex = questions.findIndex((q) => q.type === 'timing');
    const medicationIndex = questions.findIndex((q) => q.type === 'medication_context');
    expect(timingIndex).toBeGreaterThanOrEqual(0);
    expect(medicationIndex).toBeGreaterThanOrEqual(0);
    expect(timingIndex).toBeLessThan(medicationIndex);
  });

  it('asks symptoms and test context for lab result confusion', () => {
    const routing = routeHealthModules({
      rawText: 'my Widal is 1:160 do I have typhoid',
    });
    const questions = generateGuidedQuestions({
      rawText: 'my Widal is 1:160 do I have typhoid',
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(questions.some((q) => /symptom/i.test(q.question))).toBe(true);
    expect(questions.some((q) => /test|slip|result/i.test(q.question))).toBe(true);
    expect(questions.some((q) => q.moduleId === 'lab_result_confusion_ng_v1')).toBe(true);
  });

  it('never returns more than 5 questions', () => {
    const routing = routeHealthModules({
      rawText:
        'chest pain and breathing fast, chemist gave me drug, pregnant and bleeding, my baby body hot, widal result confusing',
    });
    const redFlagResult = detectRedFlags(
      'chest pain and breathing fast, pregnant and bleeding, my baby body hot',
    );
    const questions = generateGuidedQuestions({
      rawText:
        'chest pain and breathing fast, chemist gave me drug, pregnant and bleeding, my baby body hot, widal result confusing',
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
      redFlagResult,
    });

    expect(questions.length).toBeLessThanOrEqual(5);
    expect(questions.length).toBeGreaterThanOrEqual(2);
  });

  it('does not emit diagnosis-forcing or prescribing questions', () => {
    const routing = routeHealthModules({
      rawText: 'headache and blurry vision since morning',
    });
    const questions = generateGuidedQuestions({
      rawText: 'headache and blurry vision since morning',
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    for (const question of questions) {
      for (const pattern of FORBIDDEN_QUESTION_PATTERNS) {
        expect(pattern.test(question.question), question.question).toBe(false);
      }
    }
  });

  it('uses redFlagResult hits to prioritize safety questions', () => {
    const routing = routeHealthModules({ rawText: 'chest pain and breathing fast' });
    const redFlagResult = detectRedFlags('chest pain and breathing fast');
    const questions = generateGuidedQuestions({
      rawText: 'chest pain and breathing fast',
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
      redFlagResult,
    });

    expect(questions[0]?.type).toBe('red_flag');
  });
});
