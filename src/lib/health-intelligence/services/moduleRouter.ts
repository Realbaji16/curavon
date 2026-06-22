import type { HealthModuleId } from '../modules/moduleIds';
import { HEALTH_MODULES, HEALTH_MODULE_BY_ID } from '../modules/moduleCatalog';
import type { HealthModule, HealthModuleRiskLevel } from '../modules/moduleTypes';
import { maskBlockedPhraseRegions } from '../nigeria/blockers';
import { normalizeNigerianHealthLanguage } from './languageNormalizer';

export type RouterRiskLevel = 'low' | 'medium' | 'high' | 'urgent';

export type RoutedModuleSelection = {
  moduleId: HealthModuleId;
  name: string;
  riskLevel: HealthModuleRiskLevel;
  matchedTriggers: string[];
};

export type HealthModuleRoutingResult = {
  selectedModules: RoutedModuleSelection[];
  primaryModuleId: HealthModuleId | null;
  riskLevel: RouterRiskLevel;
};

export type RouteHealthModulesInput = {
  rawText: string;
  moduleHints?: HealthModuleId[];
};

/** High-risk modules that should dominate primary selection when present. */
const PRIMARY_MODULE_PRIORITY: readonly HealthModuleId[] = [
  'chest_pain_ng_v1',
  'breathing_difficulty_ng_v1',
  'pregnancy_concern_ng_v1',
  'child_fever_illness_ng_v1',
  'stress_anxiety_sleep_ng_v1',
] as const;

const MENTAL_HEALTH_CRISIS_TERMS = [
  'harm myself',
  'self harm',
  'self-harm',
  'suicidal',
  'want to die',
  'kill myself',
  'end my life',
] as const;

/** Router-only trigger gaps not yet in catalog seeds. */
const SUPPLEMENTAL_ENTRY_TERMS: Partial<
  Record<HealthModuleId, ReadonlyArray<{ id: string; label: string; terms: readonly string[] }>>
> = {
  stomach_pain_ng_v1: [
    {
      id: 'belle_dey_pain',
      label: 'belle dey pain',
      terms: ['belle dey pain me', 'belle dey pain', 'my belle dey pain'],
    },
  ],
  breathing_difficulty_ng_v1: [
    {
      id: 'breathing_fast',
      label: 'breathing fast',
      terms: ['breathing fast', 'breathing quickly', 'fast breathing', 'breathing hard'],
    },
  ],
};

/** Context boosters — add module when these terms appear (req. 6–9). */
const CONTEXT_MODULE_TERMS: Partial<Record<HealthModuleId, readonly string[]>> = {
  medication_question_ng_v1: [
    'chemist gave me drug',
    'chemist gave me medicine',
    'pharmacy gave me',
    'bought from chemist',
    'medication question',
    'drug question',
    'medicine question',
    'side effect',
    'took malaria drug',
    'no change after drug',
    'body itching after drug',
    'itching after medicine',
    'rash after drug',
  ],
  lab_result_confusion_ng_v1: [
    'widal',
    'widal test',
    'widal result',
    'lab result',
    'test result',
    'test result confusing',
    'lab said malaria',
    'test said malaria',
    'test said typhoid',
    'lab said typhoid',
    'do i have typhoid',
    'typhoid test result',
    'malaria test',
    'mp test',
  ],
  child_fever_illness_ng_v1: [
    'my child',
    'my baby',
    'child body hot',
    'baby body hot',
    'my baby is hot',
    'my child has fever',
    'baby dey hot',
    'infant sick',
    'my son',
    'my daughter',
    'child fever',
    'baby fever',
  ],
  pregnancy_concern_ng_v1: [
    'pregnant and',
    'pregnancy concern',
    'pregnant and bleeding',
    'pregnancy and bleeding',
    'bleeding while pregnant',
    'antenatal worry',
    'belly pain pregnant',
    'spotting pregnant',
  ],
};

const ROUTER_RISK_RANK: Record<RouterRiskLevel, number> = {
  low: 0,
  medium: 1,
  high: 2,
  urgent: 3,
};

/** Companion modules that should not be selected from phrase hints alone. */
const PHRASE_HINT_ONLY_EXCLUDED: ReadonlySet<HealthModuleId> = new Set(['clinic_pharmacy_prep_ng_v1']);

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function toRouterRisk(level: HealthModuleRiskLevel): RouterRiskLevel {
  if (level === 'medium_high') return 'high';
  return level;
}

function maxRouterRisk(levels: RouterRiskLevel[]): RouterRiskLevel {
  if (levels.length === 0) return 'low';
  return levels.reduce((max, level) =>
    ROUTER_RISK_RANK[level] > ROUTER_RISK_RANK[max] ? level : max,
  );
}

function hasCrisisLanguage(text: string): boolean {
  return MENTAL_HEALTH_CRISIS_TERMS.some((term) => text.includes(term));
}

function collectTriggerTerms(module: HealthModule): Array<{ label: string; term: string }> {
  const entries: Array<{ label: string; term: string }> = [];
  for (const trigger of module.entry_triggers) {
    for (const term of trigger.terms) {
      entries.push({ label: trigger.label, term });
    }
  }
  const supplemental = SUPPLEMENTAL_ENTRY_TERMS[module.module_id] ?? [];
  for (const trigger of supplemental) {
    for (const term of trigger.terms) {
      entries.push({ label: trigger.label, term });
    }
  }
  return entries.sort((a, b) => b.term.length - a.term.length);
}

function matchTermsInText(
  maskedText: string,
  terms: ReadonlyArray<{ label: string; term: string }>,
): string[] {
  const matched: string[] = [];
  const seen = new Set<string>();
  for (const { label, term } of terms) {
    const normalizedTerm = normalizeText(term);
    if (!normalizedTerm || !maskedText.includes(normalizedTerm)) continue;
    const key = `${label}:${normalizedTerm}`;
    if (seen.has(key)) continue;
    seen.add(key);
    matched.push(label);
  }
  return matched;
}

function matchContextTerms(maskedText: string, terms: readonly string[]): string[] {
  const matched: string[] = [];
  const sorted = [...terms].sort((a, b) => b.length - a.length);
  for (const term of sorted) {
    const normalizedTerm = normalizeText(term);
    if (normalizedTerm && maskedText.includes(normalizedTerm)) {
      matched.push(term);
    }
  }
  return matched;
}

type ModuleCandidate = {
  moduleId: HealthModuleId;
  matchedTriggers: Set<string>;
};

function addCandidate(
  candidates: Map<HealthModuleId, ModuleCandidate>,
  moduleId: HealthModuleId,
  triggers: string[],
): void {
  if (triggers.length === 0) return;
  const existing = candidates.get(moduleId) ?? {
    moduleId,
    matchedTriggers: new Set<string>(),
  };
  for (const trigger of triggers) {
    existing.matchedTriggers.add(trigger);
  }
  candidates.set(moduleId, existing);
}

function applyOverlapRules(
  candidates: Map<HealthModuleId, ModuleCandidate>,
  maskedText: string,
): void {
  const selectedIds = [...candidates.keys()];
  for (const moduleId of selectedIds) {
    const module = HEALTH_MODULE_BY_ID[moduleId];
    for (const overlapId of module.overlapping_modules) {
      if (candidates.has(overlapId)) continue;
      const overlapModule = HEALTH_MODULE_BY_ID[overlapId];
      const triggerMatches = matchTermsInText(maskedText, collectTriggerTerms(overlapModule));
      const contextTerms = CONTEXT_MODULE_TERMS[overlapId] ?? [];
      const contextMatches = matchContextTerms(maskedText, contextTerms);
      const combined = [...triggerMatches, ...contextMatches.map((term) => `context:${term}`)];
      if (combined.length > 0) {
        addCandidate(candidates, overlapId, combined);
      }
    }
  }
}

function selectPrimaryModuleId(
  selectedIds: HealthModuleId[],
  candidates: Map<HealthModuleId, ModuleCandidate>,
  crisisDetected: boolean,
): HealthModuleId | null {
  if (selectedIds.length === 0) return null;

  for (const moduleId of PRIMARY_MODULE_PRIORITY) {
    if (!selectedIds.includes(moduleId)) continue;
    if (moduleId === 'stress_anxiety_sleep_ng_v1' && !crisisDetected) continue;
    return moduleId;
  }

  if (selectedIds.includes('lab_result_confusion_ng_v1') && hasContextMatch(candidates, 'lab_result_confusion_ng_v1')) {
    return 'lab_result_confusion_ng_v1';
  }

  if (selectedIds.includes('medication_question_ng_v1') && hasContextMatch(candidates, 'medication_question_ng_v1')) {
    return 'medication_question_ng_v1';
  }

  const byRisk = [...selectedIds].sort((a, b) => {
    const riskDiff =
      ROUTER_RISK_RANK[toRouterRisk(HEALTH_MODULE_BY_ID[b].risk_level)] -
      ROUTER_RISK_RANK[toRouterRisk(HEALTH_MODULE_BY_ID[a].risk_level)];
    if (riskDiff !== 0) return riskDiff;
    return HEALTH_MODULE_BY_ID[a].name.localeCompare(HEALTH_MODULE_BY_ID[b].name);
  });
  return byRisk[0] ?? null;
}

function hasContextMatch(
  candidates: Map<HealthModuleId, ModuleCandidate>,
  moduleId: HealthModuleId,
): boolean {
  const candidate = candidates.get(moduleId);
  if (!candidate) return false;
  return [...candidate.matchedTriggers].some((trigger) => trigger.startsWith('context:'));
}

function isPhraseHintOnly(candidate: ModuleCandidate): boolean {
  const triggers = [...candidate.matchedTriggers];
  return triggers.length === 1 && triggers[0] === 'phrase_hint';
}

function pruneSoftPhraseHints(candidates: Map<HealthModuleId, ModuleCandidate>): void {
  for (const [moduleId, candidate] of candidates) {
    if (PHRASE_HINT_ONLY_EXCLUDED.has(moduleId) && isPhraseHintOnly(candidate)) {
      candidates.delete(moduleId);
    }
  }
}

function buildSelectedModules(
  candidates: Map<HealthModuleId, ModuleCandidate>,
): RoutedModuleSelection[] {
  return [...candidates.values()]
    .map((candidate) => {
      const module = HEALTH_MODULE_BY_ID[candidate.moduleId];
      return {
        moduleId: candidate.moduleId,
        name: module.name,
        riskLevel: module.risk_level,
        matchedTriggers: [...candidate.matchedTriggers].sort(),
      };
    })
    .sort((a, b) => {
      const riskDiff =
        ROUTER_RISK_RANK[toRouterRisk(b.riskLevel)] - ROUTER_RISK_RANK[toRouterRisk(a.riskLevel)];
      if (riskDiff !== 0) return riskDiff;
      return a.name.localeCompare(b.name);
    });
}

/** Deterministic module router — phrase hints, entry triggers, context boosts, overlap rules. */
export function routeHealthModules(input: RouteHealthModulesInput): HealthModuleRoutingResult {
  const normalized = normalizeText(input.rawText);
  const maskedText = maskBlockedPhraseRegions(normalized);
  const phraseNormalization = normalizeNigerianHealthLanguage(input.rawText);
  const crisisDetected = hasCrisisLanguage(maskedText);

  const candidates = new Map<HealthModuleId, ModuleCandidate>();

  const hintedModuleIds = new Set<HealthModuleId>(phraseNormalization.moduleHints);
  for (const moduleId of hintedModuleIds) {
    addCandidate(candidates, moduleId, ['phrase_hint']);
  }

  for (const moduleId of input.moduleHints ?? []) {
    addCandidate(candidates, moduleId, ['explicit_hint']);
  }

  for (const module of HEALTH_MODULES) {
    const triggerMatches = matchTermsInText(maskedText, collectTriggerTerms(module));
    addCandidate(candidates, module.module_id, triggerMatches);
  }

  for (const [moduleId, terms] of Object.entries(CONTEXT_MODULE_TERMS) as Array<
    [HealthModuleId, readonly string[]]
  >) {
    const contextMatches = matchContextTerms(maskedText, terms);
    if (contextMatches.length > 0) {
      addCandidate(
        candidates,
        moduleId,
        contextMatches.map((term) => `context:${term}`),
      );
    }
  }

  if (crisisDetected) {
    addCandidate(candidates, 'stress_anxiety_sleep_ng_v1', ['mental_health_crisis']);
  }

  applyOverlapRules(candidates, maskedText);

  pruneSoftPhraseHints(candidates);

  const selectedModules = buildSelectedModules(candidates);
  const selectedIds = selectedModules.map((module) => module.moduleId);
  const aggregateRisk = maxRouterRisk(selectedModules.map((module) => toRouterRisk(module.riskLevel)));

  return {
    selectedModules,
    primaryModuleId: selectPrimaryModuleId(selectedIds, candidates, crisisDetected),
    riskLevel: aggregateRisk,
  };
}
