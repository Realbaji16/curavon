import type { NormalizedFormResponse } from '../types';
import {
  type ExtractionPattern,
  type PatternHit,
  matchPatternsInText,
  responseAnswerBlob,
} from './extractionUtils';

const SUMMARY_FIELD_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'allergies',
    insightType: 'summary_field_candidate',
    summary: 'Allergy context appears in responses',
    productUse: 'summary_fields allergies column review',
    regex: /\b(allerg(y|ies)|allergic to|drug allergy)\b/i,
    linkedModules: [{ moduleId: 'medication_question_ng_v1', influenceTypes: ['summary_field'] }],
  },
  {
    id: 'drugs_already_taken',
    insightType: 'summary_field_candidate',
    summary: 'Medicines already taken context appears',
    productUse: 'medicines_taken summary field validation',
    regex: /\b(already took|medicines? (already )?taken|drugs? (already )?taken|took (malaria drug|antibiotics?))\b/i,
    linkedModules: [
      { moduleId: 'fever_malaria_ng_v1', influenceTypes: ['summary_field'] },
      { moduleId: 'medication_question_ng_v1', influenceTypes: ['summary_field'] },
    ],
  },
  {
    id: 'symptom_start_time',
    insightType: 'summary_field_candidate',
    summary: 'Symptom start time context appears',
    productUse: 'timeline summary field validation',
    regex: /\b(since yesterday|since last week|started (yesterday|this morning)|when (it|symptoms?) started)\b/i,
    linkedModules: [{ moduleId: 'fever_malaria_ng_v1', influenceTypes: ['summary_field', 'question'] }],
  },
];

const SAFE_QUESTION_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'when_did_it_start',
    insightType: 'safe_question_candidate',
    summary: 'When did symptoms start — safe question theme',
    productUse: 'required_questions onset phrasing review',
    regex: /\b(when did (it|this|symptoms?) start|how long (has|have) (it|this) been)\b/i,
  },
  {
    id: 'what_medicines_taken',
    insightType: 'safe_question_candidate',
    summary: 'What medicines were taken — safe question theme',
    productUse: 'medication_context question phrasing review',
    regex: /\b(what (medicine|drug|medication) (did you|have you) take|which drugs? (did you|have you) take)\b/i,
  },
  {
    id: 'any_allergies',
    insightType: 'safe_question_candidate',
    summary: 'Allergy screening question theme',
    productUse: 'medication module allergy question review',
    regex: /\b(any allergies|do you have allergies|known allergies)\b/i,
  },
];

export function extractSummaryFieldInsights(
  responses: readonly NormalizedFormResponse[],
): PatternHit[] {
  const hits: PatternHit[] = [];

  for (const response of responses) {
    const blob = responseAnswerBlob(response.deidentifiedAnswers);
    const patterns = [...SUMMARY_FIELD_PATTERNS, ...SAFE_QUESTION_PATTERNS];
    for (const hit of matchPatternsInText(blob, patterns)) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
  }

  return hits;
}
