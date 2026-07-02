import type { HealthIntelligenceResult } from '../types';

/** Derived intelligence metadata safe to attach to ask-intake session / flow-proposal payloads. */
export type FlowProposalIntelligenceContext = {
  selectedModules: string[];
  primaryModuleId: string | null;
  riskLevel: string;
  normalizedTerms: string[];
  questionCount: number;
  summaryFieldIds: string[];
  allowedActionIds: string[];
};

const FORBIDDEN_SERIALIZED_KEYS = new Set([
  'rawText',
  'concernText',
  'message',
  'nextStep',
  'questions',
  'redFlags',
  'summaryPreview',
  'allowedActions',
  'safety',
  'prompt',
  'matchedTriggers',
  'matchedTerm',
  'confidence',
  'label',
  'value',
  'footer',
  'title',
  'instruction',
  'reason',
]);

function uniqueStableIds(ids: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

/** Strip intelligence down to stable, JSON-safe derived metadata for flow proposal. */
export function serializeIntelligenceForFlowProposal(
  intelligence: HealthIntelligenceResult,
): FlowProposalIntelligenceContext {
  return {
    selectedModules: intelligence.selectedModules.map((module) => module.moduleId),
    primaryModuleId: intelligence.primaryModuleId,
    riskLevel: intelligence.riskLevel,
    normalizedTerms: [...intelligence.normalizedTerms],
    questionCount: intelligence.questions.length,
    summaryFieldIds: intelligence.summaryPreview.fields.map((field) => field.fieldId),
    allowedActionIds: uniqueStableIds(intelligence.allowedActions.map((action) => action.id)),
  };
}

/** Guardrail helper for tests and session writers — rejects unsafe payload keys. */
export function assertFlowProposalIntelligenceContextSafe(
  value: FlowProposalIntelligenceContext,
): void {
  const walk = (current: unknown, path: string): void => {
    if (current === null || typeof current !== 'object') return;
    if (Array.isArray(current)) {
      for (let index = 0; index < current.length; index += 1) {
        walk(current[index], `${path}[${index}]`);
      }
      return;
    }

    for (const [key, nested] of Object.entries(current)) {
      if (FORBIDDEN_SERIALIZED_KEYS.has(key)) {
        throw new Error(`Unsafe intelligence context key at ${path ? `${path}.` : ''}${key}`);
      }
      walk(nested, path ? `${path}.${key}` : key);
    }
  };

  walk(value, '');
}
