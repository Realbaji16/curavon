import { describe, expect, it } from 'vitest';
import {
  HEALTH_MODULE_IDS,
  isHealthModuleId,
  type HealthIntelligenceResult,
  type HealthModule,
  type HealthModuleId,
} from '../lib/health-intelligence';

describe('health-intelligence domain types', () => {
  it('defines exactly 20 module ids', () => {
    expect(HEALTH_MODULE_IDS).toHaveLength(20);
    expect(new Set(HEALTH_MODULE_IDS).size).toBe(20);
  });

  it('narrows unknown strings with isHealthModuleId', () => {
    expect(isHealthModuleId('fever_malaria_ng_v1')).toBe(true);
    expect(isHealthModuleId('not_a_real_module')).toBe(false);
  });

  it('accepts a minimal HealthModule and HealthIntelligenceResult shape', () => {
    const moduleId: HealthModuleId = 'headache_ng_v1';

    const module: HealthModule = {
      module_id: moduleId,
      name: 'Headache',
      country_context: 'NG',
      risk_level: 'medium',
      status: 'draft',
      version: '1.0.0',
      purpose: 'Organize headache concerns without diagnosing.',
      not_allowed: ['diagnosis', 'medication dose advice'],
      entry_triggers: [{ id: 'headache', label: 'headache', terms: ['headache', 'migraine'] }],
      overlapping_modules: ['stress_anxiety_sleep_ng_v1'],
      red_flags: [
        {
          id: 'worst_headache',
          label: 'worst headache',
          terms: ['worst headache'],
          severity: 'urgent',
        },
      ],
      required_questions: [
        { id: 'onset', prompt: 'When did this start?', kind: 'required' },
      ],
      ai_generated_question_policy: {
        enabled: false,
        maxAdditionalQuestions: 0,
        mustStayWithinModuleScope: true,
        forbiddenTopics: ['diagnosis'],
      },
      allowed_actions: [
        {
          id: 'track_timing',
          title: 'Track timing',
          instruction: 'Note when the headache started and what changed.',
          category: 'track',
          safetyLevel: 'low',
        },
      ],
      summary_fields: [
        { id: 'concern', label: 'Main concern', kind: 'concern', required: true },
      ],
    };

    const result: HealthIntelligenceResult = {
      message: 'Let us narrow this down before suggesting a next step.',
      normalizedTerms: ['headache', 'two days'],
      selectedModules: [
        {
          moduleId,
          confidence: 0.82,
          matchedTriggers: ['headache'],
        },
      ],
      primaryModuleId: moduleId,
      riskLevel: module.risk_level,
      redFlags: [],
      questions: [
        {
          id: 'onset',
          prompt: 'When did this start?',
          source: 'module_required',
          moduleId,
        },
      ],
      allowedActions: module.allowed_actions,
      nextStep: 'answer_questions',
      summaryPreview: {
        title: 'Headache check-in',
        fields: [{ fieldId: 'concern', label: 'Main concern', value: 'Headache for two days' }],
      },
      safety: {
        allowed: true,
        riskLevel: 'medium',
      },
    };

    expect(module.module_id).toBe(result.primaryModuleId);
    expect(result.safety.allowed).toBe(true);
  });
});
