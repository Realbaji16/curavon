import { describe, expect, it } from 'vitest';
import {
  getModuleQuestionStrategy,
  getStrategyEnforcedQuestionIds,
  GLOBAL_MAX_GUIDED_QUESTIONS,
  moduleQuestionKey,
  resolveMaxGuidedQuestions,
} from '../lib/health-intelligence/services/moduleQuestionStrategy';

describe('moduleQuestionStrategy', () => {
  it('exports strategies for all five Phase 2 modules', () => {
    const moduleIds = [
      'fever_malaria_ng_v1',
      'headache_ng_v1',
      'medication_question_ng_v1',
      'lab_result_confusion_ng_v1',
      'clinic_pharmacy_prep_ng_v1',
    ] as const;

    for (const moduleId of moduleIds) {
      const strategy = getModuleQuestionStrategy(moduleId);
      expect(strategy, moduleId).not.toBeNull();
      expect(strategy?.maxQuestions).toBeLessThanOrEqual(GLOBAL_MAX_GUIDED_QUESTIONS);
      expect(strategy?.firstPriorityQuestionIds.length).toBeGreaterThan(0);
    }
  });

  it('returns null for non-Phase-2 modules', () => {
    expect(getModuleQuestionStrategy('stomach_pain_ng_v1')).toBeNull();
  });

  it('prioritizes medication medicine name, source, and reaction', () => {
    const strategy = getModuleQuestionStrategy('medication_question_ng_v1');
    expect(strategy?.firstPriorityQuestionIds).toEqual(
      expect.arrayContaining(['medicine_name', 'medicine_source', 'changes_after']),
    );
    expect(strategy?.medicationQuestionIds).toEqual(
      expect.arrayContaining(['medicine_name', 'medicine_source', 'changes_after']),
    );
  });

  it('prioritizes lab test name, date, symptoms, and who ordered', () => {
    const strategy = getModuleQuestionStrategy('lab_result_confusion_ng_v1');
    expect(strategy?.firstPriorityQuestionIds).toEqual(
      expect.arrayContaining(['test_name', 'test_date', 'symptoms_led_to_test', 'who_ordered']),
    );
  });

  it('prioritizes clinic visit type, concern, and top questions', () => {
    const strategy = getModuleQuestionStrategy('clinic_pharmacy_prep_ng_v1');
    expect(strategy?.firstPriorityQuestionIds[0]).toBe('visit_type');
    expect(strategy?.firstPriorityQuestionIds).toContain('main_concern');
    expect(strategy?.firstPriorityQuestionIds).toContain('top_questions');
    expect(strategy?.summaryPrepQuestionIds).toContain('test_results_bring');
  });

  it('builds stable module question keys', () => {
    expect(moduleQuestionKey('headache_ng_v1', 'onset')).toBe('headache_ng_v1:onset');
  });

  it('caps guided questions at the global max', () => {
    expect(resolveMaxGuidedQuestions('fever_malaria_ng_v1')).toBe(GLOBAL_MAX_GUIDED_QUESTIONS);
    expect(resolveMaxGuidedQuestions('stomach_pain_ng_v1')).toBe(GLOBAL_MAX_GUIDED_QUESTIONS);
  });

  it('defines enforced must-include question ids per Phase 2 module', () => {
    const labStrategy = getModuleQuestionStrategy('lab_result_confusion_ng_v1')!;
    expect(getStrategyEnforcedQuestionIds('lab_result_confusion_ng_v1', labStrategy)).toEqual([
      'lab_result_confusion_ng_v1:test_name',
      'lab_result_confusion_ng_v1:test_date',
      'lab_result_confusion_ng_v1:symptoms_led_to_test',
      'lab_result_confusion_ng_v1:who_ordered',
    ]);
  });
});
