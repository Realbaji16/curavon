import { createHash } from 'node:crypto';
import type { FormInsight, NormalizedFormResponse } from '../types';
import { DEFAULT_FORM_INSIGHT_MEDICAL_TRUTH } from '../types';
import { extractBlockerInsights } from './blockerExtractor';
import { extractConcernInsights } from './concernExtractor';
import {
  aggregatePatternHits,
  mergeInsightDrafts,
  type AggregatedInsightDraft,
} from './extractionUtils';
import { extractFeatureInsights } from './featureExtractor';
import { extractMedicationRiskInsights } from './medicationRiskExtractor';
import { extractRedFlagInsights } from './redFlagExtractor';
import { extractSummaryFieldInsights } from './summaryFieldExtractor';
import { extractWordingInsights } from './wordingExtractor';

export type ExtractFormInsightsInput = {
  sourceBatchId: string;
  responses: readonly NormalizedFormResponse[];
};

export type ExtractFormInsightsResult = {
  sourceBatchId: string;
  insights: FormInsight[];
  responseCount: number;
};

/**
 * Deterministic insight extraction from normalized form responses.
 * No AI provider calls — keyword and regex rules only.
 */
export function extractFormInsights(input: ExtractFormInsightsInput): ExtractFormInsightsResult {
  const { sourceBatchId, responses } = input;

  const allHits = [
    ...extractConcernInsights(responses),
    ...extractBlockerInsights(responses),
    ...extractMedicationRiskInsights(responses),
    ...extractRedFlagInsights(responses),
    ...extractSummaryFieldInsights(responses),
    ...extractWordingInsights(responses),
    ...extractFeatureInsights(responses),
  ];

  const aggregated = mergeInsightDrafts([aggregatePatternHits(allHits)]);
  const insights = [...aggregated.values()]
    .map((draft) => toFormInsight(draft, sourceBatchId))
    .sort((left, right) => {
      const countDiff = right.evidence.supportCount - left.evidence.supportCount;
      if (countDiff !== 0) return countDiff;
      return left.insightType.localeCompare(right.insightType);
    });

  return {
    sourceBatchId,
    insights,
    responseCount: responses.length,
  };
}

function toFormInsight(draft: AggregatedInsightDraft, sourceBatchId: string): FormInsight {
  return {
    insightId: buildInsightId(draft),
    sourceBatchId,
    insightType: draft.insightType,
    summary: draft.summary,
    evidence: {
      supportCount: draft.supportCount,
      sourceRoles: [...draft.sourceRoles].sort(),
      rowRefs: [...draft.rowRefs].sort(),
      matchedPatterns: [...draft.patternIds].sort(),
    },
    confidence: 'low',
    medicalTruth: DEFAULT_FORM_INSIGHT_MEDICAL_TRUTH,
    approvedFor: draft.approvedFor,
    linkedModules: draft.linkedModules,
    productUse: draft.productUse,
    status: 'review',
  };
}

function buildInsightId(draft: AggregatedInsightDraft): string {
  const seed = `${draft.insightType}::${[...draft.patternIds].sort().join('|')}`;
  return `fi_${createHash('sha256').update(seed).digest('hex').slice(0, 16)}`;
}

export {
  extractBlockerInsights,
  extractConcernInsights,
  extractFeatureInsights,
  extractMedicationRiskInsights,
  extractRedFlagInsights,
  extractSummaryFieldInsights,
  extractWordingInsights,
};
