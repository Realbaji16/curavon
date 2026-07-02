import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';

/**
 * How an uploaded-form insight might influence health-intelligence modules.
 * Influence suggestions are backlog items for human review — not live module changes.
 */

export const MODULE_INFLUENCE_TYPES = [
  'trigger',
  'question',
  'summary_field',
  'guardrail',
  'response_copy',
  'feature',
  'blocker',
  'care_route',
] as const;

export type ModuleInfluenceType = (typeof MODULE_INFLUENCE_TYPES)[number];

export type ModuleInfluenceTaxonomyEntry = {
  type: ModuleInfluenceType;
  label: string;
  description: string;
};

export const MODULE_INFLUENCE_TAXONOMY: Readonly<Record<ModuleInfluenceType, ModuleInfluenceTaxonomyEntry>> = {
  trigger: {
    type: 'trigger',
    label: 'Entry trigger',
    description: 'Candidate entry_triggers term or phrase for module routing.',
  },
  question: {
    type: 'question',
    label: 'Guided question',
    description: 'Candidate required_questions prompt or strategy slot.',
  },
  summary_field: {
    type: 'summary_field',
    label: 'Summary field',
    description: 'Candidate summary_fields label or field id.',
  },
  guardrail: {
    type: 'guardrail',
    label: 'Guardrail',
    description: 'Candidate blocked-output or not_allowed boundary.',
  },
  response_copy: {
    type: 'response_copy',
    label: 'Response copy',
    description: 'Candidate module-aware intake or flow copy — non-diagnostic only.',
  },
  feature: {
    type: 'feature',
    label: 'Product feature',
    description: 'Cross-cutting product feature tied to a module theme.',
  },
  blocker: {
    type: 'blocker',
    label: 'Care blocker',
    description: 'Friction or access blocker relevant to this module context.',
  },
  care_route: {
    type: 'care_route',
    label: 'Care route',
    description: 'Descriptive care-path context for module overlap — no facility directive.',
  },
};

/** Link from a form insight to a module and suggested influence kinds. */
export type ModuleInfluenceLink = {
  moduleId: HealthModuleId;
  influenceTypes: readonly ModuleInfluenceType[];
  note?: string;
};

export function isModuleInfluenceType(value: string): value is ModuleInfluenceType {
  return (MODULE_INFLUENCE_TYPES as readonly string[]).includes(value);
}

export function getModuleInfluenceTaxonomyEntry(
  type: ModuleInfluenceType,
): ModuleInfluenceTaxonomyEntry {
  return MODULE_INFLUENCE_TAXONOMY[type];
}
