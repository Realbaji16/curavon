import type { NormalizedFormResponse } from '../types';
import {
  type ExtractionPattern,
  type PatternHit,
  matchPatternsInText,
  responseAnswerBlob,
} from './extractionUtils';

const BLOCKER_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'cost_blocker',
    insightType: 'care_blocker',
    summary: 'Cost or affordability blocker to care',
    productUse: 'Visit blocker and friction-reduction research',
    regex: /\b(too expensive|cannot afford|can't afford|no money|cost (is )?too high|money for (drugs|medicine|test))\b/i,
    linkedModules: [{ moduleId: 'clinic_pharmacy_prep_ng_v1', influenceTypes: ['blocker'] }],
  },
  {
    id: 'long_waiting_time',
    insightType: 'care_blocker',
    summary: 'Long waiting time or queue blocker',
    productUse: 'Visit blocker research for clinic prep',
    regex: /\b(long (queue|wait|waiting)|waiting (for )?hours|hospital queue|spent hours waiting)\b/i,
    linkedModules: [{ moduleId: 'clinic_pharmacy_prep_ng_v1', influenceTypes: ['blocker'] }],
  },
];

export function extractBlockerInsights(responses: readonly NormalizedFormResponse[]): PatternHit[] {
  const hits: PatternHit[] = [];

  for (const response of responses) {
    const blob = responseAnswerBlob(response.deidentifiedAnswers);
    for (const hit of matchPatternsInText(blob, BLOCKER_PATTERNS)) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
  }

  return hits;
}
