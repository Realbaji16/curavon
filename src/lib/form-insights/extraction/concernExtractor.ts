import type { NormalizedFormResponse } from '../types';
import {
  type ExtractionPattern,
  type PatternHit,
  matchPatternsInText,
  responseAnswerBlob,
} from './extractionUtils';

const CONCERN_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'fever_malaria',
    insightType: 'common_concern',
    summary: 'Fever or malaria-related concern mentioned',
    productUse: 'fever_malaria_ng_v1 module priority',
    regex: /\b(fever|malaria|typhoid|body hot|hot body|body dey hot|chills|shivering)\b/i,
    linkedModules: [{ moduleId: 'fever_malaria_ng_v1', influenceTypes: ['trigger'] }],
  },
  {
    id: 'headache',
    insightType: 'common_concern',
    summary: 'Headache concern mentioned',
    productUse: 'headache_ng_v1 module priority',
    regex: /\b(headache|head pain|head dey bang|migraine|heavy head)\b/i,
    linkedModules: [{ moduleId: 'headache_ng_v1', influenceTypes: ['trigger'] }],
  },
  {
    id: 'cough_catarrh',
    insightType: 'common_concern',
    summary: 'Cough or catarrh concern mentioned',
    productUse: 'cough_catarrh_ng_v1 module priority',
    regex: /\b(cough|catarrh|running nose|blocked nose|sore throat)\b/i,
    linkedModules: [{ moduleId: 'cough_catarrh_ng_v1', influenceTypes: ['trigger'] }],
  },
  {
    id: 'stomach_ulcer_indigestion',
    insightType: 'common_concern',
    summary: 'Stomach, ulcer, or indigestion concern mentioned',
    productUse: 'stomach_pain_ng_v1 module priority',
    regex: /\b(stomach pain|belle pain|belly pain|ulcer|indigestion|heartburn|acid reflux)\b/i,
    linkedModules: [{ moduleId: 'stomach_pain_ng_v1', influenceTypes: ['trigger'] }],
  },
  {
    id: 'blood_pressure',
    insightType: 'common_concern',
    summary: 'Blood pressure concern mentioned',
    productUse: 'blood_pressure_ng_v1 module priority',
    regex: /\b(blood pressure|bp high|hypertension|bp reading|bp too high)\b/i,
    linkedModules: [{ moduleId: 'blood_pressure_ng_v1', influenceTypes: ['trigger'] }],
  },
  {
    id: 'diabetes',
    insightType: 'common_concern',
    summary: 'Diabetes or blood sugar concern mentioned',
    productUse: 'blood_sugar_ng_v1 module priority',
    regex: /\b(diabetes|blood sugar|high sugar|hypoglycemia)\b/i,
    linkedModules: [{ moduleId: 'blood_sugar_ng_v1', influenceTypes: ['trigger'] }],
  },
  {
    id: 'pregnancy',
    insightType: 'common_concern',
    summary: 'Pregnancy-related concern mentioned',
    productUse: 'pregnancy_concern_ng_v1 module priority',
    regex: /\b(pregnant|pregnancy|antenatal|prenatal)\b/i,
    linkedModules: [{ moduleId: 'pregnancy_concern_ng_v1', influenceTypes: ['trigger'] }],
  },
  {
    id: 'medication_side_effect',
    insightType: 'common_concern',
    summary: 'Medication side effect concern mentioned',
    productUse: 'medication_question_ng_v1 module priority',
    regex: /\b(side effect|body itching after|rash after (drug|medicine)|reaction after)\b/i,
    linkedModules: [{ moduleId: 'medication_question_ng_v1', influenceTypes: ['trigger'] }],
  },
  {
    id: 'lab_result_confusion',
    insightType: 'common_concern',
    summary: 'Lab or test result confusion mentioned',
    productUse: 'lab_result_confusion_ng_v1 module priority',
    regex: /\b(widal|lab result|test result|don't understand (my )?result|confus(ed|ing) (by|about) (lab|test|result))\b/i,
    linkedModules: [{ moduleId: 'lab_result_confusion_ng_v1', influenceTypes: ['trigger'] }],
  },
];

const CARE_ROUTE_PATTERNS: readonly ExtractionPattern[] = [
  {
    id: 'pharmacy_first',
    insightType: 'care_route',
    summary: 'Pharmacy-first or chemist-first care path described',
    productUse: 'Care-route research — descriptive only, no facility directive',
    regex: /\b(chemist first|pharmacy first|went to (chemist|pharmacy) before (doctor|clinic|hospital)|buy medicine from chemist)\b/i,
    linkedModules: [{ moduleId: 'medication_question_ng_v1', influenceTypes: ['care_route'] }],
  },
  {
    id: 'clinic_hospital_route',
    insightType: 'care_route',
    summary: 'Clinic or hospital visit path described',
    productUse: 'clinic_pharmacy_prep_ng_v1 visit context',
    regex: /\b(going to (clinic|hospital)|see (a )?doctor|doctor appointment|hospital visit)\b/i,
    linkedModules: [{ moduleId: 'clinic_pharmacy_prep_ng_v1', influenceTypes: ['care_route'] }],
  },
];

export function extractConcernInsights(responses: readonly NormalizedFormResponse[]): PatternHit[] {
  const hits: PatternHit[] = [];

  for (const response of responses) {
    const blob = responseAnswerBlob(response.deidentifiedAnswers);
    for (const hit of matchPatternsInText(blob, CONCERN_PATTERNS)) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
    for (const hit of matchPatternsInText(blob, CARE_ROUTE_PATTERNS)) {
      hits.push({ ...hit, responseId: response.responseId, sourceRole: response.sourceRole });
    }
  }

  return hits;
}
