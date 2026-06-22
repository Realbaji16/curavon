import { describe, expect, it } from 'vitest';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';

function moduleIds(result: ReturnType<typeof routeHealthModules>): string[] {
  return result.selectedModules.map((module) => module.moduleId).sort();
}

describe('routeHealthModules', () => {
  it('routes fever + headache for body hot and head dey bang', () => {
    const result = routeHealthModules({
      rawText: 'my body hot and head dey bang',
    });

    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['fever_malaria_ng_v1', 'headache_ng_v1']),
    );
    expect(result.selectedModules).toHaveLength(2);
    expect(result.primaryModuleId).toBe('fever_malaria_ng_v1');
    expect(result.riskLevel).toBe('high');
  });

  it('routes stomach + diarrhea for belle pain and stooling', () => {
    const result = routeHealthModules({
      rawText: 'my belle dey pain me and I am stooling',
    });

    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['stomach_pain_ng_v1', 'diarrhea_vomiting_ng_v1']),
    );
    expect(result.selectedModules).toHaveLength(2);
    expect(result.primaryModuleId).toBe('diarrhea_vomiting_ng_v1');
  });

  it('routes medication + skin for chemist drug and itching', () => {
    const result = routeHealthModules({
      rawText: 'chemist gave me drug and now my body is itching',
    });

    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['medication_question_ng_v1', 'skin_rash_itching_ng_v1']),
    );
    expect(result.selectedModules).toHaveLength(2);
    expect(result.primaryModuleId).toBe('medication_question_ng_v1');
  });

  it('routes chest + breathing with high-risk primary for chest pain and breathing fast', () => {
    const result = routeHealthModules({
      rawText: 'chest pain and breathing fast',
    });

    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['chest_pain_ng_v1', 'breathing_difficulty_ng_v1']),
    );
    expect(result.selectedModules).toHaveLength(2);
    expect(result.primaryModuleId).toBe('chest_pain_ng_v1');
    expect(['high', 'urgent']).toContain(result.riskLevel);
  });

  it('routes lab result + fever for widal and typhoid question', () => {
    const result = routeHealthModules({
      rawText: 'my Widal is 1:160 do I have typhoid',
    });

    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['lab_result_confusion_ng_v1', 'fever_malaria_ng_v1']),
    );
    expect(result.selectedModules).toHaveLength(2);
    expect(result.primaryModuleId).toBe('lab_result_confusion_ng_v1');
  });

  it('merges explicit moduleHints with phrase and trigger routing', () => {
    const result = routeHealthModules({
      rawText: 'headache since morning',
      moduleHints: ['clinic_pharmacy_prep_ng_v1'],
    });

    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['headache_ng_v1', 'clinic_pharmacy_prep_ng_v1']),
    );
  });

  it('prioritizes pregnancy concern when pregnancy terms are present', () => {
    const result = routeHealthModules({
      rawText: 'I am pregnant and bleeding lightly',
    });

    expect(moduleIds(result)).toContain('pregnancy_concern_ng_v1');
    expect(result.primaryModuleId).toBe('pregnancy_concern_ng_v1');
    expect(result.riskLevel).toBe('high');
  });

  it('prioritizes child fever when child terms are present', () => {
    const result = routeHealthModules({
      rawText: 'my baby body hot since last night',
    });

    expect(moduleIds(result)).toEqual(
      expect.arrayContaining(['child_fever_illness_ng_v1', 'fever_malaria_ng_v1']),
    );
    expect(result.primaryModuleId).toBe('child_fever_illness_ng_v1');
  });

  it('returns empty routing for unrelated text', () => {
    const result = routeHealthModules({
      rawText: 'I need help planning my clinic visit next week',
    });

    expect(result.selectedModules).toEqual([]);
    expect(result.primaryModuleId).toBeNull();
    expect(result.riskLevel).toBe('low');
  });
});
