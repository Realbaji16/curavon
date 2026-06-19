import type { PlanActionPrimitive, PlanCategory, PlanSafetyLevel } from './planTypes';

export const PLAN_CATEGORIES: PlanCategory[] = [
  'stabilize',
  'track',
  'prepare',
  'reduce_friction',
  'escalate',
];

export const STABILIZE_PRIMITIVES: PlanActionPrimitive[] = [
  'breathing pause',
  'reduce immediate pressure',
  'choose lighter task',
  'write one feeling',
  'create calm reset',
];

export const TRACK_PRIMITIVES: PlanActionPrimitive[] = [
  'record timing',
  'record intensity',
  'record changes',
  'record triggers',
  'record what helped/worsened',
];

export const PREPARE_PRIMITIVES: PlanActionPrimitive[] = [
  'write clinician question',
  'prepare medication note without advice',
  'organize appointment notes',
  'collect symptom timeline',
  'save doctor summary item',
];

export const REDUCE_FRICTION_PRIMITIVES: PlanActionPrimitive[] = [
  'make action smaller',
  'identify blocker',
  'choose 2-minute version',
  'remove one step',
  'retry later with simpler step',
];

export const ESCALATE_PRIMITIVES: PlanActionPrimitive[] = [
  'prepare urgent note',
  'contact clinician/emergency support',
  'return to safety guidance',
  'save red-flag summary',
];

export const ALL_ACTION_PRIMITIVES: PlanActionPrimitive[] = [
  ...STABILIZE_PRIMITIVES,
  ...TRACK_PRIMITIVES,
  ...PREPARE_PRIMITIVES,
  ...REDUCE_FRICTION_PRIMITIVES,
  ...ESCALATE_PRIMITIVES,
];

export const PRIMITIVES_BY_CATEGORY: Record<PlanCategory, PlanActionPrimitive[]> = {
  stabilize: STABILIZE_PRIMITIVES,
  track: TRACK_PRIMITIVES,
  prepare: PREPARE_PRIMITIVES,
  reduce_friction: REDUCE_FRICTION_PRIMITIVES,
  escalate: ESCALATE_PRIMITIVES,
};

export const DISALLOWED_ACTION_PATTERNS: RegExp[] = [
  /\bdiagnos(is|ed|e)\b/i,
  /\byou have\b/i,
  /\btreatment plan\b/i,
  /\bstart (taking |your )?(medication|medicine|pill|tablet)\b/i,
  /\bstop (taking |your )?(medication|medicine|pill|tablet)\b/i,
  /\bchange (your )?(medication|medicine|dose|dosage)\b/i,
  /\b(increase|decrease|adjust) (the )?(dose|dosage)\b/i,
  /\bsupplement\b/i,
  /\blab (result|value|interpret)/i,
  /\bno need to see (a )?(doctor|clinician|urgent)\b/i,
  /\bthis is harmless\b/i,
  /\bdefinitely\b/i,
  /\bcertainly have\b/i,
  /\bno need to worry\b/i,
  /\btherapy replacement\b/i,
  /\bcrisis counseling\b/i,
  /\bprescrib(e|ing|ed)\b/i,
];

export const DISALLOWED_ACTION_LABELS: string[] = [
  'diagnosis',
  'you have [condition]',
  'treatment plan',
  'medication start/stop/change',
  'dosage advice',
  'supplement advice',
  'lab interpretation',
  'emergency reassurance',
  'no need to see a doctor',
  'this is harmless',
  'certainty language',
  'therapy replacement language',
  'crisis counseling language',
  'multi-step medical protocol',
  'action requiring medical authority',
];

const SAFETY_LEVEL_RANK: Record<PlanSafetyLevel, number> = {
  normal: 0,
  caution: 1,
  urgent: 2,
};

export function isAllowedCategory(category: string): category is PlanCategory {
  return PLAN_CATEGORIES.includes(category as PlanCategory);
}

export function isAllowedPrimitive(primitive: string): primitive is PlanActionPrimitive {
  return ALL_ACTION_PRIMITIVES.includes(primitive as PlanActionPrimitive);
}

export function primitiveMatchesCategory(
  primitive: PlanActionPrimitive,
  category: PlanCategory,
): boolean {
  return PRIMITIVES_BY_CATEGORY[category].includes(primitive);
}

export function containsDisallowedActionText(text: string): boolean {
  return DISALLOWED_ACTION_PATTERNS.some((pattern) => pattern.test(text));
}

export function safetyLevelAtLeast(
  value: PlanSafetyLevel,
  minimum: PlanSafetyLevel,
): boolean {
  return SAFETY_LEVEL_RANK[value] >= SAFETY_LEVEL_RANK[minimum];
}

export function allowedPrimitivesForContext(input: {
  safetyLevel: PlanSafetyLevel;
  medicationConcern: boolean;
}): PlanActionPrimitive[] {
  if (input.safetyLevel === 'urgent') {
    return ESCALATE_PRIMITIVES;
  }
  if (input.medicationConcern) {
    return PREPARE_PRIMITIVES;
  }
  return ALL_ACTION_PRIMITIVES;
}

export function allowedCategoriesForContext(input: {
  safetyLevel: PlanSafetyLevel;
  medicationConcern: boolean;
}): PlanCategory[] {
  if (input.safetyLevel === 'urgent') {
    return ['escalate'];
  }
  if (input.medicationConcern) {
    return ['prepare', 'escalate'];
  }
  return PLAN_CATEGORIES;
}
