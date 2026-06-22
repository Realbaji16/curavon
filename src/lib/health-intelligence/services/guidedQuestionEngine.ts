import type { RedFlagDetectionResult } from '../../health/redFlags';
import { HEALTH_MODULE_BY_ID } from '../modules/moduleCatalog';
import type { HealthModuleId } from '../modules/moduleIds';
import type { HealthModule, ModuleQuestion } from '../modules/moduleTypes';
import type { IntelligenceRedFlagHit } from '../types';
import type { RoutedModuleSelection } from './moduleRouter';

export type GuidedQuestionType =
  | 'timing'
  | 'severity'
  | 'associated_symptom'
  | 'medication_context'
  | 'risk_context'
  | 'red_flag'
  | 'care_blocker'
  | 'summary';

export type GuidedQuestion = {
  id: string;
  question: string;
  type: GuidedQuestionType;
  moduleId?: HealthModuleId;
  reason: string;
  generatedBy: 'module' | 'ai_policy';
};

export type GenerateGuidedQuestionsInput = {
  rawText: string;
  selectedModules: RoutedModuleSelection[] | HealthModuleId[];
  primaryModuleId: HealthModuleId | null;
  redFlags?: IntelligenceRedFlagHit[];
  redFlagResult?: RedFlagDetectionResult;
};

const MIN_QUESTIONS = 2;
const MAX_QUESTIONS = 5;

const TYPE_PRIORITY: Record<GuidedQuestionType, number> = {
  red_flag: 0,
  care_blocker: 1,
  risk_context: 2,
  timing: 3,
  severity: 4,
  medication_context: 5,
  associated_symptom: 6,
  summary: 7,
};

const FORBIDDEN_QUESTION_PATTERNS: RegExp[] = [
  /\bdo you have\b.*\b(malaria|typhoid|ulcer|infection|meningitis|appendicitis)\b/i,
  /\bcould this be\b/i,
  /\bis this\b.*\b(malaria|typhoid|ulcer|infection|meningitis|appendicitis)\b/i,
  /\b(should you|should i|recommend|prescribe)\b.*\b(take|medicine|drug|antibiotic|antimalarial)\b/i,
  /\bwhat dose\b/i,
  /\bhow many (tablets|pills|capsules|doses)\b/i,
  /\bdiagnos(e|is|ing)\b/i,
];

const DOCUMENT_DOSE_PATTERN = /\b(already|took|taken|what you|have tried|tried so far)\b/i;

const TIMING_ANSWER_PATTERN =
  /\b(since|for \d+|yesterday|today|this morning|last night|hours? ago|days? ago|\d+ days?)\b/i;

const MEDICATION_MENTION_PATTERN =
  /\b(chemist|pharmacy|drug|medicine|medication|tablet|capsule|malaria drug|antimalarial)\b/i;

const PREGNANCY_CONTEXT_PATTERN = /\b(pregnant|pregnancy|antenatal|gestation)\b/i;
const CHILD_CONTEXT_PATTERN = /\b(child|baby|infant|my son|my daughter|toddler)\b/i;

type ScoredQuestion = GuidedQuestion & { priority: number };

type RedFlagProbe = {
  id: string;
  moduleId: HealthModuleId;
  triggerTerms: readonly string[];
  question: string;
  reason: string;
};

const RED_FLAG_SAFETY_PROBES: readonly RedFlagProbe[] = [
  {
    id: 'headache_vision_neuro',
    moduleId: 'headache_ng_v1',
    triggerTerms: ['blurry vision', 'blurred vision', 'vision loss', 'double vision', 'cannot see well'],
    question:
      'With the vision change, any sudden weakness, confusion, slurred speech, or face drooping?',
    reason: 'Vision change with headache can be a danger sign that needs urgent in-person review.',
  },
  {
    id: 'headache_worst_sudden',
    moduleId: 'headache_ng_v1',
    triggerTerms: ['headache', 'head dey bang', 'head is banging', 'head pain'],
    question: 'Is this the worst headache you have had, or did it start very suddenly?',
    reason: 'Sudden or worst-ever headache needs urgent safety screening.',
  },
  {
    id: 'fever_breathing_confusion',
    moduleId: 'fever_malaria_ng_v1',
    triggerTerms: ['body hot', 'hot body', 'fever', 'temperature'],
    question: 'Any trouble breathing, chest pain, confusion, or severe weakness with the fever?',
    reason: 'Danger signs with fever need urgent care screening.',
  },
  {
    id: 'child_breathing_lethargy',
    moduleId: 'child_fever_illness_ng_v1',
    triggerTerms: ['child', 'baby', 'infant'],
    question: 'Is the child very weak, hard to wake, or having breathing difficulty?',
    reason: 'Severe illness signs in a child need urgent pediatric review.',
  },
  {
    id: 'pregnancy_bleeding_pain',
    moduleId: 'pregnancy_concern_ng_v1',
    triggerTerms: ['pregnant', 'pregnancy'],
    question: 'Any heavy bleeding, severe pain, severe headache, or fluid leak?',
    reason: 'Certain symptoms during pregnancy need urgent obstetric review.',
  },
];

type ContextProbe = RedFlagProbe & { type: GuidedQuestionType };

const LAB_CONTEXT_PROBES: readonly ContextProbe[] = [
  {
    id: 'lab_symptoms_context',
    moduleId: 'lab_result_confusion_ng_v1',
    triggerTerms: ['widal', 'lab result', 'test result', 'typhoid', 'malaria test', '1:160'],
    question: 'What symptoms do you have right now?',
    reason: 'Symptoms must be linked to lab slips for clinician review — not diagnosis from numbers alone.',
    type: 'associated_symptom',
  },
  {
    id: 'lab_test_context',
    moduleId: 'lab_result_confusion_ng_v1',
    triggerTerms: ['widal', 'lab result', 'test result', 'typhoid', 'malaria test', '1:160'],
    question: 'What test was done (name on the slip) and when was it done?',
    reason: 'Test name and timing help organize lab confusion for a clinician.',
    type: 'associated_symptom',
  },
];

const CARE_BLOCKER_QUESTION: GuidedQuestion = {
  id: 'care_blocker_access',
  question:
    'Is anything stopping you from getting to a clinic or emergency care right now (transport, cost, fear)?',
  type: 'care_blocker',
  reason: 'Care blockers help organize practical next steps without replacing triage.',
  generatedBy: 'ai_policy',
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function resolveModuleIds(
  selectedModules: RoutedModuleSelection[] | HealthModuleId[],
): HealthModuleId[] {
  if (selectedModules.length === 0) return [];
  const first = selectedModules[0];
  if (typeof first === 'string') {
    return selectedModules as HealthModuleId[];
  }
  return (selectedModules as RoutedModuleSelection[]).map((module) => module.moduleId);
}

function isQuestionSafe(question: string): boolean {
  const normalized = question.toLowerCase();
  for (const pattern of FORBIDDEN_QUESTION_PATTERNS) {
    if (pattern.test(normalized) && !DOCUMENT_DOSE_PATTERN.test(normalized)) {
      return false;
    }
  }
  return true;
}

function inferQuestionType(prompt: string, questionId: string): GuidedQuestionType | null {
  const text = `${questionId} ${prompt}`.toLowerCase();
  if (!isQuestionSafe(prompt)) return null;

  if (/danger|emergency|weakness|confusion|breathless|bleeding heavily|seizure/.test(text)) {
    return 'red_flag';
  }
  if (/when|start|onset|timeline|how long|since|how far along/.test(text)) {
    return 'timing';
  }
  if (/severity|how strong|mild|moderate|very strong/.test(text)) {
    return 'severity';
  }
  if (/medicine|medication|drug|chemist|tried|taking|treatment started/.test(text)) {
    return 'medication_context';
  }
  if (/pregnant|child|baby|infant|weeks|older adult|vulnerable/.test(text)) {
    return 'risk_context';
  }
  if (/symptom|else|associated|other|confusing|test was done|where was/.test(text)) {
    return 'associated_symptom';
  }
  if (/clinician|summary|prepare|goal/.test(text)) {
    return 'summary';
  }
  return 'associated_symptom';
}

function isLikelyAnswered(prompt: string, type: GuidedQuestionType, rawText: string): boolean {
  const normalized = normalizeText(rawText);
  if (type === 'timing' && TIMING_ANSWER_PATTERN.test(normalized)) {
    return /when did|how long|start/.test(prompt.toLowerCase());
  }
  if (type === 'medication_context' && MEDICATION_MENTION_PATTERN.test(normalized)) {
    return (
      /what have you tried/.test(prompt.toLowerCase()) &&
      !/pack|receipt|name|already/.test(prompt.toLowerCase())
    );
  }
  return false;
}

function moduleQuestionToGuided(
  module: HealthModule,
  question: ModuleQuestion,
  primaryModuleId: HealthModuleId | null,
): ScoredQuestion | null {
  const type = inferQuestionType(question.prompt, question.id);
  if (!type) return null;

  const priority =
    TYPE_PRIORITY[type] +
    (module.module_id === primaryModuleId ? -0.45 : 0) +
    questionOrderBoost(question.id);

  return {
    id: `${module.module_id}:${question.id}`,
    question: question.prompt,
    type,
    moduleId: module.module_id,
    reason: `Required ${module.name.toLowerCase()} intake question.`,
    generatedBy: 'module',
    priority,
  };
}

function questionOrderBoost(questionId: string): number {
  const order = ['onset', 'timeline', 'severity', 'symptoms', 'medicine', 'test', 'confusion'];
  const index = order.findIndex((key) => questionId.includes(key));
  return index >= 0 ? index * 0.01 : 0.05;
}

function buildModuleQuestions(
  moduleIds: HealthModuleId[],
  rawText: string,
  primaryModuleId: HealthModuleId | null,
): ScoredQuestion[] {
  const questions: ScoredQuestion[] = [];
  for (const moduleId of moduleIds) {
    const module = HEALTH_MODULE_BY_ID[moduleId];
    for (const question of module.required_questions) {
      const guided = moduleQuestionToGuided(module, question, primaryModuleId);
      if (!guided) continue;
      if (isLikelyAnswered(guided.question, guided.type, rawText)) continue;
      questions.push(guided);
    }
  }
  return questions;
}

function textIncludesAny(text: string, terms: readonly string[]): boolean {
  return terms.some((term) => text.includes(normalizeText(term)));
}

function buildRedFlagProbeQuestions(
  moduleIds: HealthModuleId[],
  rawText: string,
  primaryModuleId: HealthModuleId | null,
): ScoredQuestion[] {
  const normalized = normalizeText(rawText);
  const probes: ScoredQuestion[] = [];

  for (const probe of RED_FLAG_SAFETY_PROBES) {
    if (!moduleIds.includes(probe.moduleId)) continue;
    if (!textIncludesAny(normalized, probe.triggerTerms)) continue;
    probes.push({
      id: `probe:${probe.id}`,
      question: probe.question,
      type: 'red_flag',
      moduleId: probe.moduleId,
      reason: probe.reason,
      generatedBy: 'ai_policy',
      priority: TYPE_PRIORITY.red_flag + (probe.moduleId === primaryModuleId ? -0.2 : 0),
    });
  }

  for (const moduleId of moduleIds) {
    const module = HEALTH_MODULE_BY_ID[moduleId];
    for (const flag of module.red_flags) {
      if (!flag.escalateImmediately && flag.severity !== 'emergency' && flag.severity !== 'urgent') {
        continue;
      }
      const matchedInText = flag.terms.some((term) => normalized.includes(normalizeText(term)));
      if (matchedInText) {
        probes.push({
          id: `red_flag:${moduleId}:${flag.id}`,
          question: `You mentioned ${flag.label.toLowerCase()} — is it severe or getting worse right now?`,
          type: 'red_flag',
          moduleId,
          reason: `Screening for ${flag.label.toLowerCase()} before other intake questions.`,
          generatedBy: 'ai_policy',
          priority: TYPE_PRIORITY.red_flag - 0.1,
        });
      }
    }
  }

  return probes;
}

function buildRedFlagResultQuestions(
  redFlagResult: RedFlagDetectionResult | undefined,
  redFlags: IntelligenceRedFlagHit[] | undefined,
  primaryModuleId: HealthModuleId | null,
): ScoredQuestion[] {
  const questions: ScoredQuestion[] = [];
  const hits = redFlags ?? [];

  if (redFlagResult?.matches.length) {
    for (const match of redFlagResult.matches) {
      questions.push({
        id: `global_red_flag:${match.category}`,
        question: `You may have mentioned ${match.label.toLowerCase()} — are symptoms severe or worsening right now?`,
        type: 'red_flag',
        moduleId: primaryModuleId ?? undefined,
        reason: 'Global red-flag detection needs urgent safety confirmation first.',
        generatedBy: 'ai_policy',
        priority: TYPE_PRIORITY.red_flag - 0.25,
      });
    }
  }

  for (const hit of hits) {
    questions.push({
      id: `intel_red_flag:${hit.id}`,
      question: `Regarding ${hit.label.toLowerCase()}, is it severe or getting worse right now?`,
      type: 'red_flag',
      moduleId: hit.sourceModuleId ?? primaryModuleId ?? undefined,
      reason: 'Prior red-flag hit needs safety confirmation before other questions.',
      generatedBy: 'ai_policy',
      priority: TYPE_PRIORITY.red_flag - 0.2,
    });
  }

  return questions;
}

function buildContextQuestions(
  moduleIds: HealthModuleId[],
  rawText: string,
  primaryModuleId: HealthModuleId | null,
): ScoredQuestion[] {
  const normalized = normalizeText(rawText);
  const questions: ScoredQuestion[] = [];

  if (
    PREGNANCY_CONTEXT_PATTERN.test(normalized) ||
    moduleIds.includes('pregnancy_concern_ng_v1')
  ) {
    questions.push({
      id: 'context:pregnancy_timing',
      question: 'How far along is the pregnancy (weeks or months, if known)?',
      type: 'risk_context',
      moduleId: 'pregnancy_concern_ng_v1',
      reason: 'Pregnancy context changes safety screening and care urgency.',
      generatedBy: 'ai_policy',
      priority: TYPE_PRIORITY.risk_context - 0.05,
    });
  }

  if (CHILD_CONTEXT_PATTERN.test(normalized) || moduleIds.includes('child_fever_illness_ng_v1')) {
    questions.push({
      id: 'context:child_age',
      question: 'How old is the child?',
      type: 'risk_context',
      moduleId: 'child_fever_illness_ng_v1',
      reason: 'Child age helps organize pediatric safety questions.',
      generatedBy: 'ai_policy',
      priority: TYPE_PRIORITY.risk_context,
    });
  }

  if (MEDICATION_MENTION_PATTERN.test(normalized) || moduleIds.includes('medication_question_ng_v1')) {
    questions.push({
      id: 'context:medication_document',
      question:
        'What medicine names are written on the pack or receipt (only what you already took or were given)?',
      type: 'medication_context',
      moduleId: 'medication_question_ng_v1',
      reason: 'Documenting medicines already taken — not recommending doses or changes.',
      generatedBy: 'ai_policy',
      priority: TYPE_PRIORITY.medication_context,
    });
  }

  for (const probe of LAB_CONTEXT_PROBES) {
    if (!moduleIds.includes(probe.moduleId)) continue;
    if (!textIncludesAny(normalized, probe.triggerTerms)) continue;
    questions.push({
      id: `context:${probe.id}`,
      question: probe.question,
      type: probe.type,
      moduleId: probe.moduleId,
      reason: probe.reason,
      generatedBy: 'ai_policy',
      priority:
        TYPE_PRIORITY[probe.type] + (probe.moduleId === primaryModuleId ? -0.45 : 0),
    });
  }

  return questions;
}

function shouldIncludeCareBlocker(
  moduleIds: HealthModuleId[],
  redFlagResult: RedFlagDetectionResult | undefined,
  redFlags: IntelligenceRedFlagHit[] | undefined,
): boolean {
  if (redFlagResult?.hasUrgent || (redFlags?.length ?? 0) > 0) return true;
  return moduleIds.some((id) => {
    const risk = HEALTH_MODULE_BY_ID[id].risk_level;
    return risk === 'high' || risk === 'urgent' || risk === 'medium_high';
  });
}

function selectFinalQuestions(
  ranked: ScoredQuestion[],
  moduleIds: HealthModuleId[],
  primaryModuleId: HealthModuleId | null,
): ScoredQuestion[] {
  const selected: ScoredQuestion[] = [];
  const usedIds = new Set<string>();

  const pick = (predicate: (question: ScoredQuestion) => boolean): ScoredQuestion | undefined => {
    const match = ranked.find((question) => !usedIds.has(question.id) && predicate(question));
    if (!match) return undefined;
    usedIds.add(match.id);
    selected.push(match);
    return match;
  };

  pick((q) => q.type === 'red_flag');
  pick((q) => q.type === 'care_blocker');

  if (moduleIds.includes('pregnancy_concern_ng_v1') || moduleIds.includes('child_fever_illness_ng_v1')) {
    pick((q) => q.type === 'risk_context');
  }

  pick((q) => q.type === 'timing');
  pick((q) => q.type === 'severity');

  if (moduleIds.includes('medication_question_ng_v1')) {
    pick((q) => q.type === 'medication_context');
  }

  if (moduleIds.includes('lab_result_confusion_ng_v1')) {
    pick((q) => q.moduleId === 'lab_result_confusion_ng_v1' && /symptom/i.test(q.question));
    pick((q) => q.moduleId === 'lab_result_confusion_ng_v1' && /test|slip|result/i.test(q.question));
  }

  for (const question of ranked) {
    if (selected.length >= MAX_QUESTIONS) break;
    if (usedIds.has(question.id)) continue;
    usedIds.add(question.id);
    selected.push(question);
  }

  if (primaryModuleId) {
    const primaryCount = selected.filter((q) => q.moduleId === primaryModuleId).length;
    if (primaryCount < Math.min(2, MAX_QUESTIONS)) {
      for (const question of ranked) {
        if (selected.length >= MAX_QUESTIONS) break;
        if (question.moduleId !== primaryModuleId || usedIds.has(question.id)) continue;
        const replaceIndex = selected.findIndex(
          (q) => q.moduleId !== primaryModuleId && q.type === 'associated_symptom',
        );
        if (replaceIndex >= 0 && selected.length >= MAX_QUESTIONS) {
          usedIds.delete(selected[replaceIndex].id);
          selected[replaceIndex] = question;
          usedIds.add(question.id);
        } else if (!usedIds.has(question.id)) {
          usedIds.add(question.id);
          selected.push(question);
        }
      }
    }
  }

  while (selected.length < MIN_QUESTIONS) {
    const next = ranked.find((question) => !usedIds.has(question.id));
    if (!next) break;
    usedIds.add(next.id);
    selected.push(next);
  }

  return selected
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_QUESTIONS);
}

function dedupeQuestions(questions: ScoredQuestion[]): ScoredQuestion[] {
  const seen = new Set<string>();
  const result: ScoredQuestion[] = [];
  const sorted = [...questions].sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  for (const question of sorted) {
    const key = `${question.type}:${normalizeText(question.question)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(question);
  }
  return result;
}

function fallbackQuestions(
  moduleIds: HealthModuleId[],
  primaryModuleId: HealthModuleId | null,
): ScoredQuestion[] {
  const targetId = primaryModuleId ?? moduleIds[0];
  if (!targetId) return [];

  const module = HEALTH_MODULE_BY_ID[targetId];
  return module.required_questions.slice(0, MIN_QUESTIONS).flatMap((question) => {
    const guided = moduleQuestionToGuided(module, question, primaryModuleId);
    return guided ? [guided] : [];
  });
}

/** Deterministic guided question selection — module questions + safety probes, no diagnosis or prescribing. */
export function generateGuidedQuestions(input: GenerateGuidedQuestionsInput): GuidedQuestion[] {
  const moduleIds = resolveModuleIds(input.selectedModules);
  if (moduleIds.length === 0) return [];

  const pool: ScoredQuestion[] = [
    ...buildRedFlagResultQuestions(input.redFlagResult, input.redFlags, input.primaryModuleId),
    ...buildRedFlagProbeQuestions(moduleIds, input.rawText, input.primaryModuleId),
    ...buildModuleQuestions(moduleIds, input.rawText, input.primaryModuleId),
    ...buildContextQuestions(moduleIds, input.rawText, input.primaryModuleId),
  ];

  if (shouldIncludeCareBlocker(moduleIds, input.redFlagResult, input.redFlags)) {
    pool.push({
      ...CARE_BLOCKER_QUESTION,
      priority: TYPE_PRIORITY.care_blocker,
    });
  }

  let ranked = dedupeQuestions(pool);

  if (ranked.length < MIN_QUESTIONS) {
    ranked = dedupeQuestions([...ranked, ...fallbackQuestions(moduleIds, input.primaryModuleId)]);
  }

  ranked = selectFinalQuestions(ranked, moduleIds, input.primaryModuleId);

  return ranked.map((question) => {
    const { priority: _omitPriority, ...rest } = question;
    void _omitPriority;
    return rest;
  });
}
