import { describe, expect, it } from 'vitest';
import { HEALTH_MODULE_BY_ID } from '../lib/health-intelligence';
import {
  PRIORITY_PHASE2_MODULE_IDS,
  validateAllPriorityModuleQuality,
  validatePriorityModuleQuality,
} from '../lib/health-intelligence/modules/moduleQuality';
import type { HealthModule } from '../lib/health-intelligence/modules/moduleTypes';

describe('Healthy.Ai Phase 2 priority module quality', () => {
  it('targets exactly five Phase 2 modules', () => {
    expect(PRIORITY_PHASE2_MODULE_IDS).toEqual([
      'fever_malaria_ng_v1',
      'headache_ng_v1',
      'medication_question_ng_v1',
      'lab_result_confusion_ng_v1',
      'clinic_pharmacy_prep_ng_v1',
    ]);
  });

  it.each(PRIORITY_PHASE2_MODULE_IDS)('%s passes production quality checks', (moduleId) => {
    const module = HEALTH_MODULE_BY_ID[moduleId];
    const result = validatePriorityModuleQuality(module);

    if (!result.passed) {
      const summary = result.issues.map((issue) => `${issue.checkId}: ${issue.message}`).join('\n');
      expect.fail(`Quality checks failed for ${moduleId}:\n${summary}`);
    }

    expect(result.passed).toBe(true);
    expect(result.issues).toHaveLength(0);
  });

  it('all priority modules pass when validated as a batch', () => {
    const results = validateAllPriorityModuleQuality(
      PRIORITY_PHASE2_MODULE_IDS.map((moduleId) => HEALTH_MODULE_BY_ID[moduleId]),
    );
    expect(results.every((result) => result.passed)).toBe(true);
  });

  it('rejects non-priority modules', () => {
    const stomach = HEALTH_MODULE_BY_ID.stomach_pain_ng_v1;
    const result = validatePriorityModuleQuality(stomach);
    expect(result.passed).toBe(false);
    expect(result.issues[0]?.message).toContain('not a Phase 2 priority module');
  });

  it('rejects approved status without clinical_review marker', () => {
    const fever = HEALTH_MODULE_BY_ID.fever_malaria_ng_v1;
    const unreviewedApproved: HealthModule = {
      ...fever,
      status: 'approved',
    };
    const result = validatePriorityModuleQuality(unreviewedApproved);
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.checkId === 'status')).toBe(true);
    expect(result.issues.some((issue) => issue.message.includes('clinical_review'))).toBe(true);
  });

  it('allows approved status when clinical_review marker exists', () => {
    const fever = HEALTH_MODULE_BY_ID.fever_malaria_ng_v1;
    const clinicallyApproved = {
      ...fever,
      status: 'approved' as const,
      clinical_review: {
        reviewed_at: '2026-06-01T00:00:00.000Z',
        reviewer_role: 'clinical_safety_reviewer',
      },
    } as HealthModule & { clinical_review: { reviewed_at: string; reviewer_role: string } };

    const result = validatePriorityModuleQuality(clinicallyApproved);
    expect(result.issues.some((issue) => issue.checkId === 'status')).toBe(false);
  });

  it('flags unsafe allowed action copy', () => {
    const fever = HEALTH_MODULE_BY_ID.fever_malaria_ng_v1;
    const unsafeModule: HealthModule = {
      ...fever,
      allowed_actions: [
        {
          ...fever.allowed_actions[0],
          instruction: 'Take amoxicillin twice daily for malaria.',
        },
      ],
    };
    const result = validatePriorityModuleQuality(unsafeModule);
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.checkId === 'allowed_action_safety')).toBe(true);
  });

  it('flags summary fields that conclude disease', () => {
    const lab = HEALTH_MODULE_BY_ID.lab_result_confusion_ng_v1;
    const unsafeModule: HealthModule = {
      ...lab,
      summary_fields: [
        ...lab.summary_fields,
        { id: 'bad', label: 'Confirm malaria diagnosis', kind: 'other', required: false },
      ],
    };
    const result = validatePriorityModuleQuality(unsafeModule);
    expect(result.passed).toBe(false);
    expect(result.issues.some((issue) => issue.checkId === 'summary_field_safety')).toBe(true);
  });
});
