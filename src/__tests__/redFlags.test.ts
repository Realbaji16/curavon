import { describe, expect, it } from 'vitest';
import {
  detectRedFlags,
  getRedFlagRegistry,
  hasUrgentRedFlag,
  type RedFlagCategory,
} from '../lib/health/redFlags';
import { detectUrgentConcern, hasUrgentHealthLanguage } from '../utils/healthSafety';
import { detectIntakeRedFlags, hasUrgentIntakeSignals } from '../utils/askIntakeRules';
import { EMPTY_ASK_INTAKE } from '../types/askIntake';

describe('redFlags registry', () => {
  const requiredCategories: RedFlagCategory[] = [
    'chest_pain',
    'difficulty_breathing',
    'fainting',
    'stroke_symptoms',
    'severe_allergic_reaction',
    'severe_bleeding',
    'seizure',
    'self_harm',
    'pregnancy_emergency',
    'severe_abdominal_pain',
    'severe_dehydration',
    'confusion_severe_weakness',
    'high_fever_danger',
    'severe_infection',
    'severe_eye',
    'overdose_poisoning',
    'infant_child_emergency',
    'domestic_violence',
  ];

  it('includes all required categories', () => {
    const categories = new Set(getRedFlagRegistry().map((entry) => entry.category));
    for (const category of requiredCategories) {
      expect(categories.has(category)).toBe(true);
    }
  });

  const triggerCases: Array<[string, RedFlagCategory]> = [
    ['I have chest pain and pressure', 'chest_pain'],
    ['I cannot breathe', 'difficulty_breathing'],
    ['I fainted this morning', 'fainting'],
    ['My face is drooping', 'stroke_symptoms'],
    ['My throat is swelling after eating', 'severe_allergic_reaction'],
    ['I had a seizure', 'seizure'],
    ['I took too many pills', 'overdose_poisoning'],
    ['I am pregnant and bleeding heavily', 'pregnancy_emergency'],
    ['My baby has a high fever and is very weak', 'infant_child_emergency'],
    ['I want to harm myself', 'self_harm'],
    ['My partner is threatening me right now', 'domestic_violence'],
  ];

  it.each(triggerCases)('detects urgent red flag: %s', (text, category) => {
    const result = detectRedFlags(text);
    expect(result.hasUrgent).toBe(true);
    expect(result.categories).toContain(category);
    expect(hasUrgentRedFlag(text)).toBe(true);
  });

  const safeCases = [
    'I do not have chest pain',
    'No trouble breathing',
    'I am not suicidal',
    'I did not faint',
    'I feel tired today',
    'I want to prepare for a doctor visit',
  ];

  it.each(safeCases)('does not flag safe text: %s', (text) => {
    expect(hasUrgentRedFlag(text)).toBe(false);
    expect(detectRedFlags(text).hasUrgent).toBe(false);
  });

  it('treats historical chest pain with current negation as non-urgent', () => {
    const text = 'I had chest pain last year but not now';
    expect(detectRedFlags(text).hasUrgent).toBe(false);
    expect(hasUrgentHealthLanguage(text)).toBe(false);
  });

  it('marks self-harm and immediate safety with appropriate copy', () => {
    const selfHarm = detectRedFlags('I want to harm myself');
    expect(selfHarm.selfHarm).toBe(true);
    expect(selfHarm.title).toContain('immediate support');

    const safety = detectRedFlags('My partner is threatening me right now');
    expect(safety.immediateSafety).toBe(true);
    expect(safety.title).toContain('safety');
  });

  it('healthSafety wrapper stays compatible', () => {
    const result = detectUrgentConcern('I have chest pain');
    expect(result.hasUrgent).toBe(true);
    expect(result.matches).toContain('chest pain');
    expect(result.selfHarm).toBe(false);
  });
});

describe('ask intake red-flag integration', () => {
  it('blocks normal self-care when free-text red flags appear without checkbox selection', () => {
    const intake = {
      ...EMPTY_ASK_INTAKE,
      mainConcern: 'I cannot breathe and feel very weak',
    };
    expect(hasUrgentIntakeSignals(intake)).toBe(true);
    expect(detectIntakeRedFlags(intake).hasUrgent).toBe(true);
  });

  it('allows normal flow when no red flags are present', () => {
    const intake = {
      ...EMPTY_ASK_INTAKE,
      mainConcern: 'Mild headache for two days',
      redFlags: ['None of these'],
    };
    expect(hasUrgentIntakeSignals(intake)).toBe(false);
  });
});
