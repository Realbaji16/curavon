import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';
import type { ModuleInfluenceType } from '../mapping/moduleInfluenceTypes';
import type { FormInsight, FormInsightLinkedModule } from '../types';
import { sanitizeFormInsightProductText } from '../review/insightReviewPolicy';
import { evaluateInsightPromotion } from './autoPromotionEngine';
import { isQuarantineInsightType } from './autoPromotionPolicy';
import type { FormInsightProductContext } from '../formInsightContextTypes';
import {
  isActiveOverlayLifecycle,
  isIgnoredOverlayLifecycle,
  type BlockerOptionOverlayPayload,
  type CareRouteOverlayPayload,
  type FeatureBacklogItemOverlayPayload,
  type LifestyleContextOverlayPayload,
  type ModuleTriggerOverlayPayload,
  type ProductContextOverlay,
  type ProductContextOverlayLifecycle,
  type ProductContextOverlayPayload,
  type ProductContextOverlayType,
  type ResponseCopyOverlayPayload,
  type SafeQuestionOverlayPayload,
  type SummaryFieldOverlayPayload,
  validateOverlayPayload,
} from './productContextOverlayTypes';

export type DeriveOverlaysResult = {
  overlays: readonly ProductContextOverlay[];
  active: ProductContextOverlay[];
  shadow: ProductContextOverlay[];
  blocked: ProductContextOverlay[];
};

export type BuildProductContextFromOverlaysOptions = {
  overlays?: readonly ProductContextOverlay[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function nowIso(): string {
  return new Date().toISOString();
}

export function resolveOverlayTypeForInfluence(
  insight: FormInsight,
  influenceType: ModuleInfluenceType,
): ProductContextOverlayType | null {
  if (insight.insightType === 'lifestyle_context') {
    return 'lifestyle_context';
  }

  const mapping: Partial<Record<ModuleInfluenceType, ProductContextOverlayType>> = {
    trigger: 'module_trigger',
    blocker: 'blocker_option',
    care_route: 'care_route',
    summary_field: 'summary_field',
    question: 'safe_question',
    response_copy: 'response_copy',
    feature: 'feature_backlog_item',
  };

  return mapping[influenceType] ?? null;
}

export function resolveOverlayLifecycle(insight: FormInsight): ProductContextOverlayLifecycle {
  if (insight.status === 'rejected') {
    return 'blocked';
  }

  if (isQuarantineInsightType(insight.insightType)) {
    return 'blocked';
  }

  const promotion = evaluateInsightPromotion(insight);

  if (promotion.quarantined || promotion.outcome === 'blocked') {
    return 'blocked';
  }

  if (promotion.liveEligible) {
    return 'active';
  }

  if (promotion.shadowOnly || promotion.outcome === 'shadow') {
    return 'shadow';
  }

  return 'blocked';
}

function extractRoutingTerms(insight: FormInsight): string[] {
  const fromPatterns = (insight.evidence.matchedPatterns ?? [])
    .map((pattern) => sanitizeFormInsightProductText(pattern))
    .filter((value): value is string => Boolean(value));

  if (fromPatterns.length > 0) {
    return [...new Set(fromPatterns)];
  }

  if (
    insight.insightType === 'nigerian_phrase' ||
    insight.insightType === 'module_trigger_candidate' ||
    insight.insightType === 'common_concern' ||
    insight.insightType === 'lifestyle_context'
  ) {
    const summaryTerm = sanitizeFormInsightProductText(insight.summary);
    return summaryTerm ? [summaryTerm] : [];
  }

  return [];
}

function buildOverlayPayload(
  insight: FormInsight,
  overlayType: ProductContextOverlayType,
  link: FormInsightLinkedModule,
): ProductContextOverlayPayload | null {
  const moduleId = link.moduleId;

  if (overlayType === 'module_trigger') {
    const terms = extractRoutingTerms(insight);
    if (terms.length === 0) return null;
    return { moduleId, terms };
  }

  if (overlayType === 'blocker_option') {
    const label = sanitizeFormInsightProductText(insight.summary);
    if (!label) return null;
    return {
      optionId: `form_insight_blocker_${slugify(insight.insightId)}`,
      label,
      moduleId,
    } satisfies BlockerOptionOverlayPayload;
  }

  if (overlayType === 'care_route') {
    const label = sanitizeFormInsightProductText(insight.summary);
    if (!label) return null;
    return {
      routeId: `form_insight_route_${slugify(insight.insightId)}`,
      label,
      moduleId,
    };
  }

  if (overlayType === 'summary_field') {
    const label = sanitizeFormInsightProductText(insight.summary);
    if (!label) return null;
    return {
      fieldId: `form_insight_${slugify(insight.insightId)}`,
      label,
      moduleId,
    } satisfies SummaryFieldOverlayPayload;
  }

  if (overlayType === 'safe_question') {
    const prompt = sanitizeFormInsightProductText(insight.summary);
    if (!prompt) return null;
    return {
      questionId: `form_insight_question_${slugify(insight.insightId)}`,
      prompt,
      moduleId,
    };
  }

  if (overlayType === 'response_copy') {
    const line = sanitizeFormInsightProductText(insight.summary);
    if (!line) return null;
    return { line, moduleId } satisfies ResponseCopyOverlayPayload;
  }

  if (overlayType === 'feature_backlog_item') {
    const description = sanitizeFormInsightProductText(insight.summary);
    if (!description) return null;
    return {
      featureId: `form_insight_feature_${slugify(insight.insightId)}`,
      description,
      moduleId,
    } satisfies FeatureBacklogItemOverlayPayload;
  }

  if (overlayType === 'lifestyle_context') {
    const label = sanitizeFormInsightProductText(insight.summary);
    if (!label) return null;
    const terms = extractRoutingTerms(insight);
    return {
      contextId: `form_insight_lifestyle_${slugify(insight.insightId)}`,
      label,
      moduleId,
      terms: terms.length > 0 ? terms : undefined,
    } satisfies LifestyleContextOverlayPayload;
  }

  return null;
}

function buildOverlayRecord(
  insight: FormInsight,
  overlayType: ProductContextOverlayType,
  payload: ProductContextOverlayPayload,
  lifecycle: ProductContextOverlayLifecycle,
  moduleId?: HealthModuleId,
  validationReasons: readonly string[] = [],
): ProductContextOverlay {
  const timestamp = nowIso();
  const overlayKey = `${insight.insightId}:${overlayType}:${moduleId ?? 'global'}`;
  const overlayId = `overlay_${slugify(overlayKey)}`;

  return {
    overlayId,
    overlayKey,
    sourceInsightId: insight.insightId,
    sourceBatchId: insight.sourceBatchId,
    overlayType,
    lifecycle,
    payload,
    moduleId,
    validationReasons,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function deriveOverlaysFromInsight(insight: FormInsight): ProductContextOverlay[] {
  const baseLifecycle = resolveOverlayLifecycle(insight);
  const overlays: ProductContextOverlay[] = [];

  for (const link of insight.linkedModules) {
    for (const influenceType of link.influenceTypes) {
      const overlayType = resolveOverlayTypeForInfluence(insight, influenceType);
      if (!overlayType) continue;

      const payload = buildOverlayPayload(insight, overlayType, link);
      if (!payload) continue;

      const validation = validateOverlayPayload(payload);
      const lifecycle =
        !validation.valid || isIgnoredOverlayLifecycle(baseLifecycle)
          ? 'blocked'
          : baseLifecycle;

      overlays.push(
        buildOverlayRecord(
          insight,
          overlayType,
          payload,
          lifecycle,
          link.moduleId,
          validation.valid ? [] : validation.reasons,
        ),
      );
    }
  }

  return overlays;
}

export function deriveOverlaysFromInsights(insights: readonly FormInsight[]): DeriveOverlaysResult {
  const overlays = insights.flatMap((insight) => deriveOverlaysFromInsight(insight));
  return partitionOverlays(overlays);
}

export function partitionOverlays(overlays: readonly ProductContextOverlay[]): DeriveOverlaysResult {
  const active: ProductContextOverlay[] = [];
  const shadow: ProductContextOverlay[] = [];
  const blocked: ProductContextOverlay[] = [];

  for (const overlay of overlays) {
    if (overlay.lifecycle === 'active') {
      active.push(overlay);
    } else if (overlay.lifecycle === 'shadow') {
      shadow.push(overlay);
    } else {
      blocked.push(overlay);
    }
  }

  return { overlays, active, shadow, blocked };
}

export function getActiveOverlays(overlays: readonly ProductContextOverlay[]): ProductContextOverlay[] {
  return overlays.filter((overlay) => isActiveOverlayLifecycle(overlay.lifecycle));
}

export function buildProductContextFromActiveOverlays(
  overlays: readonly ProductContextOverlay[],
): FormInsightProductContext {
  const active = getActiveOverlays(overlays);
  const routingTriggers: FormInsightProductContext['routingTriggers'][number][] = [];
  const blockerOptions: FormInsightProductContext['blockerOptions'][number][] = [];
  const summaryFieldCandidates: FormInsightProductContext['summaryFieldCandidates'][number][] = [];
  const responseCopyLines: FormInsightProductContext['responseCopyLines'][number][] = [];
  const featureHints: FormInsightProductContext['featureHints'][number][] = [];
  const careRouteCopyLines: FormInsightProductContext['careRouteCopyLines'][number][] = [];
  const safeQuestionCandidates: FormInsightProductContext['safeQuestionCandidates'][number][] = [];
  const appliedInsightIds = new Set<string>();

  for (const overlay of active) {
    const insightId = overlay.sourceInsightId;

    if (overlay.overlayType === 'module_trigger') {
      const payload = overlay.payload as ModuleTriggerOverlayPayload;
      routingTriggers.push({
        moduleId: payload.moduleId,
        terms: payload.terms,
        insightId,
      });
      appliedInsightIds.add(insightId);
      continue;
    }

    if (overlay.overlayType === 'lifestyle_context') {
      const payload = overlay.payload as LifestyleContextOverlayPayload;
      if (payload.moduleId && payload.terms && payload.terms.length > 0) {
        routingTriggers.push({
          moduleId: payload.moduleId,
          terms: payload.terms,
          insightId,
        });
        appliedInsightIds.add(insightId);
      }
      continue;
    }

    if (overlay.overlayType === 'blocker_option') {
      const payload = overlay.payload as BlockerOptionOverlayPayload;
      blockerOptions.push({
        id: payload.optionId,
        label: payload.label,
        moduleId: payload.moduleId,
        insightId,
      });
      appliedInsightIds.add(insightId);
      continue;
    }

    if (overlay.overlayType === 'summary_field') {
      const payload = overlay.payload as SummaryFieldOverlayPayload;
      summaryFieldCandidates.push({
        fieldId: payload.fieldId,
        label: payload.label,
        moduleId: payload.moduleId,
        insightId,
      });
      appliedInsightIds.add(insightId);
      continue;
    }

    if (overlay.overlayType === 'response_copy') {
      const payload = overlay.payload as ResponseCopyOverlayPayload;
      responseCopyLines.push({
        line: payload.line,
        moduleId: payload.moduleId,
        insightId,
      });
      appliedInsightIds.add(insightId);
      continue;
    }

    if (overlay.overlayType === 'feature_backlog_item') {
      const payload = overlay.payload as FeatureBacklogItemOverlayPayload;
      featureHints.push({
        featureId: payload.featureId,
        description: payload.description,
        moduleId: payload.moduleId,
        insightId,
      });
      appliedInsightIds.add(insightId);
      continue;
    }

    if (overlay.overlayType === 'care_route') {
      const payload = overlay.payload as CareRouteOverlayPayload;
      careRouteCopyLines.push({
        line: payload.label,
        moduleId: payload.moduleId,
        insightId,
      });
      appliedInsightIds.add(insightId);
      continue;
    }

    if (overlay.overlayType === 'safe_question') {
      const payload = overlay.payload as SafeQuestionOverlayPayload;
      safeQuestionCandidates.push({
        questionId: payload.questionId,
        prompt: payload.prompt,
        moduleId: payload.moduleId,
        insightId,
      });
      appliedInsightIds.add(insightId);
    }
  }

  return {
    routingTriggers: dedupeRoutingTriggers(routingTriggers),
    blockerOptions: dedupeById(blockerOptions),
    summaryFieldCandidates: dedupeSummaryFields(summaryFieldCandidates),
    responseCopyLines: dedupeResponseCopy(responseCopyLines),
    featureHints: dedupeFeatureHints(featureHints),
    careRouteCopyLines: dedupeCareRouteCopy(careRouteCopyLines),
    safeQuestionCandidates: dedupeSafeQuestions(safeQuestionCandidates),
    appliedInsightIds: [...appliedInsightIds],
  };
}

function dedupeRoutingTriggers(
  triggers: FormInsightProductContext['routingTriggers'][number][],
): FormInsightProductContext['routingTriggers'] {
  const seen = new Set<string>();
  const result: typeof triggers = [];
  for (const trigger of triggers) {
    const key = `${trigger.moduleId}:${trigger.terms.join('|')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trigger);
  }
  return result;
}

function dedupeFeatureHints(
  hints: FormInsightProductContext['featureHints'][number][],
): FormInsightProductContext['featureHints'] {
  const seen = new Set<string>();
  const result: typeof hints = [];
  for (const hint of hints) {
    if (seen.has(hint.featureId)) continue;
    seen.add(hint.featureId);
    result.push(hint);
  }
  return result;
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
}

function dedupeSummaryFields(
  fields: FormInsightProductContext['summaryFieldCandidates'][number][],
): FormInsightProductContext['summaryFieldCandidates'] {
  const seen = new Set<string>();
  const result: typeof fields = [];
  for (const field of fields) {
    if (seen.has(field.fieldId)) continue;
    seen.add(field.fieldId);
    result.push(field);
  }
  return result;
}

function dedupeResponseCopy(
  lines: FormInsightProductContext['responseCopyLines'][number][],
): FormInsightProductContext['responseCopyLines'] {
  const seen = new Set<string>();
  const result: typeof lines = [];
  for (const entry of lines) {
    const key = `${entry.moduleId ?? 'global'}:${entry.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function dedupeCareRouteCopy(
  lines: FormInsightProductContext['careRouteCopyLines'][number][],
): FormInsightProductContext['careRouteCopyLines'] {
  const seen = new Set<string>();
  const result: typeof lines = [];
  for (const entry of lines) {
    const key = `${entry.moduleId ?? 'global'}:${entry.line}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(entry);
  }
  return result;
}

function dedupeSafeQuestions(
  questions: FormInsightProductContext['safeQuestionCandidates'][number][],
): FormInsightProductContext['safeQuestionCandidates'] {
  const seen = new Set<string>();
  const result: typeof questions = [];
  for (const entry of questions) {
    if (seen.has(entry.questionId)) continue;
    seen.add(entry.questionId);
    result.push(entry);
  }
  return result;
}

export function retireOverlay(overlay: ProductContextOverlay, retiredAt?: string): ProductContextOverlay {
  const timestamp = retiredAt ?? nowIso();
  return {
    ...overlay,
    lifecycle: 'retired',
    updatedAt: timestamp,
    retiredAt: timestamp,
  };
}

export function activateOverlay(overlay: ProductContextOverlay): ProductContextOverlay {
  if (overlay.validationReasons.length > 0) {
    return { ...overlay, lifecycle: 'blocked', updatedAt: nowIso() };
  }
  return { ...overlay, lifecycle: 'active', updatedAt: nowIso() };
}

export function shadowOverlay(overlay: ProductContextOverlay): ProductContextOverlay {
  return { ...overlay, lifecycle: 'shadow', updatedAt: nowIso() };
}
