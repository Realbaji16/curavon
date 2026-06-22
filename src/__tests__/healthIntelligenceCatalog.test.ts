import { describe, expect, it } from 'vitest';
import {
  HEALTH_MODULE_IDS,
  HEALTH_MODULES,
  HEALTH_MODULE_BY_ID,
  getHealthModuleById,
  listHealthModules,
} from '../lib/health-intelligence';

const FORBIDDEN_ACTION_PATTERN = /\b(prescrib\w*|diagnos\w*|dosage)\b/i;
const FORBIDDEN_DOSE_PATTERN = /\b(change|adjust|double|skip|take)\s+(\w+\s+){0,3}dose\b/i;

function allowedActionHasForbiddenLanguage(text: string): boolean {
  let normalized = text.toLowerCase();
  normalized = normalized.replace(/\bnot a diagnos\w*\b/g, '');
  normalized = normalized.replace(/\bwithout naming an illness\b/g, '');
  normalized = normalized.replace(/\bdo not (change|double|adjust|take)\s+(\w+\s+){0,3}dose\b/g, '');
  return FORBIDDEN_ACTION_PATTERN.test(normalized) || FORBIDDEN_DOSE_PATTERN.test(normalized);
}

describe('health-intelligence module catalog', () => {
  it('contains exactly 20 modules', () => {
    expect(HEALTH_MODULES).toHaveLength(20);
    expect(listHealthModules()).toHaveLength(20);
    expect(Object.keys(HEALTH_MODULE_BY_ID)).toHaveLength(20);
  });

  it('has unique module IDs aligned with HEALTH_MODULE_IDS', () => {
    const catalogIds = HEALTH_MODULES.map((module) => module.module_id);
    expect(new Set(catalogIds).size).toBe(20);
    expect(catalogIds.sort()).toEqual([...HEALTH_MODULE_IDS].sort());
  });

  it('every module has required questions and not_allowed entries', () => {
    for (const module of HEALTH_MODULES) {
      expect(module.required_questions.length, module.module_id).toBeGreaterThan(0);
      expect(module.not_allowed.length, module.module_id).toBeGreaterThan(0);
      expect(module.entry_triggers.length, module.module_id).toBeGreaterThan(0);
      expect(module.red_flags.length, module.module_id).toBeGreaterThan(0);
      expect(module.allowed_actions.length, module.module_id).toBeGreaterThan(0);
      expect(module.summary_fields.length, module.module_id).toBeGreaterThan(0);
    }
  });

  it('no allowed action text contains prescribe, diagnose, or dosage language', () => {
    for (const module of HEALTH_MODULES) {
      for (const action of module.allowed_actions) {
        const blob = `${action.title} ${action.instruction}`;
        expect(allowedActionHasForbiddenLanguage(blob), `${module.module_id}:${action.id}`).toBe(
          false,
        );
      }
    }
  });

  it('getHealthModuleById returns catalog entries', () => {
    const module = getHealthModuleById('fever_malaria_ng_v1');
    expect(module.module_id).toBe('fever_malaria_ng_v1');
    expect(module.entry_triggers.some((trigger) => trigger.terms.includes('body hot'))).toBe(true);
  });

  it('rich seeds include Nigeria-specific trigger phrases', () => {
    const allTerms = (moduleId: 'fever_malaria_ng_v1' | 'headache_ng_v1' | 'medication_question_ng_v1' | 'lab_result_confusion_ng_v1' | 'blood_pressure_ng_v1') =>
      getHealthModuleById(moduleId)
        .entry_triggers.flatMap((trigger) => trigger.terms)
        .join(' ')
        .toLowerCase();

    expect(allTerms('fever_malaria_ng_v1')).toContain('body hot');
    expect(allTerms('fever_malaria_ng_v1')).toContain('malaria and typhoid');
    expect(allTerms('headache_ng_v1')).toContain('head dey bang');
    expect(allTerms('medication_question_ng_v1')).toContain('chemist gave me drug');
    expect(allTerms('lab_result_confusion_ng_v1')).toContain('widal');
    expect(allTerms('blood_pressure_ng_v1')).toContain('bp disturbing me');
  });
});
