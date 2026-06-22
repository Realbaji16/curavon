/** Stable identifiers for Nigeria-context health intelligence modules (v1). */
export type HealthModuleId =
  | 'fever_malaria_ng_v1'
  | 'headache_ng_v1'
  | 'stomach_pain_ng_v1'
  | 'diarrhea_vomiting_ng_v1'
  | 'cough_catarrh_ng_v1'
  | 'breathing_difficulty_ng_v1'
  | 'chest_pain_ng_v1'
  | 'blood_pressure_ng_v1'
  | 'blood_sugar_ng_v1'
  | 'medication_question_ng_v1'
  | 'missed_medication_ng_v1'
  | 'lab_result_confusion_ng_v1'
  | 'pregnancy_concern_ng_v1'
  | 'child_fever_illness_ng_v1'
  | 'menstrual_reproductive_ng_v1'
  | 'skin_rash_itching_ng_v1'
  | 'injury_wound_swelling_ng_v1'
  | 'eye_ear_dental_ng_v1'
  | 'stress_anxiety_sleep_ng_v1'
  | 'clinic_pharmacy_prep_ng_v1';

export const HEALTH_MODULE_IDS = [
  'fever_malaria_ng_v1',
  'headache_ng_v1',
  'stomach_pain_ng_v1',
  'diarrhea_vomiting_ng_v1',
  'cough_catarrh_ng_v1',
  'breathing_difficulty_ng_v1',
  'chest_pain_ng_v1',
  'blood_pressure_ng_v1',
  'blood_sugar_ng_v1',
  'medication_question_ng_v1',
  'missed_medication_ng_v1',
  'lab_result_confusion_ng_v1',
  'pregnancy_concern_ng_v1',
  'child_fever_illness_ng_v1',
  'menstrual_reproductive_ng_v1',
  'skin_rash_itching_ng_v1',
  'injury_wound_swelling_ng_v1',
  'eye_ear_dental_ng_v1',
  'stress_anxiety_sleep_ng_v1',
  'clinic_pharmacy_prep_ng_v1',
] as const satisfies readonly HealthModuleId[];

const MODULE_ID_SET = new Set<string>(HEALTH_MODULE_IDS);

export function isHealthModuleId(value: string): value is HealthModuleId {
  return MODULE_ID_SET.has(value);
}
