import { describe, expect, it } from 'vitest';
import { APPROVED_ACTION_IDS, getApprovedAction, isApprovedActionId } from '../lib/health-intelligence/actions/allowedActions';
import { findHealthIntelligenceBlockedViolations } from '../lib/health-intelligence/actions/blockedOutputs';
import { resolveNextBestAction } from '../lib/health-intelligence/services/nextBestActionPolicy';
import {
  isHealthIntelligenceResponseAllowed,
  validateHealthIntelligenceResponse,
} from '../lib/health-intelligence/services/responseSafetyValidator';

describe('approved actions', () => {
  it('exports all required Phase 1 action IDs', () => {
    expect(APPROVED_ACTION_IDS).toEqual(
      expect.arrayContaining([
        'seek_urgent_care_now',
        'speak_to_health_professional_today',
        'visit_clinic_or_pharmacy_for_guidance',
        'monitor_and_track',
        'prepare_doctor_summary',
        'prepare_pharmacist_summary',
        'avoid_unsafe_medicine_mixing',
        'follow_up_if_worse_or_persistent',
        'save_symptom_timeline',
        'ask_for_test_or_lab_context',
        'answer_guided_questions',
      ]),
    );
    expect(APPROVED_ACTION_IDS).toHaveLength(11);
  });

  it('resolves approved action metadata by id', () => {
    expect(isApprovedActionId('seek_urgent_care_now')).toBe(true);
    expect(getApprovedAction('monitor_and_track').category).toBe('track');
  });
});

describe('nextBestActionPolicy', () => {
  it('selects urgent care for urgent risk with red flags', () => {
    const result = resolveNextBestAction({
      riskLevel: 'urgent',
      primaryModuleId: 'chest_pain_ng_v1',
      selectedModuleIds: ['chest_pain_ng_v1', 'breathing_difficulty_ng_v1'],
      hasRedFlags: true,
    });
    expect(result.actionId).toBe('seek_urgent_care_now');
  });

  it('selects lab context action for lab modules', () => {
    const result = resolveNextBestAction({
      riskLevel: 'high',
      primaryModuleId: 'lab_result_confusion_ng_v1',
      selectedModuleIds: ['lab_result_confusion_ng_v1'],
      labContext: true,
    });
    expect(result.actionId).toBe('ask_for_test_or_lab_context');
  });

  it('selects guided questions when intake is incomplete', () => {
    const result = resolveNextBestAction({
      riskLevel: 'medium',
      primaryModuleId: 'headache_ng_v1',
      selectedModuleIds: ['headache_ng_v1'],
      hasPendingGuidedQuestions: true,
    });
    expect(result.actionId).toBe('answer_guided_questions');
  });
});

describe('responseSafetyValidator', () => {
  it('blocks diagnosis language', () => {
    const result = validateHealthIntelligenceResponse('You have an infection and this is your diagnosis.');
    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toContain('diagnosis');
  });

  it('blocks prescription language', () => {
    expect(isHealthIntelligenceResponseAllowed('I can prescribe antibiotics for you.')).toBe(false);
    expect(findHealthIntelligenceBlockedViolations('Here is your prescription for treatment.').some(
      (v) => v.category === 'prescription',
    )).toBe(true);
  });

  it('blocks dosage language', () => {
    const result = validateHealthIntelligenceResponse('Take the correct dose twice daily.');
    expect(result.allowed).toBe(false);
    expect(result.blockedCategories).toContain('dosage');
  });

  it('blocks emergency minimization', () => {
    const examples = [
      'No need to see a doctor for this.',
      'There is no need for emergency care.',
      'You have malaria',
      'You have typhoid',
      'Take amoxicillin now',
      'Take antimalarial tonight',
      'This is definitely typhoid',
    ];
    for (const text of examples) {
      expect(isHealthIntelligenceResponseAllowed(text), text).toBe(false);
    }
  });

  const safeExamples = [
    'Track when symptoms started and note what changed.',
    'Consider preparing one question for a clinician or pharmacist.',
    'This does not diagnose. Organize your notes for a clinician to review.',
    'If symptoms are severe, sudden, or unsafe, seek urgent care.',
    'Save a symptom timeline and follow up if worse or persistent.',
  ];

  it.each(safeExamples)('allows safe summary/track/professional-care language: %s', (text) => {
    const result = validateHealthIntelligenceResponse(text);
    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });
});
