import { describe, expect, it } from 'vitest';
import { FLOW_RUNNERS } from '../data/guides/flowRunners';
import {
  applyMultiOptionToggle,
  detectRunnerUrgent,
  formatAnswer,
  isAnswered,
  shouldBlockRunnerCompletion,
  showMoodSafetyInlineMessage,
} from '../lib/guides/flowRunnerUtils';

describe('flowRunnerUtils', () => {
  describe('formatAnswer', () => {
    it('formats multi, scale, string, and empty values', () => {
      expect(formatAnswer(['Chest pain', 'Fainting'])).toBe('Chest pain, Fainting');
      expect(formatAnswer(7)).toBe('7/10');
      expect(formatAnswer('Today')).toBe('Today');
      expect(formatAnswer(undefined)).toBe('—');
    });
  });

  describe('isAnswered', () => {
    it('requires non-empty answers per question type', () => {
      expect(isAnswered({ id: 'a', prompt: 'p', type: 'multi' }, [])).toBe(false);
      expect(isAnswered({ id: 'a', prompt: 'p', type: 'multi' }, ['Chest pain'])).toBe(true);
      expect(isAnswered({ id: 'a', prompt: 'p', type: 'shortText' }, '   ')).toBe(false);
      expect(isAnswered({ id: 'a', prompt: 'p', type: 'shortText' }, 'note')).toBe(true);
      expect(isAnswered({ id: 'a', prompt: 'p', type: 'scale' }, 4)).toBe(true);
      expect(isAnswered({ id: 'a', prompt: 'p', type: 'single' }, '')).toBe(false);
      expect(isAnswered({ id: 'a', prompt: 'p', type: 'yesno' }, 'Yes')).toBe(true);
    });
  });

  describe('detectRunnerUrgent', () => {
    const somethingRunner = FLOW_RUNNERS['something-feels-off'];
    const moodRunner = FLOW_RUNNERS['mood-stress-checkin'];

    it('detects multi-select urgent options from runner data', () => {
      const result = detectRunnerUrgent(somethingRunner, {
        noticeable: 'Pain or discomfort',
        urgent: ['Chest pain'],
      });
      expect(result.urgent.hasUrgent).toBe(true);
      expect(result.urgent.matches).toContain('chest pain');
      expect(result.signature).toContain('chest pain');
    });

    it('does not flag when only non-urgent multi options are selected', () => {
      const result = detectRunnerUrgent(somethingRunner, {
        noticeable: 'Low energy',
        urgent: ['None of these'],
      });
      expect(result.urgent.hasUrgent).toBe(false);
    });

    it('uses self-harm urgent path for mood safety yes answers', () => {
      const yesResult = detectRunnerUrgent(moodRunner, { safety: 'Yes' });
      expect(yesResult.urgent.hasUrgent).toBe(true);
      expect(yesResult.urgent.selfHarm).toBe(true);
      expect(yesResult.text).toBe('Mood safety answer: Yes');

      const unsureResult = detectRunnerUrgent(moodRunner, { safety: "I'm not sure" });
      expect(unsureResult.urgent.hasUrgent).toBe(true);
      expect(unsureResult.urgent.selfHarm).toBe(true);
    });

    it('does not falsely trigger on unanswered or safe mood answers', () => {
      expect(detectRunnerUrgent(moodRunner, {}).urgent.hasUrgent).toBe(false);
      expect(detectRunnerUrgent(moodRunner, { safety: 'No' }).urgent.hasUrgent).toBe(false);
      expect(detectRunnerUrgent(somethingRunner, { noticeable: 'Low energy' }).urgent.hasUrgent).toBe(false);
    });

    it('preserves urgent markers after data extraction', () => {
      const headacheRunner = FLOW_RUNNERS.headache;
      const urgentQuestion = headacheRunner.questions?.find((q) => q.id === 'headache-urgent');
      expect(urgentQuestion?.options).toContain('Worst headache');
      const result = detectRunnerUrgent(headacheRunner, {
        'headache-urgent': ['Worst headache'],
      });
      expect(result.urgent.hasUrgent).toBe(true);
    });
  });

  describe('applyMultiOptionToggle', () => {
    it('exclusive-selects none/unsure options', () => {
      expect(applyMultiOptionToggle(['Chest pain'], 'None of these')).toEqual(['None of these']);
      expect(applyMultiOptionToggle(['None of these'], 'Chest pain')).toEqual(['Chest pain']);
    });
  });

  describe('shouldBlockRunnerCompletion', () => {
    it('blocks when safety terminal is active or answers are urgent', () => {
      const runner = FLOW_RUNNERS['something-feels-off'];
      expect(shouldBlockRunnerCompletion(true, { urgent: ['Chest pain'] }, runner)).toBe(true);
      expect(shouldBlockRunnerCompletion(false, { urgent: ['Chest pain'] }, runner)).toBe(true);
      expect(shouldBlockRunnerCompletion(false, { urgent: ['None of these'] }, runner)).toBe(false);
    });
  });

  describe('showMoodSafetyInlineMessage', () => {
    it('shows inline mood safety message only for mood flow yes/unsure answers', () => {
      expect(showMoodSafetyInlineMessage('mood-stress-checkin', { safety: 'Yes' })).toBe(true);
      expect(showMoodSafetyInlineMessage('mood-stress-checkin', { safety: "I'm not sure" })).toBe(true);
      expect(showMoodSafetyInlineMessage('mood-stress-checkin', { safety: 'No' })).toBe(false);
      expect(showMoodSafetyInlineMessage('headache', { safety: 'Yes' })).toBe(false);
    });
  });
});
