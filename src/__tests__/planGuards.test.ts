import { describe, expect, it } from 'vitest';
import { findMedicalBoundaryViolations, isWithinMedicalBoundary } from '../lib/ai/guards/aiMedicalBoundary';
import { containsDisallowedActionText } from '../lib/plan/planActionBoundaries';
import { validateReasoningResult } from '../lib/plan/planGuards';
import { validatePlanSynthesisResult } from '../lib/plan/planSynthesisGuards';
import type { PlanCandidate } from '../lib/plan/planTypes';

const baselineCandidate: PlanCandidate = {
  id: 'cand-escalate-urgent',
  title: 'Review urgent-support notes',
  actionText: 'Open your doctor-ready summary and make sure the urgent concern is clearly written.',
  category: 'escalate',
  safetyLevel: 'urgent',
  whyCandidateFits: 'Safety path.',
  whenToUse: 'Urgent context.',
  relatedGuide: 'Doctor Visit Prep',
};

describe('plan action boundary patterns', () => {
  const blockedByPlanPatterns = [
    'You have migraine',
    'Start taking medication tonight',
    'Here is your treatment plan',
    'This is definitely a migraine',
    'No need to see a doctor',
    'This is harmless',
  ];

  it.each(blockedByPlanPatterns)('containsDisallowedActionText blocks: %s', (text) => {
    expect(containsDisallowedActionText(text)).toBe(true);
  });

  it('documents pattern gaps for some medication phrasing and dose shorthand', () => {
    expect(containsDisallowedActionText('Stop taking your medication')).toBe(false);
    expect(containsDisallowedActionText('Take 500mg twice daily')).toBe(false);
  });

  it('documents diagnose substring false positive in safe disclaimer copy', () => {
    expect(containsDisallowedActionText('This does not diagnose.')).toBe(true);
  });

  const safePlanText = [
    'One safe next step is to track when it started and what changed.',
    'Consider preparing one question for a clinician or pharmacist.',
  ];

  it.each(safePlanText)('allows safe plan wording: %s', (text) => {
    expect(containsDisallowedActionText(text)).toBe(false);
  });
});

describe('aiMedicalBoundary guard', () => {
  it('blocks diagnosis and prescription language', () => {
    expect(isWithinMedicalBoundary('You have migraine')).toBe(false);
    expect(isWithinMedicalBoundary('Start medication changes now')).toBe(false);
    expect(findMedicalBoundaryViolations('Here is your treatment plan').length).toBeGreaterThan(0);
  });

  it('allows safe organizational wording', () => {
    expect(isWithinMedicalBoundary('Consider preparing one question for a clinician or pharmacist.')).toBe(
      true,
    );
  });
});

describe('plan reasoning and synthesis guards', () => {
  it('rejects reasoning with blocked medical language', () => {
    const result = validateReasoningResult(
      {
        selectedCandidateId: baselineCandidate.id,
        reasoning: 'You have migraine and should start medication.',
        whyNotOthers: '',
        followUpPrompt: 'How did this go?',
        watchFor: 'Changes.',
        confidence: 'low',
        fallbackUsed: true,
        aiUsed: false,
      },
      [baselineCandidate],
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('blocked medical language'))).toBe(true);
  });

  it('rejects synthesis with disallowed custom action text', () => {
    const result = validatePlanSynthesisResult({
      payload: {
        selectedMode: 'synthesize_custom_action',
        synthesizedAction: {
          title: 'Medication change',
          actionText: 'Stop taking medication today.',
          reason: 'This will help.',
          category: 'prepare',
          safetyLevel: 'normal',
          primitiveUsed: 'write clinician question',
        },
        reasoning: 'Unsafe synthesis.',
        confidence: 'low',
      },
      baselineCandidates: [baselineCandidate],
      inputSafetyLevel: 'normal',
      medicationConcern: false,
      allowedCategories: ['prepare', 'stabilize', 'track', 'reduce_friction', 'escalate'],
      allowedPrimitives: ['write clinician question'],
      sourceSignals: [],
      fallbackUsed: true,
      aiUsed: true,
    });
    expect(result.valid).toBe(false);
    expect(result.blockReason).toBe('medical_boundary');
  });
});
