import type { NormalizedFormResponse } from '../types';
import {
  type ExtractionPattern,
  type PatternHit,
  matchPatternsInText,
  responseAnswerBlob,
} from './extractionUtils';

const RED_FLAG_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'severe_allergic_reaction',
    insightType: 'red_flag_candidate',
    summary: 'Severe allergic reaction or swelling language',
    productUse: 'red_flags dictionary review',
    approvedFor: 'safety_review_only',
    regex: /\b(severe allergic reaction|anaphylaxis|throat swelling|tongue swelling|face swelling)\b/i,
  },
  {
    id: 'difficulty_breathing',
    insightType: 'red_flag_candidate',
    summary: 'Difficulty breathing language',
    productUse: 'red_flags and breathing module review',
    approvedFor: 'safety_review_only',
    regex: /\b(difficulty breathing|cannot breathe|shortness of breath|trouble breathing|breathless)\b/i,
    linkedModules: [{ moduleId: 'breathing_difficulty_ng_v1', influenceTypes: ['guardrail'] }],
  },
  {
    id: 'chest_pain',
    insightType: 'red_flag_candidate',
    summary: 'Chest pain language',
    productUse: 'red_flags and chest_pain module review',
    approvedFor: 'safety_review_only',
    regex: /\b(chest pain|pain in (my )?chest|tight chest)\b/i,
    linkedModules: [{ moduleId: 'chest_pain_ng_v1', influenceTypes: ['guardrail'] }],
  },
  {
    id: 'seizures',
    insightType: 'red_flag_candidate',
    summary: 'Seizure language',
    productUse: 'red_flags dictionary review',
    approvedFor: 'safety_review_only',
    regex: /\b(seizure|convulsion|fitting|epileptic fit)\b/i,
  },
  {
    id: 'fainting',
    insightType: 'red_flag_candidate',
    summary: 'Fainting or loss of consciousness language',
    productUse: 'red_flags dictionary review',
    approvedFor: 'safety_review_only',
    regex: /\b(faint(ed|ing)?|passed out|loss of consciousness|blacked out)\b/i,
  },
  {
    id: 'blood_in_vomit_stool_urine_cough',
    insightType: 'red_flag_candidate',
    summary: 'Blood in vomit, stool, urine, or cough language',
    productUse: 'red_flags dictionary review',
    approvedFor: 'safety_review_only',
    regex: /\b(blood in (vomit|stool|urine|cough|sputum)|vomiting blood|coughing blood|bloody stool)\b/i,
  },
];

export function extractRedFlagInsights(responses: readonly NormalizedFormResponse[]): PatternHit[] {
  const hits: PatternHit[] = [];

  for (const response of responses) {
    const blob = responseAnswerBlob(response.deidentifiedAnswers);
    for (const hit of matchPatternsInText(blob, RED_FLAG_PATTERNS)) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
  }

  return hits;
}
