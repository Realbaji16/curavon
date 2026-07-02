import type { NormalizedFormResponse } from '../types';
import {
  type ExtractionPattern,
  type PatternHit,
  matchPatternsInText,
  responseAnswerBlob,
} from './extractionUtils';

const FEATURE_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'feature_request_general',
    insightType: 'feature_request',
    summary: 'General product feature request',
    productUse: 'Roadmap triage — non-clinical features only',
    regex: /\b(should add (a )?feature|need a feature|wish the app (had|could)|please add|feature request)\b/i,
  },
  {
    id: 'visit_checklist_feature',
    insightType: 'feature_request',
    summary: 'Visit checklist or summary export feature request',
    productUse: 'clinic_pharmacy_prep feature backlog',
    regex: /\b(visit checklist|export (my )?summary|print (for )?doctor|prepare notes for visit)\b/i,
    linkedModules: [{ moduleId: 'clinic_pharmacy_prep_ng_v1', influenceTypes: ['feature'] }],
  },
  {
    id: 'reminder_feature',
    insightType: 'feature_request',
    summary: 'Reminder or follow-up feature request',
    productUse: 'Follow-up and notification product research',
    regex: /\b(remind me|medication reminder|follow[- ]?up reminder)\b/i,
  },
];

export function extractFeatureInsights(responses: readonly NormalizedFormResponse[]): PatternHit[] {
  const hits: PatternHit[] = [];

  for (const response of responses) {
    const blob = responseAnswerBlob(response.deidentifiedAnswers);
    for (const hit of matchPatternsInText(blob, FEATURE_PATTERNS)) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
  }

  return hits;
}
