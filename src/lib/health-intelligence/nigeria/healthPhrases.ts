import type { HealthModuleId } from '../modules/moduleIds';

export type HealthPhraseDefinition = {
  id: string;
  /** User-facing phrases to detect (matched longest-first, case-insensitive). */
  sources: readonly string[];
  normalizedTerm: string;
  moduleHints: readonly HealthModuleId[];
  riskCheckNeeded: boolean;
  tags: readonly string[];
};

export const NIGERIAN_HEALTH_PHRASES: readonly HealthPhraseDefinition[] = [
  {
    id: 'body_hot',
    sources: ['body hot', 'hot body', 'body dey hot', 'my body is hot'],
    normalizedTerm: 'fever / feeling hot',
    moduleHints: ['fever_malaria_ng_v1'],
    riskCheckNeeded: true,
    tags: ['fever', 'symptom'],
  },
  {
    id: 'head_dey_bang',
    sources: ['head dey bang', 'head is banging', 'my head dey bang', 'head dey pain me'],
    normalizedTerm: 'headache',
    moduleHints: ['headache_ng_v1'],
    riskCheckNeeded: false,
    tags: ['headache', 'symptom'],
  },
  {
    id: 'stooling',
    sources: ['stooling', 'running stomach', 'loose stool', 'watery stool'],
    normalizedTerm: 'diarrhea / loose stool',
    moduleHints: ['diarrhea_vomiting_ng_v1'],
    riskCheckNeeded: true,
    tags: ['gi', 'symptom'],
  },
  {
    id: 'belle_pain',
    sources: ['belle pain', 'belly pain', 'pain for belle', 'stomach pain', 'tummy pain'],
    normalizedTerm: 'abdominal pain',
    moduleHints: ['stomach_pain_ng_v1'],
    riskCheckNeeded: true,
    tags: ['gi', 'symptom'],
  },
  {
    id: 'catarrh',
    sources: ['catarrh', 'running nose', 'blocked nose', 'nose dey run'],
    normalizedTerm: 'nasal congestion / catarrh',
    moduleHints: ['cough_catarrh_ng_v1'],
    riskCheckNeeded: false,
    tags: ['respiratory', 'symptom'],
  },
  {
    id: 'malaria_typhoid',
    sources: ['malaria and typhoid', 'malaria and tyfoid', 'typhoid and malaria'],
    normalizedTerm: 'malaria and typhoid concern (user-reported)',
    moduleHints: ['fever_malaria_ng_v1', 'lab_result_confusion_ng_v1'],
    riskCheckNeeded: true,
    tags: ['fever', 'lab', 'symptom'],
  },
  {
    id: 'widal',
    sources: ['widal', 'widal test', 'widal result'],
    normalizedTerm: 'widal test / lab slip concern',
    moduleHints: ['lab_result_confusion_ng_v1'],
    riskCheckNeeded: false,
    tags: ['lab'],
  },
  {
    id: 'ulcer',
    sources: ['ulcer', 'stomach ulcer', 'ulcer pain'],
    normalizedTerm: 'stomach pain / ulcer concern (user-reported)',
    moduleHints: ['stomach_pain_ng_v1', 'clinic_pharmacy_prep_ng_v1'],
    riskCheckNeeded: true,
    tags: ['gi', 'symptom'],
  },
  {
    id: 'pile',
    sources: ['pile', 'hemorrhoid', 'haemorrhoid', 'piles'],
    normalizedTerm: 'pile / hemorrhoid concern (user-reported)',
    moduleHints: ['stomach_pain_ng_v1', 'clinic_pharmacy_prep_ng_v1'],
    riskCheckNeeded: true,
    tags: ['gi', 'symptom'],
  },
  {
    id: 'bp_disturbing',
    sources: ['bp disturbing me', 'bp dey disturb me', 'blood pressure disturbing', 'bp too high'],
    normalizedTerm: 'blood pressure concern',
    moduleHints: ['blood_pressure_ng_v1'],
    riskCheckNeeded: true,
    tags: ['blood_pressure', 'symptom'],
  },
  {
    id: 'chemist_drug',
    sources: [
      'chemist gave me drug',
      'chemist gave me medicine',
      'pharmacy gave me drug',
      'chemist gave me the drug',
    ],
    normalizedTerm: 'medicine from chemist / pharmacy',
    moduleHints: ['medication_question_ng_v1', 'clinic_pharmacy_prep_ng_v1'],
    riskCheckNeeded: false,
    tags: ['medication'],
  },
  {
    id: 'took_malaria_drug',
    sources: ['took malaria drug', 'took malaria medicine', 'took antimalarial', 'finished malaria drugs'],
    normalizedTerm: 'took malaria medicine (user-reported)',
    moduleHints: ['medication_question_ng_v1', 'fever_malaria_ng_v1'],
    riskCheckNeeded: true,
    tags: ['medication', 'fever'],
  },
  {
    id: 'no_change_after_drug',
    sources: [
      'no change after drug',
      'no change after medicine',
      'drug not working',
      'medicine not working',
      'still sick after drug',
    ],
    normalizedTerm: 'no improvement after medicine',
    moduleHints: ['medication_question_ng_v1', 'fever_malaria_ng_v1'],
    riskCheckNeeded: true,
    tags: ['medication', 'symptom'],
  },
  {
    id: 'itching_after_drug',
    sources: [
      'body itching after drug',
      'itching after medicine',
      'body dey itch after drug',
      'rash after drug',
    ],
    normalizedTerm: 'itching or rash after medicine',
    moduleHints: ['medication_question_ng_v1', 'skin_rash_itching_ng_v1'],
    riskCheckNeeded: true,
    tags: ['medication', 'skin'],
  },
  {
    id: 'child_body_hot',
    sources: ['child body hot', 'baby body hot', 'my baby is hot', 'my child has fever', 'baby dey hot'],
    normalizedTerm: 'child fever / hot body',
    moduleHints: ['child_fever_illness_ng_v1', 'fever_malaria_ng_v1'],
    riskCheckNeeded: true,
    tags: ['fever', 'pediatric', 'symptom'],
  },
  {
    id: 'pregnant_bleeding',
    sources: [
      'pregnant and bleeding',
      'pregnancy and bleeding',
      'bleeding while pregnant',
      'pregnant and bleeding heavily',
    ],
    normalizedTerm: 'bleeding during pregnancy',
    moduleHints: ['pregnancy_concern_ng_v1'],
    riskCheckNeeded: true,
    tags: ['pregnancy', 'symptom'],
  },
] as const;

export type PhraseMatch = {
  phraseId: string;
  matchedSource: string;
  definition: HealthPhraseDefinition;
  start: number;
  end: number;
};
