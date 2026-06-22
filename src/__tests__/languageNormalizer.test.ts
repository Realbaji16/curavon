import { describe, expect, it } from 'vitest';
import { normalizeNigerianHealthLanguage } from '../lib/health-intelligence/services/languageNormalizer';
import { careRoutesForTags } from '../lib/health-intelligence/nigeria/careRoutes';

type PhraseExample = {
  input: string;
  expectedTermKey: string;
  expectedNormalized: string;
  expectedModules: string[];
  expectedRisk: boolean;
  expectedTags: string[];
};

const REQUIRED_EXAMPLES: PhraseExample[] = [
  {
    input: 'My body hot since yesterday',
    expectedTermKey: 'body hot',
    expectedNormalized: 'fever / feeling hot',
    expectedModules: ['fever_malaria_ng_v1'],
    expectedRisk: true,
    expectedTags: ['fever', 'symptom'],
  },
  {
    input: 'Hot body and weakness',
    expectedTermKey: 'hot body',
    expectedNormalized: 'fever / feeling hot',
    expectedModules: ['fever_malaria_ng_v1'],
    expectedRisk: true,
    expectedTags: ['fever', 'symptom'],
  },
  {
    input: 'Head dey bang since morning',
    expectedTermKey: 'head dey bang',
    expectedNormalized: 'headache',
    expectedModules: ['headache_ng_v1'],
    expectedRisk: false,
    expectedTags: ['headache', 'symptom'],
  },
  {
    input: 'My head is banging',
    expectedTermKey: 'head is banging',
    expectedNormalized: 'headache',
    expectedModules: ['headache_ng_v1'],
    expectedRisk: false,
    expectedTags: ['headache', 'symptom'],
  },
  {
    input: 'I have been stooling since last night',
    expectedTermKey: 'stooling',
    expectedNormalized: 'diarrhea / loose stool',
    expectedModules: ['diarrhea_vomiting_ng_v1'],
    expectedRisk: true,
    expectedTags: ['gi', 'symptom'],
  },
  {
    input: 'Serious belle pain after food',
    expectedTermKey: 'belle pain',
    expectedNormalized: 'abdominal pain',
    expectedModules: ['stomach_pain_ng_v1'],
    expectedRisk: true,
    expectedTags: ['gi', 'symptom'],
  },
  {
    input: 'Catarrh and small cough',
    expectedTermKey: 'catarrh',
    expectedNormalized: 'nasal congestion / catarrh',
    expectedModules: ['cough_catarrh_ng_v1'],
    expectedRisk: false,
    expectedTags: ['respiratory', 'symptom'],
  },
  {
    input: 'They said malaria and typhoid',
    expectedTermKey: 'malaria and typhoid',
    expectedNormalized: 'malaria and typhoid concern (user-reported)',
    expectedModules: ['fever_malaria_ng_v1', 'lab_result_confusion_ng_v1'],
    expectedRisk: true,
    expectedTags: ['fever', 'lab', 'symptom'],
  },
  {
    input: 'My widal result is confusing',
    expectedTermKey: 'widal result',
    expectedNormalized: 'widal test / lab slip concern',
    expectedModules: ['lab_result_confusion_ng_v1'],
    expectedRisk: false,
    expectedTags: ['lab'],
  },
  {
    input: 'I think ulcer is disturbing me',
    expectedTermKey: 'ulcer',
    expectedNormalized: 'stomach pain / ulcer concern (user-reported)',
    expectedModules: ['stomach_pain_ng_v1', 'clinic_pharmacy_prep_ng_v1'],
    expectedRisk: true,
    expectedTags: ['gi', 'symptom'],
  },
  {
    input: 'This pile is painful',
    expectedTermKey: 'pile',
    expectedNormalized: 'pile / hemorrhoid concern (user-reported)',
    expectedModules: ['stomach_pain_ng_v1', 'clinic_pharmacy_prep_ng_v1'],
    expectedRisk: true,
    expectedTags: ['gi', 'symptom'],
  },
  {
    input: 'BP disturbing me this week',
    expectedTermKey: 'bp disturbing me',
    expectedNormalized: 'blood pressure concern',
    expectedModules: ['blood_pressure_ng_v1'],
    expectedRisk: true,
    expectedTags: ['blood_pressure', 'symptom'],
  },
  {
    input: 'Chemist gave me drug but I am confused',
    expectedTermKey: 'chemist gave me drug',
    expectedNormalized: 'medicine from chemist / pharmacy',
    expectedModules: ['medication_question_ng_v1', 'clinic_pharmacy_prep_ng_v1'],
    expectedRisk: false,
    expectedTags: ['medication'],
  },
  {
    input: 'I took malaria drug yesterday',
    expectedTermKey: 'took malaria drug',
    expectedNormalized: 'took malaria medicine (user-reported)',
    expectedModules: ['medication_question_ng_v1', 'fever_malaria_ng_v1'],
    expectedRisk: true,
    expectedTags: ['fever', 'medication'],
  },
  {
    input: 'No change after drug for three days',
    expectedTermKey: 'no change after drug',
    expectedNormalized: 'no improvement after medicine',
    expectedModules: ['medication_question_ng_v1', 'fever_malaria_ng_v1'],
    expectedRisk: true,
    expectedTags: ['medication', 'symptom'],
  },
  {
    input: 'Body itching after drug since morning',
    expectedTermKey: 'body itching after drug',
    expectedNormalized: 'itching or rash after medicine',
    expectedModules: ['medication_question_ng_v1', 'skin_rash_itching_ng_v1'],
    expectedRisk: true,
    expectedTags: ['medication', 'skin'],
  },
  {
    input: 'My child body hot since night',
    expectedTermKey: 'child body hot',
    expectedNormalized: 'child fever / hot body',
    expectedModules: ['child_fever_illness_ng_v1', 'fever_malaria_ng_v1'],
    expectedRisk: true,
    expectedTags: ['fever', 'pediatric', 'symptom'],
  },
  {
    input: 'She is pregnant and bleeding',
    expectedTermKey: 'pregnant and bleeding',
    expectedNormalized: 'bleeding during pregnancy',
    expectedModules: ['pregnancy_concern_ng_v1'],
    expectedRisk: true,
    expectedTags: ['pregnancy', 'symptom'],
  },
];

describe('normalizeNigerianHealthLanguage', () => {
  it.each(REQUIRED_EXAMPLES)('normalizes: $expectedTermKey', (example) => {
    const result = normalizeNigerianHealthLanguage(example.input);

    expect(result.normalizedTerms[example.expectedTermKey]).toBe(example.expectedNormalized);
    expect(result.moduleHints).toEqual(example.expectedModules);
    expect(result.riskCheckNeeded).toBe(example.expectedRisk);
    expect(result.tags.sort()).toEqual(example.expectedTags.sort());
  });

  it('is case-insensitive', () => {
    const lower = normalizeNigerianHealthLanguage('HEAD DEY BANG');
    const mixed = normalizeNigerianHealthLanguage('Head Dey Bang');

    expect(lower.normalizedTerms['head dey bang']).toBe('headache');
    expect(mixed.normalizedTerms['head dey bang']).toBe('headache');
  });

  it('prefers longer phrases over overlapping shorter ones', () => {
    const result = normalizeNigerianHealthLanguage('malaria and typhoid worry me');
    expect(result.normalizedTerms['malaria and typhoid']).toBeDefined();
    expect(result.normalizedTerms['malaria']).toBeUndefined();
  });

  it('does not match negated fever phrasing', () => {
    const result = normalizeNigerianHealthLanguage('I have no body hot, just tired');
    expect(result.normalizedTerms['body hot']).toBeUndefined();
    expect(result.normalizedTerms['hot body']).toBeUndefined();
    expect(result.moduleHints).not.toContain('fever_malaria_ng_v1');
    expect(result.riskCheckNeeded).toBe(false);
  });

  it('does not match negated belle pain', () => {
    const result = normalizeNigerianHealthLanguage('No belle pain today, only bloating');
    expect(result.normalizedTerms['belle pain']).toBeUndefined();
    expect(result.moduleHints).not.toContain('stomach_pain_ng_v1');
  });

  it('does not match negated pregnancy bleeding phrase', () => {
    const result = normalizeNigerianHealthLanguage('I am not pregnant and bleeding was ruled out');
    expect(result.normalizedTerms['pregnant and bleeding']).toBeUndefined();
    expect(result.moduleHints).not.toContain('pregnancy_concern_ng_v1');
  });

  it('returns empty shape for unrelated text', () => {
    const result = normalizeNigerianHealthLanguage('I want to prepare for a meeting');
    expect(result.normalizedTerms).toEqual({});
    expect(result.moduleHints).toEqual([]);
    expect(result.riskCheckNeeded).toBe(false);
    expect(result.tags).toEqual([]);
  });

  it('careRoutesForTags maps normalization tags to routes', () => {
    const routes = careRoutesForTags(['pregnancy', 'medication']);
    expect(routes).toContain('antenatal_clinic');
    expect(routes).toContain('chemist_pharmacy');
  });
});
