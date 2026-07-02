import type { NormalizedFormResponse } from '../types';
import {
  type ExtractionPattern,
  type PatternHit,
  matchPatternsInText,
  responseAnswerBlob,
} from './extractionUtils';

const MEDICATION_RISK_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'self_medication',
    insightType: 'unsafe_medication_pattern',
    summary: 'Self-medication pattern described',
    productUse: 'Guardrail and medication module review',
    approvedFor: 'safety_review_only',
    regex: /\b(self[- ]?medicate|self medication|treat myself|buy drugs without doctor)\b/i,
    linkedModules: [{ moduleId: 'medication_question_ng_v1', influenceTypes: ['guardrail'] }],
  },
  {
    id: 'antibiotics_without_prescription',
    insightType: 'unsafe_medication_pattern',
    summary: 'Antibiotics without prescription mentioned',
    productUse: 'blockedOutputs and medication safety review',
    approvedFor: 'safety_review_only',
    regex: /\b(antibiotics? without prescription|buy antibiotics? (over the counter|otc)|amoxicillin without doctor)\b/i,
  },
  {
    id: 'malaria_drugs_without_testing',
    insightType: 'unsafe_medication_pattern',
    summary: 'Malaria drugs taken without testing mentioned',
    productUse: 'fever_malaria and medication guardrail review',
    approvedFor: 'safety_review_only',
    regex: /\b(malaria drug(s)? without (test|testing)|took antimalarial without test|took malaria drug without test|no test before malaria drug)\b/i,
    linkedModules: [{ moduleId: 'fever_malaria_ng_v1', influenceTypes: ['guardrail'] }],
  },
  {
    id: 'mixing_herbal_remedies',
    insightType: 'unsafe_medication_pattern',
    summary: 'Mixing herbal remedies with medicines mentioned',
    productUse: 'Medication mixing guardrail review',
    approvedFor: 'safety_review_only',
    regex: /\b(mix(ing)? herbal|herbal (and|with) (drug|medicine)|agbo (and|with) (drug|medicine))\b/i,
  },
  {
    id: 'frequent_painkiller_use',
    insightType: 'unsafe_medication_pattern',
    summary: 'Frequent painkiller use mentioned',
    productUse: 'Medication safety review — not dosing advice',
    approvedFor: 'safety_review_only',
    regex: /\b(frequent painkiller|too many painkillers|taking painkillers (daily|every day)|ibuprofen every day)\b/i,
  },
  {
    id: 'incomplete_doses_cost',
    insightType: 'unsafe_medication_pattern',
    summary: 'Incomplete doses because of cost mentioned',
    productUse: 'Care blocker + medication adherence context review',
    approvedFor: 'safety_review_only',
    regex: /\b(incomplete dose|stopped (drugs|medicine) because of cost|could not finish (drugs|medicine)|ran out of money for drugs)\b/i,
  },
  {
    id: 'medication_side_effect_risk',
    insightType: 'unsafe_medication_pattern',
    summary: 'Medication side effect or adverse reaction pattern',
    productUse: 'Medication question module safety signals',
    approvedFor: 'safety_review_only',
    regex: /\b(side effect|adverse reaction|bad reaction to (drug|medicine)|swelling after (drug|medicine))\b/i,
    linkedModules: [{ moduleId: 'medication_question_ng_v1', influenceTypes: ['guardrail'] }],
  },
];

const MEDICATION_CONFLICT_PATTERN: ExtractionPattern = {
  id: 'curavon_medication_change_conflict',
  insightType: 'professional_opinion_conflict',
  summary: 'Respondent expects Curavon to stop, start, or change medication',
  productUse: 'do_not_promote_without_review',
  approvedFor: 'safety_review_only',
  regex: /\b(curavon should .{0,80}(stop|start|change)|app should .{0,80}(stop|start|change)|tell (me|users) to (stop|start|change) (the )?(drug|medicine|medication))\b/i,
};

export function extractMedicationRiskInsights(
  responses: readonly NormalizedFormResponse[],
): PatternHit[] {
  const hits: PatternHit[] = [];

  for (const response of responses) {
    const blob = responseAnswerBlob(response.deidentifiedAnswers);
    for (const hit of matchPatternsInText(blob, MEDICATION_RISK_PATTERNS)) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
    for (const hit of matchPatternsInText(blob, [MEDICATION_CONFLICT_PATTERN])) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
  }

  return hits;
}
