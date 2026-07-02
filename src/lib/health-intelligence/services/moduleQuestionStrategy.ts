import type { HealthModuleId } from '../modules/moduleIds';
import { PRIORITY_PHASE2_MODULE_IDS } from '../modules/moduleQuality';

/** Global cap — individual module strategies cannot exceed this. */
export const GLOBAL_MAX_GUIDED_QUESTIONS = 5;

export type ModuleQuestionStrategy = {
  firstPriorityQuestionIds: readonly string[];
  redFlagQuestionIds: readonly string[];
  contextQuestionIds: readonly string[];
  medicationQuestionIds: readonly string[];
  summaryPrepQuestionIds: readonly string[];
  maxQuestions: number;
};

const FEVER_MALARIA_STRATEGY: ModuleQuestionStrategy = {
  firstPriorityQuestionIds: ['onset', 'worsening', 'peak_temperature'],
  redFlagQuestionIds: [],
  contextQuestionIds: ['other_symptoms', 'fluids', 'vomiting_diarrhea'],
  medicationQuestionIds: ['medicines_taken'],
  summaryPrepQuestionIds: ['lab_context', 'vulnerable'],
  maxQuestions: GLOBAL_MAX_GUIDED_QUESTIONS,
};

const HEADACHE_STRATEGY: ModuleQuestionStrategy = {
  firstPriorityQuestionIds: ['onset', 'onset_pattern', 'severity'],
  redFlagQuestionIds: ['vision_changes', 'neuro_symptoms', 'fever_neck'],
  contextQuestionIds: ['location_pattern', 'head_injury_check', 'bp_reading'],
  medicationQuestionIds: ['medicines_taken'],
  summaryPrepQuestionIds: [],
  maxQuestions: GLOBAL_MAX_GUIDED_QUESTIONS,
};

const MEDICATION_QUESTION_STRATEGY: ModuleQuestionStrategy = {
  firstPriorityQuestionIds: ['medicine_name', 'medicine_source', 'changes_after'],
  redFlagQuestionIds: [],
  contextQuestionIds: ['when_taken', 'allergies', 'conditions_context', 'times_taken_history', 'packaging_photo'],
  medicationQuestionIds: ['medicine_name', 'medicine_source', 'when_taken', 'changes_after'],
  summaryPrepQuestionIds: ['packaging_photo'],
  maxQuestions: GLOBAL_MAX_GUIDED_QUESTIONS,
};

const LAB_RESULT_CONFUSION_STRATEGY: ModuleQuestionStrategy = {
  firstPriorityQuestionIds: ['test_name', 'test_date', 'symptoms_led_to_test', 'who_ordered'],
  redFlagQuestionIds: ['symptoms_worsening'],
  contextQuestionIds: ['unclear_wording', 'full_result_available', 'medicine_from_result'],
  medicationQuestionIds: ['medicine_from_result'],
  summaryPrepQuestionIds: ['unclear_wording'],
  maxQuestions: GLOBAL_MAX_GUIDED_QUESTIONS,
};

const CLINIC_PHARMACY_PREP_STRATEGY: ModuleQuestionStrategy = {
  firstPriorityQuestionIds: ['visit_type', 'main_concern', 'top_questions'],
  redFlagQuestionIds: [],
  contextQuestionIds: ['timeline', 'what_changed', 'visit_blocker'],
  medicationQuestionIds: ['medicines_taken'],
  summaryPrepQuestionIds: ['test_results_bring', 'top_questions'],
  maxQuestions: GLOBAL_MAX_GUIDED_QUESTIONS,
};

const MODULE_QUESTION_STRATEGIES: Partial<Record<HealthModuleId, ModuleQuestionStrategy>> = {
  fever_malaria_ng_v1: FEVER_MALARIA_STRATEGY,
  headache_ng_v1: HEADACHE_STRATEGY,
  medication_question_ng_v1: MEDICATION_QUESTION_STRATEGY,
  lab_result_confusion_ng_v1: LAB_RESULT_CONFUSION_STRATEGY,
  clinic_pharmacy_prep_ng_v1: CLINIC_PHARMACY_PREP_STRATEGY,
};

const STRATEGY_PRIORITY_TIERS: ReadonlyArray<keyof ModuleQuestionStrategy> = [
  'redFlagQuestionIds',
  'firstPriorityQuestionIds',
  'medicationQuestionIds',
  'contextQuestionIds',
  'summaryPrepQuestionIds',
];

/** Phase 2 module-specific guided-question priority. Returns null for non-priority modules. */
export function getModuleQuestionStrategy(moduleId: HealthModuleId): ModuleQuestionStrategy | null {
  return MODULE_QUESTION_STRATEGIES[moduleId] ?? null;
}

export function isPhase2StrategyModule(moduleId: HealthModuleId): boolean {
  return (PRIORITY_PHASE2_MODULE_IDS as readonly string[]).includes(moduleId);
}

export function moduleQuestionKey(moduleId: HealthModuleId, questionId: string): string {
  return `${moduleId}:${questionId}`;
}

export function strategyPriorityBoost(
  moduleId: HealthModuleId,
  questionId: string,
  primaryModuleId: HealthModuleId | null,
): number {
  if (moduleId !== primaryModuleId) return 0;

  const strategy = getModuleQuestionStrategy(moduleId);
  if (!strategy) return 0;

  for (let tier = 0; tier < STRATEGY_PRIORITY_TIERS.length; tier += 1) {
    const tierKey = STRATEGY_PRIORITY_TIERS[tier];
    if (tierKey === 'maxQuestions') continue;
    const ids = strategy[tierKey];
    const index = ids.indexOf(questionId);
    if (index >= 0) {
      return -3 - tier * 0.4 - index * 0.03;
    }
  }

  return 0;
}

export function resolveMaxGuidedQuestions(primaryModuleId: HealthModuleId | null): number {
  const strategy = primaryModuleId ? getModuleQuestionStrategy(primaryModuleId) : null;
  const moduleMax = strategy?.maxQuestions ?? GLOBAL_MAX_GUIDED_QUESTIONS;
  return Math.min(GLOBAL_MAX_GUIDED_QUESTIONS, moduleMax);
}

export function collectStrategyMandatoryQuestionKeys(
  moduleId: HealthModuleId,
  strategy: ModuleQuestionStrategy,
): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];

  for (const tierKey of STRATEGY_PRIORITY_TIERS) {
    if (tierKey === 'maxQuestions') continue;
    for (const questionId of strategy[tierKey]) {
      const key = moduleQuestionKey(moduleId, questionId);
      if (seen.has(key)) continue;
      seen.add(key);
      keys.push(key);
    }
  }

  return keys;
}

/** Must-include module question ids after safety picks — capped to fit within maxQuestions. */
export function getStrategyEnforcedQuestionIds(
  moduleId: HealthModuleId,
  strategy: ModuleQuestionStrategy,
): string[] {
  const toKeys = (ids: readonly string[]) => ids.map((id) => moduleQuestionKey(moduleId, id));

  switch (moduleId) {
    case 'fever_malaria_ng_v1':
      return toKeys(['onset', 'medicines_taken']);
    case 'headache_ng_v1':
      return toKeys(['onset']);
    case 'medication_question_ng_v1':
      return toKeys(['medicine_name', 'medicine_source', 'changes_after']);
    case 'lab_result_confusion_ng_v1':
      return toKeys(['test_name', 'test_date', 'symptoms_led_to_test', 'who_ordered']);
    case 'clinic_pharmacy_prep_ng_v1':
      return toKeys(['visit_type', 'main_concern', 'top_questions']);
    default:
      return collectStrategyMandatoryQuestionKeys(moduleId, strategy).slice(0, 3);
  }
}
