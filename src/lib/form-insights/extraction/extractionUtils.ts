import type { FormInsightApprovedFor, FormInsightConfidence, FormSourceRole } from '../types';
import type { FormInsightType } from './insightTaxonomy';
import type { FormInsightLinkedModule } from '../types';

/** One pattern hit on a single normalized response row. */
export type PatternHit = {
  patternId: string;
  insightType: FormInsightType;
  summary: string;
  productUse: string;
  approvedFor: FormInsightApprovedFor;
  responseId: string;
  sourceRole: FormSourceRole;
  linkedModules?: readonly FormInsightLinkedModule[];
};

export type ExtractionPattern = {
  id: string;
  insightType: FormInsightType;
  summary: string;
  productUse: string;
  approvedFor?: FormInsightApprovedFor;
  regex: RegExp;
  linkedModules?: readonly FormInsightLinkedModule[];
};

export function normalizeResponseText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Concatenate de-identified answers into one searchable blob per row. */
export function responseAnswerBlob(answers: Readonly<Record<string, string>>): string {
  return normalizeResponseText(Object.values(answers).join(' '));
}

export function matchPatternsInText(text: string, patterns: readonly ExtractionPattern[]): PatternHit[] {
  const normalized = normalizeResponseText(text);
  const hits: PatternHit[] = [];

  for (const pattern of patterns) {
    if (!pattern.regex.test(normalized)) continue;
    hits.push({
      patternId: pattern.id,
      insightType: pattern.insightType,
      summary: pattern.summary,
      productUse: pattern.productUse,
      approvedFor: pattern.approvedFor ?? defaultApprovedFor(pattern.insightType),
      responseId: '',
      sourceRole: 'unknown',
      linkedModules: pattern.linkedModules,
    });
  }

  return hits;
}

function defaultApprovedFor(type: FormInsightType): FormInsightApprovedFor {
  if (
    type === 'red_flag_candidate' ||
    type === 'unsafe_medication_pattern' ||
    type === 'professional_opinion_conflict' ||
    type === 'guardrail_candidate' ||
    type === 'distrust_wording'
  ) {
    return 'safety_review_only';
  }
  return 'product_context_only';
}

export type AggregatedInsightDraft = {
  insightKey: string;
  insightType: FormInsightType;
  summary: string;
  productUse: string;
  approvedFor: FormInsightApprovedFor;
  confidence: FormInsightConfidence;
  linkedModules: readonly FormInsightLinkedModule[];
  supportCount: number;
  sourceRoles: Set<FormSourceRole>;
  rowRefs: Set<string>;
  patternIds: Set<string>;
};

export function aggregatePatternHits(
  hits: readonly PatternHit[],
): Map<string, AggregatedInsightDraft> {
  const map = new Map<string, AggregatedInsightDraft>();

  for (const hit of hits) {
    const insightKey = `${hit.insightType}::${hit.patternId}`;
    const existing = map.get(insightKey);

    if (!existing) {
      map.set(insightKey, {
        insightKey,
        insightType: hit.insightType,
        summary: hit.summary,
        productUse: hit.productUse,
        approvedFor: hit.approvedFor,
        confidence: 'low',
        linkedModules: hit.linkedModules ?? [],
        supportCount: 1,
        sourceRoles: new Set([hit.sourceRole]),
        rowRefs: new Set([hit.responseId]),
        patternIds: new Set([hit.patternId]),
      });
      continue;
    }

    existing.supportCount += 1;
    existing.sourceRoles.add(hit.sourceRole);
    existing.rowRefs.add(hit.responseId);
    existing.patternIds.add(hit.patternId);
  }

  return map;
}

export function mergeInsightDrafts(
  maps: ReadonlyArray<Map<string, AggregatedInsightDraft>>,
): Map<string, AggregatedInsightDraft> {
  const merged = new Map<string, AggregatedInsightDraft>();

  for (const map of maps) {
    for (const [key, draft] of map.entries()) {
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, {
          ...draft,
          sourceRoles: new Set(draft.sourceRoles),
          rowRefs: new Set(draft.rowRefs),
          patternIds: new Set(draft.patternIds),
        });
        continue;
      }

      existing.supportCount += draft.supportCount;
      for (const role of draft.sourceRoles) existing.sourceRoles.add(role);
      for (const ref of draft.rowRefs) existing.rowRefs.add(ref);
      for (const id of draft.patternIds) existing.patternIds.add(id);
    }
  }

  return merged;
}
