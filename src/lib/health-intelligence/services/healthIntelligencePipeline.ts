import { APPROVED_ACTIONS } from '../actions/allowedActions';
import { HEALTH_MODULE_BY_ID } from '../modules/moduleCatalog';
import type { HealthModuleId } from '../modules/moduleIds';
import type { ModuleAllowedAction } from '../modules/moduleTypes';
import type {
  HealthIntelligenceResult,
  IntelligenceQuestion,
  IntelligenceRiskLevel,
  IntelligenceSummaryPreview,
  SelectedModuleMatch,
} from '../types';
import { generateGuidedQuestions, type GuidedQuestion } from './guidedQuestionEngine';
import { normalizeNigerianHealthLanguage } from './languageNormalizer';
import { resolveNextBestAction } from './nextBestActionPolicy';
import { buildProfessionalSummaryPreview } from './professionalSummaryBuilder';
import { routeHealthModules } from './moduleRouter';
import { bridgeRedFlags } from './redFlagBridge';
import { validateHealthIntelligenceResponse } from './responseSafetyValidator';

export type HealthIntelligencePipelineInput = {
  rawText: string;
  context?: Record<string, unknown>;
};

const TIMING_CONTEXT_PATTERN =
  /\b(since|yesterday|today|for \d+|days? ago|hours? ago|this morning|last night)\b/i;

const MEDICATION_CONTEXT_PATTERN =
  /\b(chemist|pharmacy|drug|medicine|medication|malaria drug|antimalarial)\b/i;

const LAB_CONTEXT_PATTERN = /\b(widal|lab result|test result|typhoid|malaria test)\b/i;

const PREGNANCY_CONTEXT_PATTERN = /\b(pregnant|pregnancy|antenatal)\b/i;

const CHILD_CONTEXT_PATTERN = /\b(child|baby|infant|my son|my daughter)\b/i;

const SELF_CARE_ACTION_CATEGORIES = new Set<ModuleAllowedAction['category']>([
  'stabilize',
  'track',
  'reduce_friction',
]);

function normalizePipelineText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function toSelectedModuleMatches(
  routing: ReturnType<typeof routeHealthModules>,
): SelectedModuleMatch[] {
  return routing.selectedModules.map((module) => ({
    moduleId: module.moduleId,
    confidence: Math.min(1, 0.45 + module.matchedTriggers.length * 0.15),
    matchedTriggers: module.matchedTriggers,
  }));
}

function toIntelligenceQuestion(question: GuidedQuestion): IntelligenceQuestion {
  return {
    id: question.id,
    prompt: question.question,
    source: question.generatedBy === 'module' ? 'module_required' : 'ai_generated',
    moduleId: question.moduleId,
  };
}

function toSummaryPreview(
  preview: ReturnType<typeof buildProfessionalSummaryPreview>,
): IntelligenceSummaryPreview {
  return {
    title: preview.title,
    fields: preview.fields.map((field) => ({
      fieldId: field.fieldId,
      label: field.label,
      value: '',
    })),
    footer: preview.footer,
  };
}

function hasEnoughContext(input: {
  rawText: string;
  normalizedTermCount: number;
}): boolean {
  const normalized = normalizePipelineText(input.rawText);
  const hasTiming = TIMING_CONTEXT_PATTERN.test(normalized);
  return hasTiming && input.normalizedTermCount >= 2;
}

function collectAllowedActions(
  moduleIds: HealthModuleId[],
  urgentOnly: boolean,
): ModuleAllowedAction[] {
  const seen = new Set<string>();
  const actions: ModuleAllowedAction[] = [];

  for (const moduleId of moduleIds) {
    const module = HEALTH_MODULE_BY_ID[moduleId];
    for (const action of module.allowed_actions) {
      if (seen.has(action.id)) continue;
      if (urgentOnly) {
        const isEscalation =
          action.category === 'seek_care' ||
          action.category === 'escalate' ||
          action.safetyLevel === 'urgent' ||
          action.safetyLevel === 'high';
        if (!isEscalation) continue;
      } else if (SELF_CARE_ACTION_CATEGORIES.has(action.category) && action.safetyLevel === 'low') {
        // allowed in safe path
      }
      seen.add(action.id);
      actions.push(action);
    }
  }

  return actions;
}

function limitUrgentQuestions(questions: IntelligenceQuestion[]): IntelligenceQuestion[] {
  const summaryQuestion = questions.find((question) =>
    /summary|prepare|organize|clinician|pharmacist/i.test(question.prompt),
  );
  return summaryQuestion ? [summaryQuestion] : [];
}

function buildSafeMessage(input: {
  routing: ReturnType<typeof routeHealthModules>;
  nextStep: string;
  questionCount: number;
}): string {
  const moduleNames = input.routing.selectedModules.map((module) => module.name);
  const focus =
    moduleNames.length > 0
      ? `Curavon can help organize notes for: ${moduleNames.join(', ')}.`
      : 'Curavon can help organize your health notes.';
  const guidance =
    input.questionCount > 0
      ? 'Answer a few short questions so we can prepare safe next steps.'
      : input.nextStep;
  return `${focus}\n\n${guidance}\n\nThis does not diagnose. If symptoms are severe, sudden, or unsafe, seek urgent care.`;
}

function sanitizeMessage(message: string): string {
  const validation = validateHealthIntelligenceResponse(message, { appendSafeDisclaimer: true });
  return validation.sanitizedText ?? message;
}

function detectContextFlags(rawText: string, tags: string[]) {
  const normalized = normalizePipelineText(rawText);
  return {
    medicationContext:
      tags.includes('medication') || MEDICATION_CONTEXT_PATTERN.test(normalized),
    labContext: tags.includes('lab') || LAB_CONTEXT_PATTERN.test(normalized),
    pregnancyContext: tags.includes('pregnancy') || PREGNANCY_CONTEXT_PATTERN.test(normalized),
    childContext: tags.includes('pediatric') || CHILD_CONTEXT_PATTERN.test(normalized),
  };
}

/** Phase 1 deterministic health-intelligence pipeline. */
export function runHealthIntelligencePipeline(
  input: HealthIntelligencePipelineInput,
): HealthIntelligenceResult {
  const rawText = input.rawText.trim();
  const normalization = normalizeNigerianHealthLanguage(rawText);
  const routing = routeHealthModules({ rawText });
  const redFlagBridge = bridgeRedFlags(rawText);

  const selectedModuleIds = routing.selectedModules.map((module) => module.moduleId);
  const contextFlags = detectContextFlags(rawText, normalization.tags);
  const normalizedTerms = Object.values(normalization.normalizedTerms);
  const enoughContext = hasEnoughContext({
    rawText,
    normalizedTermCount: Object.keys(normalization.normalizedTerms).length,
  });

  const professionalSummary = buildProfessionalSummaryPreview({
    rawText,
    selectedModuleIds,
    primaryModuleId: routing.primaryModuleId,
    riskLevel: routing.riskLevel,
    redFlags: redFlagBridge.hits,
  });

  if (redFlagBridge.isUrgent) {
    const urgentNextStep = APPROVED_ACTIONS.seek_urgent_care_now.instruction;
    const guidedQuestions = generateGuidedQuestions({
      rawText,
      selectedModules: routing.selectedModules,
      primaryModuleId: routing.primaryModuleId,
      redFlags: redFlagBridge.hits,
      redFlagResult: redFlagBridge.detection,
    });
    const questions = limitUrgentQuestions(guidedQuestions.map(toIntelligenceQuestion));

    const message = sanitizeMessage(redFlagBridge.message || urgentNextStep);

    return {
      message,
      normalizedTerms,
      selectedModules: toSelectedModuleMatches(routing),
      primaryModuleId: routing.primaryModuleId,
      riskLevel: 'urgent',
      redFlags: redFlagBridge.hits,
      questions,
      allowedActions: collectAllowedActions(selectedModuleIds, true),
      nextStep: urgentNextStep,
      summaryPreview: toSummaryPreview(professionalSummary),
      safety: {
        allowed: false,
        riskLevel: 'urgent',
        blockedReason: 'urgent_red_flags',
      },
    };
  }

  const guidedQuestions = generateGuidedQuestions({
    rawText,
    selectedModules: routing.selectedModules,
    primaryModuleId: routing.primaryModuleId,
    redFlags: redFlagBridge.hits,
    redFlagResult: redFlagBridge.detection,
  });
  const questions = guidedQuestions.map(toIntelligenceQuestion);

  const pendingGuidedQuestions = !enoughContext && questions.length > 0;
  const nextAction = resolveNextBestAction({
    riskLevel: routing.riskLevel,
    primaryModuleId: routing.primaryModuleId,
    selectedModuleIds,
    hasRedFlags: false,
    hasPendingGuidedQuestions: pendingGuidedQuestions,
    ...contextFlags,
  });

  const nextStep = pendingGuidedQuestions
    ? APPROVED_ACTIONS.answer_guided_questions.instruction
    : nextAction.nextStep;

  const message = sanitizeMessage(
    buildSafeMessage({
      routing,
      nextStep,
      questionCount: pendingGuidedQuestions ? questions.length : 0,
    }),
  );

  const riskLevel: IntelligenceRiskLevel = routing.riskLevel;

  return {
    message,
    normalizedTerms,
    selectedModules: toSelectedModuleMatches(routing),
    primaryModuleId: routing.primaryModuleId,
    riskLevel,
    redFlags: redFlagBridge.hits,
    questions,
    allowedActions: collectAllowedActions(selectedModuleIds, false),
    nextStep,
    summaryPreview: toSummaryPreview(professionalSummary),
    safety: {
      allowed: true,
      riskLevel,
    },
  };
}
