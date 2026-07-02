import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';
import type { NigerianHealthLanguageNormalization } from '../../health-intelligence/services/languageNormalizer';
import type { FormInsight } from '../types';
import {
  evaluateBatchPromotion,
  type BatchPromotionResult,
  type InsightPromotionDecision,
} from './autoPromotionEngine';import type { FormInsightProductContext } from '../formInsightContextTypes';
import {
  buildProductContextFromActiveOverlays,
  deriveOverlaysFromInsights,
} from './productContextOverlayService';
import type { DeriveOverlaysResult } from './productContextOverlayService';

export type FormInsightOverlay = FormInsightProductContext & {
  promotion: BatchPromotionResult;
  overlays: DeriveOverlaysResult;
};

export type BuildFormInsightOverlayOptions = {
  insights?: readonly FormInsight[];
};

/**
 * Build live product overlay from form insights using policy-based overlays.
 * Only active overlays shape runtime behavior — core module files are never mutated.
 */
export function buildFormInsightOverlay(
  options: BuildFormInsightOverlayOptions = {},
): FormInsightOverlay {
  const insights = options.insights ?? [];
  const promotion = evaluateBatchPromotion(insights);
  const overlays = deriveOverlaysFromInsights(insights);
  const context = buildProductContextFromActiveOverlays(overlays.overlays);

  return {
    ...context,
    promotion,
    overlays,
  };
}

/** @deprecated Use buildProductContextFromActiveOverlays via overlay pipeline. */
export function buildProductContextFromInsights(
  insights: readonly FormInsight[],
): FormInsightProductContext {
  const derived = deriveOverlaysFromInsights(insights);
  return buildProductContextFromActiveOverlays(derived.overlays);
}

export function summarizePromotionDecisions(
  decisions: readonly InsightPromotionDecision[],
): Record<string, number> {
  const counts: Record<string, number> = {
    live: 0,
    shadow: 0,
    quarantined: 0,
    blocked: 0,
  };

  for (const decision of decisions) {
    counts[decision.outcome] = (counts[decision.outcome] ?? 0) + 1;
  }

  return counts;
}

// Re-export normalization helpers that operate on overlay context shape.
export function getOverlayModuleHintsForText(
  rawText: string,
  context: FormInsightProductContext,
): HealthModuleId[] {
  const normalized = normalizeMatchText(rawText);
  const hints = new Set<HealthModuleId>();

  for (const trigger of context.routingTriggers) {
    if (trigger.terms.some((term) => normalized.includes(normalizeMatchText(term)))) {
      hints.add(trigger.moduleId);
    }
  }

  return [...hints];
}

export function enrichNormalizationWithOverlay(
  rawText: string,
  base: NigerianHealthLanguageNormalization,
  context: FormInsightProductContext,
): NigerianHealthLanguageNormalization {
  const normalized = normalizeMatchText(rawText);
  const moduleHints = new Set(base.moduleHints);
  const normalizedTerms = { ...base.normalizedTerms };

  for (const trigger of context.routingTriggers) {
    for (const term of trigger.terms) {
      const normalizedTerm = normalizeMatchText(term);
      if (!normalizedTerm || !normalized.includes(normalizedTerm)) continue;
      moduleHints.add(trigger.moduleId);
      normalizedTerms[term] = term;
    }
  }

  return {
    ...base,
    moduleHints: [...moduleHints],
    normalizedTerms,
  };
}

function normalizeMatchText(value: string): string {
  return value.toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, ' ').trim();
}
