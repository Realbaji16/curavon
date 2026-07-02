import type { HealthModuleId } from '../health-intelligence/modules/moduleIds';

export type FormInsightRoutingTrigger = {
  moduleId: HealthModuleId;
  terms: readonly string[];
  insightId: string;
};

export type FormInsightBlockerOption = {
  id: string;
  label: string;
  moduleId?: HealthModuleId;
  insightId: string;
};

export type FormInsightSummaryFieldCandidate = {
  fieldId: string;
  label: string;
  moduleId?: HealthModuleId;
  insightId: string;
};

export type FormInsightResponseCopyLine = {
  line: string;
  moduleId?: HealthModuleId;
  insightId: string;
};

export type FormInsightFeatureHint = {
  featureId: string;
  description: string;
  moduleId?: HealthModuleId;
  insightId: string;
};

export type FormInsightCareRouteCopyLine = {
  line: string;
  moduleId?: HealthModuleId;
  insightId: string;
};

export type FormInsightSafeQuestionCandidate = {
  questionId: string;
  prompt: string;
  moduleId?: HealthModuleId;
  insightId: string;
};

/** Live-applied form-insight product context — never clinical truth or guardrail overrides. */
export type FormInsightProductContext = {
  routingTriggers: readonly FormInsightRoutingTrigger[];
  blockerOptions: readonly FormInsightBlockerOption[];
  summaryFieldCandidates: readonly FormInsightSummaryFieldCandidate[];
  responseCopyLines: readonly FormInsightResponseCopyLine[];
  featureHints: readonly FormInsightFeatureHint[];
  careRouteCopyLines: readonly FormInsightCareRouteCopyLine[];
  safeQuestionCandidates: readonly FormInsightSafeQuestionCandidate[];
  appliedInsightIds: readonly string[];
};

export const EMPTY_FORM_INSIGHT_PRODUCT_CONTEXT: FormInsightProductContext = {
  routingTriggers: [],
  blockerOptions: [],
  summaryFieldCandidates: [],
  responseCopyLines: [],
  featureHints: [],
  careRouteCopyLines: [],
  safeQuestionCandidates: [],
  appliedInsightIds: [],
};
