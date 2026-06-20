import { describe, expect, it } from 'vitest';
import { detectUrgentConcern, hasUrgentHealthLanguage } from '../utils/healthSafety';

describe('healthSafety detectUrgentConcern', () => {
  const urgentCases = [
    ['I have chest pain', 'chest pain'],
    ['I am having trouble breathing', 'trouble breathing'],
    ["I can't breathe", "can't breathe"],
    ['I am fainting', 'fainting'],
    ['worst headache of my life', 'worst headache'],
    ['face drooping on one side', 'face drooping'],
    ['sudden weakness on one side', 'sudden weakness'],
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
  ];

  it.each(safeCases)('does not flag safe text: %s', (text) => {
    expect(hasUrgentHealthLanguage(text)).toBe(false);
    expect(detectUrgentConcern(text).hasUrgent).toBe(false);
  });

  it('documents negation false-positive limitation for substring matching', () => {
    expect(detectUrgentConcern('I do not have chest pain').hasUrgent).toBe(true);
  });

  it('documents phrasing gaps for face drooping and fainted', () => {
    expect(detectUrgentConcern('my face is drooping').hasUrgent).toBe(false);
    expect(detectUrgentConcern('I fainted').hasUrgent).toBe(false);
  });
});
