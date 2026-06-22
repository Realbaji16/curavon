import { describe, expect, it } from 'vitest';
import { APPROVED_ACTIONS } from '../lib/health-intelligence/actions/allowedActions';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';

function moduleIds(result: ReturnType<typeof runHealthIntelligencePipeline>): string[] {
  return result.selectedModules.map((module) => module.moduleId).sort();
}

describe('runHealthIntelligencePipeline', () => {
  it('integrates fever, headache, and malaria drug concerns', () => {
    const result = runHealthIntelligencePipeline({
      rawText: 'my body hot and head dey bang and I took malaria drug',
    });

    expect(result.safety.allowed).toBe(true);
    expect(moduleIds(result)).toEqual(
      expect.arrayContaining([
        'fever_malaria_ng_v1',
        'headache_ng_v1',
        'medication_question_ng_v1',
      ]),
    );
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.questions.length).toBeLessThanOrEqual(5);
    expect(result.normalizedTerms.length).toBeGreaterThan(0);
    expect(result.summaryPreview.fields.length).toBeGreaterThan(0);
    expect(result.nextStep).toContain(APPROVED_ACTIONS.answer_guided_questions.instruction.slice(0, 20));
    expect(result.allowedActions.some((action) => action.category === 'track')).toBe(true);
  });

  it('integrates headache with blurry vision and prioritizes safety questions', () => {
    const result = runHealthIntelligencePipeline({
      rawText: 'headache and blurry vision since morning',
    });

    expect(result.safety.allowed).toBe(true);
    expect(moduleIds(result)).toContain('headache_ng_v1');
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.questions[0]?.prompt.toLowerCase()).toMatch(/vision|weakness|confusion|face drooping/);
    expect(result.riskLevel).not.toBe('urgent');
  });

  it('blocks normal self-care when chest pain and cannot breathe are urgent', () => {
    const result = runHealthIntelligencePipeline({
      rawText: 'chest pain and I cannot breathe',
    });

    expect(result.safety.allowed).toBe(false);
    expect(result.safety.blockedReason).toBe('urgent_red_flags');
    expect(result.riskLevel).toBe('urgent');
    expect(result.redFlags.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeLessThanOrEqual(1);
    expect(result.nextStep).toBe(APPROVED_ACTIONS.seek_urgent_care_now.instruction);
    expect(result.message).toMatch(/urgent|emergency|support/i);
    expect(result.allowedActions.every((action) => action.category !== 'stabilize')).toBe(true);
    expect(result.allowedActions.every((action) => action.safetyLevel !== 'low')).toBe(true);
  });

  it('integrates widal/typhoid lab result routing and summary fields', () => {
    const result = runHealthIntelligencePipeline({
      rawText: 'my Widal is 1:160 do I have typhoid',
    });

    expect(result.safety.allowed).toBe(true);
    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['lab_result_confusion_ng_v1', 'fever_malaria_ng_v1']),
    );
    expect(result.summaryPreview.fields.some((field) => field.label === 'Tests/lab results')).toBe(
      true,
    );
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.questions.length).toBeLessThanOrEqual(5);
  });

  it('integrates belle pain and stooling for stomach and diarrhea modules', () => {
    const result = runHealthIntelligencePipeline({
      rawText: 'my belle dey pain me and I am stooling',
    });

    expect(result.safety.allowed).toBe(true);
    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['stomach_pain_ng_v1', 'diarrhea_vomiting_ng_v1']),
    );
    expect(result.questions.length).toBeGreaterThanOrEqual(2);
    expect(result.questions.length).toBeLessThanOrEqual(5);
    expect(result.normalizedTerms.join(' ')).toMatch(/stool|abdominal|diarrhea/i);
  });

  it('validates pipeline message safety', () => {
    const result = runHealthIntelligencePipeline({
      rawText: 'my body hot since yesterday',
    });

    expect(result.message.toLowerCase()).toContain('does not diagnose');
    expect(result.message.toLowerCase()).not.toMatch(/\btake amoxicillin\b/);
    expect(result.message.toLowerCase()).not.toMatch(/\byou have malaria\b/);
  });
});
