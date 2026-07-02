import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';

/** Product-context overlay kinds — never mutate core module files directly. */
export const PRODUCT_CONTEXT_OVERLAY_TYPES = [
  'module_trigger',
  'blocker_option',
  'care_route',
  'summary_field',
  'safe_question',
  'response_copy',
  'feature_backlog_item',
  'lifestyle_context',
] as const;

export type ProductContextOverlayType = (typeof PRODUCT_CONTEXT_OVERLAY_TYPES)[number];

export const PRODUCT_CONTEXT_OVERLAY_LIFECYCLES = [
  'active',
  'shadow',
  'blocked',
  'retired',
] as const;

export type ProductContextOverlayLifecycle = (typeof PRODUCT_CONTEXT_OVERLAY_LIFECYCLES)[number];

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type ModuleTriggerOverlayPayload = {
  moduleId: HealthModuleId;
  terms: string[];
};

export type BlockerOptionOverlayPayload = {
  optionId: string;
  label: string;
  moduleId?: HealthModuleId;
};

export type CareRouteOverlayPayload = {
  routeId: string;
  label: string;
  moduleId?: HealthModuleId;
};

export type SummaryFieldOverlayPayload = {
  fieldId: string;
  label: string;
  moduleId?: HealthModuleId;
};

export type SafeQuestionOverlayPayload = {
  questionId: string;
  prompt: string;
  moduleId?: HealthModuleId;
};

export type ResponseCopyOverlayPayload = {
  line: string;
  moduleId?: HealthModuleId;
};

export type FeatureBacklogItemOverlayPayload = {
  featureId: string;
  description: string;
  moduleId?: HealthModuleId;
};

export type LifestyleContextOverlayPayload = {
  contextId: string;
  label: string;
  moduleId?: HealthModuleId;
  terms?: string[];
};

export type ProductContextOverlayPayloadByType = {
  module_trigger: ModuleTriggerOverlayPayload;
  blocker_option: BlockerOptionOverlayPayload;
  care_route: CareRouteOverlayPayload;
  summary_field: SummaryFieldOverlayPayload;
  safe_question: SafeQuestionOverlayPayload;
  response_copy: ResponseCopyOverlayPayload;
  feature_backlog_item: FeatureBacklogItemOverlayPayload;
  lifestyle_context: LifestyleContextOverlayPayload;
};

export type ProductContextOverlayPayload = ProductContextOverlayPayloadByType[ProductContextOverlayType];

export type ProductContextOverlay = {
  overlayId: string;
  overlayKey: string;
  sourceInsightId: string;
  sourceBatchId: string;
  overlayType: ProductContextOverlayType;
  lifecycle: ProductContextOverlayLifecycle;
  payload: ProductContextOverlayPayload;
  moduleId?: HealthModuleId;
  validationReasons: readonly string[];
  createdAt: string;
  updatedAt: string;
  retiredAt?: string;
};

export type OverlayPayloadValidationResult = {
  valid: boolean;
  reasons: readonly string[];
};

export function isProductContextOverlayType(value: string): value is ProductContextOverlayType {
  return (PRODUCT_CONTEXT_OVERLAY_TYPES as readonly string[]).includes(value);
}

export function isProductContextOverlayLifecycle(
  value: string,
): value is ProductContextOverlayLifecycle {
  return (PRODUCT_CONTEXT_OVERLAY_LIFECYCLES as readonly string[]).includes(value);
}

export function isJsonSerializable(value: unknown): value is JsonValue {
  if (value === null) return true;
  const valueType = typeof value;
  if (valueType === 'string' || valueType === 'number' || valueType === 'boolean') {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every((entry) => isJsonSerializable(entry));
  }
  if (valueType === 'object') {
    const record = value as Record<string, unknown>;
    return Object.values(record).every((entry) => isJsonSerializable(entry));
  }
  return false;
}

const FORBIDDEN_OVERLAY_TEXT_PATTERNS: readonly RegExp[] = [
  /\bdiagnos(e|is|ing|ed)\b/i,
  /\bprescri(be|ption|bed|bing)\b/i,
  /\b(take|start|stop|continue|switch|change)\s+(the|your|this)\s+(drug|medicine|medication|antibiotic|antimalarial|tablet|pill)\b/i,
  /\byou should (take|use|start|stop|switch)\b/i,
  /\b\d+\s*(mg|ml|mcg|tablet|tablets|pill|pills|capsule|capsules|dose|doses)\b/i,
  /\bwhat dose\b/i,
  /\bhow many (tablets|pills|capsules|doses)\b/i,
  /\bnot (an? )?emergency\b/i,
  /\bno need (to|for) (urgent|emergency|hospital|a&e|er)\b/i,
  /\b(don't|do not) (go|visit|call) (the )?(hospital|doctor|emergency)\b/i,
  /\bcan wait\b/i,
  /\bnot serious enough\b/i,
];

export function collectOverlayPayloadText(payload: ProductContextOverlayPayload): string[] {
  const texts: string[] = [];
  const record = payload as Record<string, unknown>;

  for (const value of Object.values(record)) {
    if (typeof value === 'string' && value.trim()) {
      texts.push(value);
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (typeof entry === 'string' && entry.trim()) {
          texts.push(entry);
        }
      }
    }
  }

  return texts;
}

export function validateOverlayPayload(
  payload: ProductContextOverlayPayload,
): OverlayPayloadValidationResult {
  const reasons: string[] = [];

  if (!isJsonSerializable(payload)) {
    return { valid: false, reasons: ['payload_not_json_serializable'] };
  }

  for (const text of collectOverlayPayloadText(payload)) {
    for (const pattern of FORBIDDEN_OVERLAY_TEXT_PATTERNS) {
      if (pattern.test(text)) {
        reasons.push(`forbidden_text:${pattern.source}`);
      }
    }
  }

  if ('terms' in payload && Array.isArray(payload.terms) && payload.terms.length === 0) {
    reasons.push('empty_trigger_terms');
  }

  if ('label' in payload && typeof payload.label === 'string' && !payload.label.trim()) {
    reasons.push('empty_label');
  }

  if ('line' in payload && typeof payload.line === 'string' && !payload.line.trim()) {
    reasons.push('empty_line');
  }

  if ('prompt' in payload && typeof payload.prompt === 'string' && !payload.prompt.trim()) {
    reasons.push('empty_prompt');
  }

  return { valid: reasons.length === 0, reasons };
}

export function isActiveOverlayLifecycle(lifecycle: ProductContextOverlayLifecycle): boolean {
  return lifecycle === 'active';
}

export function isIgnoredOverlayLifecycle(lifecycle: ProductContextOverlayLifecycle): boolean {
  return lifecycle === 'blocked' || lifecycle === 'retired';
}
