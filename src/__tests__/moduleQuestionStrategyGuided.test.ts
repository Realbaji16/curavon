import { describe, expect, it } from 'vitest';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { moduleQuestionKey } from '../lib/health-intelligence/services/moduleQuestionStrategy';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

const FORBIDDEN_QUESTION_PATTERNS = [
  /\bdo you have\b/i,
  /\bshould (you|i) take\b/i,
  /\bwhat dose\b/i,
  /\bhow many (tablets|pills)\b/i,
  /\brecommend\b.*\b(medicine|drug)\b/i,
];

function questionIds(questions: ReturnType<typeof generateGuidedQuestions>): string[] {
  return questions.map((question) => question.id);
}

describe('Phase 2 module question strategy in guidedQuestionEngine', () => {
  it('fever + took malaria drug prioritizes duration, medication taken, and red flags', () => {
    const rawText = 'my body hot and I took malaria drug';
    const routing = routeHealthModules({ rawText });
    const questions = generateGuidedQuestions({
      rawText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(questions[0]?.type).toBe('red_flag');
    expect(questions.some((question) => question.type === 'red_flag')).toBe(true);

    const ids = questionIds(questions);
    expect(ids).toContain(moduleQuestionKey('fever_malaria_ng_v1', 'onset'));
    expect(ids).toContain(moduleQuestionKey('fever_malaria_ng_v1', 'medicines_taken'));

    const timingIndex = questions.findIndex((question) => question.type === 'timing');
    const medicationIndex = questions.findIndex((question) => question.type === 'medication_context');
    expect(timingIndex).toBeGreaterThanOrEqual(0);
    expect(medicationIndex).toBeGreaterThanOrEqual(0);
    expect(timingIndex).toBeLessThan(medicationIndex);
  });

  it('headache + blurry vision prioritizes red flags', () => {
    const rawText = 'headache and blurry vision since morning';
    const routing = routeHealthModules({ rawText });
    const questions = generateGuidedQuestions({
      rawText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(questions[0]?.type).toBe('red_flag');
    expect(questions[0]?.question.toLowerCase()).toMatch(/vision|weakness|confusion|face drooping/);
  });

  it('lab result prioritizes test name, date, and symptoms', () => {
    const rawText = 'my Widal is 1:160 do I have typhoid';
    const routing = routeHealthModules({ rawText });
    const questions = generateGuidedQuestions({
      rawText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });
    const prompts = questions.map((question) => question.question.toLowerCase()).join(' ');

    expect(prompts).toMatch(/test name|name as written|what test was done|name on the slip/);
    expect(prompts).toMatch(/when was the test done|date/);
    expect(prompts).toMatch(/symptom/);
  });

  it('medication reaction prioritizes medicine, reaction, and urgent allergy signs', () => {
    const rawText = 'chemist gave me drug and body itching after drug';
    const routing = routeHealthModules({ rawText });
    const questions = generateGuidedQuestions({
      rawText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });
    const ids = questionIds(questions);
    const prompts = questions.map((question) => question.question.toLowerCase()).join(' ');

    expect(questions[0]?.type).toBe('red_flag');
    expect(questions[0]?.question.toLowerCase()).toMatch(/breathing|swelling|rash/);
    expect(ids).toContain(moduleQuestionKey('medication_question_ng_v1', 'medicine_name'));
    expect(ids).toContain(moduleQuestionKey('medication_question_ng_v1', 'medicine_source'));
    expect(prompts).toMatch(/changed after|what changed/);
  });

  it('clinic prep prioritizes visit type and top questions', () => {
    const rawText = 'what should I tell doctor at clinic tomorrow';
    const routing = routeHealthModules({ rawText });
    const questions = generateGuidedQuestions({
      rawText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });
    const ids = questionIds(questions);

    expect(routing.primaryModuleId).toBe('clinic_pharmacy_prep_ng_v1');
    expect(ids).toContain(moduleQuestionKey('clinic_pharmacy_prep_ng_v1', 'visit_type'));
    expect(ids).toContain(moduleQuestionKey('clinic_pharmacy_prep_ng_v1', 'top_questions'));
    expect(ids.indexOf(moduleQuestionKey('clinic_pharmacy_prep_ng_v1', 'visit_type'))).toBeLessThan(
      ids.indexOf(moduleQuestionKey('clinic_pharmacy_prep_ng_v1', 'top_questions')),
    );
  });

  it('never returns more than 5 questions and avoids diagnosis-forcing prompts', () => {
    const rawText =
      'chest pain and breathing fast, chemist gave me drug, pregnant and bleeding, my baby body hot, widal result confusing';
    const routing = routeHealthModules({ rawText });
    const questions = generateGuidedQuestions({
      rawText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
    });

    expect(questions.length).toBeLessThanOrEqual(5);
    for (const question of questions) {
      for (const pattern of FORBIDDEN_QUESTION_PATTERNS) {
        expect(pattern.test(question.question), question.question).toBe(false);
      }
    }
  });
});
