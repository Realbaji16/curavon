import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';
import type { FormInsight, FormInsightLinkedModule } from '../types';
import type { FormInsightType } from '../extraction/insightTaxonomy';
import type { ModuleInfluenceType } from './moduleInfluenceTypes';

export type ModuleKeywordRule = {
  moduleId: HealthModuleId;
  keywords: readonly string[];
  /** Additional modules to link when any keyword matches (e.g. Widal → fever). */
  alsoLink?: readonly HealthModuleId[];
};

/**
 * Deterministic keyword → module map for concern, phrase, and risk insights.
 * Order matters: more specific rules are checked first.
 */
export const MODULE_KEYWORD_RULES: readonly ModuleKeywordRule[] = [
  {
    moduleId: 'lab_result_confusion_ng_v1',
    keywords: ['widal', 'typhoid test', 'malaria test', 'lab result', 'test result', 'mp test'],
    alsoLink: ['fever_malaria_ng_v1'],
  },
  {
    moduleId: 'missed_medication_ng_v1',
    keywords: ['missed dose', 'forgotten dose', 'forgot my dose', 'skipped dose'],
  },
  {
    moduleId: 'fever_malaria_ng_v1',
    keywords: ['fever', 'malaria', 'body hot', 'typhoid', 'hot body', 'body dey hot'],
  },
  {
    moduleId: 'headache_ng_v1',
    keywords: ['headache', 'head pain', 'head dey bang'],
  },
  {
    moduleId: 'cough_catarrh_ng_v1',
    keywords: ['cough', 'catarrh', 'cold', 'flu', 'running nose'],
  },
  {
    moduleId: 'stomach_pain_ng_v1',
    keywords: ['stomach', 'ulcer', 'indigestion', 'belle pain', 'belly pain'],
  },
  {
    moduleId: 'diarrhea_vomiting_ng_v1',
    keywords: ['stooling', 'diarrhoea', 'diarrhea', 'vomiting', 'running stomach'],
  },
  {
    moduleId: 'blood_pressure_ng_v1',
    keywords: ['blood pressure', 'bp high', 'hypertension', 'bp reading'],
  },
  {
    moduleId: 'blood_sugar_ng_v1',
    keywords: ['diabetes', 'blood sugar', 'high sugar'],
  },
  {
    moduleId: 'medication_question_ng_v1',
    keywords: [
      'medication',
      'medicine',
      'drug',
      'side effect',
      'chemist',
      'pharmacy',
      'antibiotics',
      'antibiotic',
    ],
  },
  {
    moduleId: 'pregnancy_concern_ng_v1',
    keywords: ['pregnancy', 'pregnant', 'antenatal'],
  },
  {
    moduleId: 'child_fever_illness_ng_v1',
    keywords: ['child', 'children', 'pediatric', 'paediatric', 'baby', 'infant'],
  },
  {
    moduleId: 'skin_rash_itching_ng_v1',
    keywords: ['rash', 'itching', 'swelling', 'allergy', 'hives'],
  },
  {
    moduleId: 'chest_pain_ng_v1',
    keywords: ['chest pain', 'pain in chest', 'tight chest'],
  },
  {
    moduleId: 'breathing_difficulty_ng_v1',
    keywords: ['breathing difficulty', 'difficulty breathing', 'shortness of breath', 'breathless'],
  },
  {
    moduleId: 'clinic_pharmacy_prep_ng_v1',
    keywords: [
      'clinic visit',
      'doctor visit',
      'pharmacy visit',
      'visit checklist',
      'export summary',
      'prepare summary',
      'going to clinic',
      'see doctor',
      'cost',
      'afford',
      'expensive',
      'queue',
      'waiting',
    ],
  },
  {
    moduleId: 'stress_anxiety_sleep_ng_v1',
    keywords: ['stress', 'anxiety', 'sleep', 'insomnia', 'no sleep'],
  },
];

const INSIGHT_TYPE_INFLUENCE_RULES: Partial<Record<FormInsightType, readonly ModuleInfluenceType[]>> = {
  common_concern: ['trigger'],
  nigerian_phrase: ['trigger'],
  care_blocker: ['blocker'],
  care_route: ['care_route'],
  red_flag_candidate: ['guardrail'],
  unsafe_medication_pattern: ['guardrail'],
  summary_field_candidate: ['summary_field'],
  safe_question_candidate: ['question'],
  trust_wording: ['response_copy'],
  distrust_wording: ['response_copy'],
  feature_request: ['feature'],
  guardrail_candidate: ['guardrail'],
  professional_opinion_conflict: ['guardrail'],
  lifestyle_context: ['trigger'],
  module_trigger_candidate: ['trigger'],
  privacy_requirement: ['feature'],
};

export type MappedFormInsightModules = {
  insightId: string;
  linkedModules: readonly FormInsightLinkedModule[];
  influenceTypes: readonly ModuleInfluenceType[];
};

/** Resolve influence types from insight category rules. */
export function resolveInfluenceTypesForInsight(
  insightType: FormInsightType,
): readonly ModuleInfluenceType[] {
  return INSIGHT_TYPE_INFLUENCE_RULES[insightType] ?? ['trigger'];
}

/** Match health modules from de-identified insight text (summary, patterns, product use). */
export function resolveModulesFromInsightText(text: string): HealthModuleId[] {
  const normalized = normalizeInsightText(text);
  const matched = new Set<HealthModuleId>();

  for (const rule of MODULE_KEYWORD_RULES) {
    if (!rule.keywords.some((keyword) => containsKeyword(normalized, keyword))) {
      continue;
    }

    matched.add(rule.moduleId);
    for (const extra of rule.alsoLink ?? []) {
      matched.add(extra);
    }
  }

  return [...matched];
}

/**
 * Map one extracted form insight to health-intelligence modules and influence types.
 */
export function mapInsightToModules(insight: FormInsight): MappedFormInsightModules {
  const influenceTypes = resolveInfluenceTypesForInsight(insight.insightType);
  const searchText = buildInsightSearchText(insight);
  const inferredModuleIds = resolveModulesFromInsightText(searchText);
  const linkedModules = mergeLinkedModules(
    insight.linkedModules,
    inferredModuleIds,
    influenceTypes,
  );

  return {
    insightId: insight.insightId,
    linkedModules,
    influenceTypes,
  };
}

/** Map a batch of insights. */
export function mapInsightsToModules(insights: readonly FormInsight[]): MappedFormInsightModules[] {
  return insights.map((insight) => mapInsightToModules(insight));
}

/** Apply module mappings onto insights (returns new insight objects). */
export function applyModuleMappingsToInsights(insights: readonly FormInsight[]): FormInsight[] {
  return insights.map((insight) => {
    const mapped = mapInsightToModules(insight);
    return {
      ...insight,
      linkedModules: mapped.linkedModules,
    };
  });
}

function buildInsightSearchText(insight: FormInsight): string {
  return [
    insight.summary,
    insight.productUse,
    ...(insight.evidence.matchedPatterns ?? []),
  ].join(' ');
}

function normalizeInsightText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function containsKeyword(normalizedText: string, keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().replace(/\s+/g, ' ').trim();
  if (normalizedKeyword.includes(' ')) {
    return normalizedText.includes(normalizedKeyword);
  }
  const boundary = new RegExp(`\\b${escapeRegExp(normalizedKeyword)}\\b`, 'i');
  return boundary.test(normalizedText);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function mergeLinkedModules(
  existing: readonly FormInsightLinkedModule[],
  moduleIds: readonly HealthModuleId[],
  influenceTypes: readonly ModuleInfluenceType[],
): FormInsightLinkedModule[] {
  const byModule = new Map<HealthModuleId, Set<ModuleInfluenceType>>();

  for (const link of existing) {
    const types = byModule.get(link.moduleId) ?? new Set<ModuleInfluenceType>();
    for (const type of link.influenceTypes) {
      types.add(type);
    }
    byModule.set(link.moduleId, types);
  }

  for (const moduleId of moduleIds) {
    const types = byModule.get(moduleId) ?? new Set<ModuleInfluenceType>();
    for (const type of influenceTypes) {
      types.add(type);
    }
    byModule.set(moduleId, types);
  }

  return [...byModule.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([moduleId, types]) => ({
      moduleId,
      influenceTypes: [...types].sort(),
    }));
}
