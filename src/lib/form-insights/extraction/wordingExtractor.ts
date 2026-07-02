import type { NormalizedFormResponse } from '../types';
import {
  type ExtractionPattern,
  type PatternHit,
  matchPatternsInText,
  responseAnswerBlob,
} from './extractionUtils';

const TRUST_WORDING_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'not_a_diagnosis',
    insightType: 'trust_wording',
    summary: 'Trust wording: not a diagnosis',
    productUse: 'Composer and disclaimer copy alignment',
    regex: /\b(this is not a diagnosis|does not diagnose|not a diagnosis)\b/i,
  },
  {
    id: 'not_a_prescription',
    insightType: 'trust_wording',
    summary: 'Trust wording: not a prescription',
    productUse: 'Medication boundary copy alignment',
    regex: /\b(this is not a prescription|not a prescription|does not prescribe)\b/i,
  },
  {
    id: 'speak_with_clinician_pharmacist',
    insightType: 'trust_wording',
    summary: 'Trust wording: speak with doctor or pharmacist',
    productUse: 'Escalation copy research — organizational only',
    regex: /\b(speak with a (doctor|clinician|pharmacist)|talk to a (doctor|clinician|pharmacist)|see a health professional)\b/i,
  },
];

const GUARDRAIL_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'diagnosis_language_guardrail',
    insightType: 'guardrail_candidate',
    summary: 'Diagnosis-like output language to block',
    productUse: 'blockedOutputs diagnosis patterns',
    approvedFor: 'safety_review_only',
    regex: /\b(you have (malaria|typhoid|hypertension)|this confirms (malaria|typhoid)|definitely have)\b/i,
  },
  {
    id: 'prescription_language_guardrail',
    insightType: 'guardrail_candidate',
    summary: 'Prescription-like output language to block',
    productUse: 'blockedOutputs prescription patterns',
    approvedFor: 'safety_review_only',
    regex: /\b(take amoxicillin|take antimalarial|prescribe|start antibiotics)\b/i,
  },
];

const DISTRUST_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'app_gives_medical_advice',
    insightType: 'distrust_wording',
    summary: 'Distrust: app perceived as giving medical advice',
    productUse: 'Copy and boundary review',
    approvedFor: 'safety_review_only',
    regex: /\b(app (told|says) me to take|curavon (diagnosed|prescribed)|gives medical advice)\b/i,
  },
];

const PRIVACY_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'privacy_data_deletion',
    insightType: 'privacy_requirement',
    summary: 'Privacy, data deletion, or sensitive mode expectation',
    productUse: 'Privacy UX and retention policy inputs',
    regex: /\b(delete my data|data deletion|privacy|sensitive mode|don't share my (data|information))\b/i,
  },
];

const LIFESTYLE_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'stress_sleep_work',
    insightType: 'lifestyle_context',
    summary: 'Stress, sleep, or work lifestyle context',
    productUse: 'stress_anxiety_sleep_ng_v1 overlap research',
    regex: /\b(no sleep|lack of sleep|stress at work|work stress|burnout|overworked)\b/i,
    linkedModules: [{ moduleId: 'stress_anxiety_sleep_ng_v1', influenceTypes: ['trigger'] }],
  },
];

const PROFESSIONAL_CONFLICT_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'conflicting_professional_opinions',
    insightType: 'professional_opinion_conflict',
    summary: 'Conflicting professional opinions described',
    productUse: 'do_not_promote_without_review',
    approvedFor: 'safety_review_only',
    regex: /\b(doctor said .{0,40} but pharmacist said|nurse disagreed|conflicting advice from (doctor|pharmacist))\b/i,
  },
  {
    id: 'promote_medication_change',
    insightType: 'professional_opinion_conflict',
    summary: 'Form suggests promoting medication start/stop/change',
    productUse: 'do_not_promote_without_review',
    approvedFor: 'safety_review_only',
    regex: /\b(should (stop|start|change) (the )?(drug|medicine|medication)|tell (patients|users) to (stop|start) (the )?(drug|medicine))\b/i,
  },
];

export function extractWordingInsights(responses: readonly NormalizedFormResponse[]): PatternHit[] {
  const hits: PatternHit[] = [];
  const patterns = [
    ...TRUST_WORDING_PATTERNS,
    ...GUARDRAIL_PATTERNS,
    ...DISTRUST_PATTERNS,
    ...PRIVACY_PATTERNS,
    ...LIFESTYLE_PATTERNS,
    ...PROFESSIONAL_CONFLICT_PATTERNS,
  ];

  for (const response of responses) {
    const blob = responseAnswerBlob(response.deidentifiedAnswers);
    for (const hit of matchPatternsInText(blob, patterns)) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
  }

  return hits;
}
