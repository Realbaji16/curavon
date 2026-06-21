import { describe, expect, it } from 'vitest';
import { detectUrgentConcern, hasUrgentHealthLanguage } from '../utils/healthSafety';

describe('healthSafety detectUrgentConcern', () => {
  const urgentCases = [
    ['I have chest pain', 'chest pain'],
    ['I am having trouble breathing', 'trouble breathing'],
    ["I can't breathe", 'trouble breathing'],
    ['I am fainting', 'fainting'],
    ['I fainted this morning', 'fainting'],
    ['my face is drooping', 'face drooping'],
    ['worst headache of my life', 'worst headache'],
    ['face drooping on one side', 'face drooping'],
    ['sudden weakness on one side', 'face drooping'],
    ['heavy bleeding that will not stop', 'heavy bleeding'],
    ['I want to harm myself', 'suicidal'],
    ['I feel suicidal', 'suicidal'],
  ] as const;

  it.each(urgentCases)('detects urgent language: %s', (text, expectedMatch) => {
    const result = detectUrgentConcern(text);
    expect(result.hasUrgent).toBe(true);
    expect(result.matches).toContain(expectedMatch);
  });

  it('marks self-harm for suicidal language', () => {
    expect(detectUrgentConcern('I feel suicidal').selfHarm).toBe(true);
    expect(detectUrgentConcern('I want to harm myself').selfHarm).toBe(true);
    expect(detectUrgentConcern('I want to kill myself').selfHarm).toBe(true);
    expect(detectUrgentConcern('thoughts of harming myself').selfHarm).toBe(true);
  });

  it('does not mark self-harm for non-self-harm urgent symptoms', () => {
    expect(detectUrgentConcern('I have chest pain').selfHarm).toBe(false);
  });

  const safeCases = [
    'I feel tired today',
    'I want to prepare for a doctor visit',
    'I have mild stress from work',
    'I do not have chest pain',
    'No trouble breathing',
    'I am not suicidal',
    'I did not faint',
  ];

  it.each(safeCases)('does not flag safe text: %s', (text) => {
    expect(hasUrgentHealthLanguage(text)).toBe(false);
    expect(detectUrgentConcern(text).hasUrgent).toBe(false);
  });

  it('does not flag historical chest pain when currently negated', () => {
    expect(detectUrgentConcern('I had chest pain last year but not now').hasUrgent).toBe(false);
  });
});
