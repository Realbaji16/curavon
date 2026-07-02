import type { HealthModuleId } from '../health-intelligence/modules/moduleIds';
import type { NigerianHealthLanguageNormalization } from '../health-intelligence/services/languageNormalizer';
import type { FormInsight } from './types';
import {
  enrichNormalizationWithOverlay,
  getOverlayModuleHintsForText,
  buildFormInsightOverlay,
} from './promotion/overlayBuilder';
import {
  EMPTY_FORM_INSIGHT_PRODUCT_CONTEXT,
  type FormInsightProductContext,
} from './formInsightContextTypes';

export type {
  FormInsightBlockerOption,
  FormInsightCareRouteCopyLine,
  FormInsightFeatureHint,
  FormInsightProductContext,
  FormInsightResponseCopyLine,
  FormInsightRoutingTrigger,
  FormInsightSafeQuestionCandidate,
  FormInsightSummaryFieldCandidate,
} from './formInsightContextTypes';

export { EMPTY_FORM_INSIGHT_PRODUCT_CONTEXT };

export type BuildFormInsightProductContextOptions = {
  insights?: readonly FormInsight[];
};

/**
 * Build live product context from form insights using policy-based auto-promotion.
 * Only live-eligible insights shape runtime behavior.
 */
export function buildFormInsightProductContext(
  options: BuildFormInsightProductContextOptions = {},
): FormInsightProductContext {
  return buildFormInsightOverlay(options);
}

export function getFormInsightModuleHintsForText(
  rawText: string,
  context: FormInsightProductContext = EMPTY_FORM_INSIGHT_PRODUCT_CONTEXT,
): HealthModuleId[] {
  return getOverlayModuleHintsForText(rawText, context);
}

export function enrichNigerianHealthLanguageNormalization(
  rawText: string,
  base: NigerianHealthLanguageNormalization,
  context: FormInsightProductContext = EMPTY_FORM_INSIGHT_PRODUCT_CONTEXT,
): NigerianHealthLanguageNormalization {
  return enrichNormalizationWithOverlay(rawText, base, context);
}
