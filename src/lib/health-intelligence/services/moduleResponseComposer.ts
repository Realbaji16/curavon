import type { FormInsightProductContext } from '../../form-insights/formInsightContextTypes';
import { resolveFormInsightContext } from '../../form-insights/runtime/productContextProvider';
import { HEALTH_MODULE_BY_ID } from '../modules/moduleCatalog';
import type { HealthModuleId } from '../modules/moduleIds';
import type {
  IntelligenceQuestion,
  IntelligenceRedFlagHit,
  IntelligenceRiskLevel,
  SelectedModuleMatch,
} from '../types';
import type { RoutedModuleSelection } from './moduleRouter';

export type ModuleAwareSelectedModule = {
  moduleId: HealthModuleId;
  name?: string;
};

export type ComposeModuleAwareIntakeMessageInput = {
  rawText: string;
  selectedModules: ModuleAwareSelectedModule[] | RoutedModuleSelection[] | SelectedModuleMatch[];
  primaryModuleId: HealthModuleId | null;
  normalizedTerms: string[];
  riskLevel: IntelligenceRiskLevel;
  questions: IntelligenceQuestion[];
  nextStep: string;
  redFlags: IntelligenceRedFlagHit[];
  formInsightContext?: FormInsightProductContext;
};

type MessageContext = {
  feverConcern: boolean;
  medicationMentioned: boolean;
  visionConcern: boolean;
  bloodPressureConcern: boolean;
  neuroConcern: boolean;
  labMentioned: boolean;
};

const FEVER_CONCERN_PATTERN =
  /\b(body hot|hot body|body dey hot|my body is hot|i dey hot|fever|temperature|chills|shivering)\b/i;

const MEDICATION_CONTEXT_PATTERN =
  /\b(chemist|pharmacy|drug|medicine|medication|tablet|capsule|malaria drug|antimalarial)\b/i;

const VISION_CONCERN_PATTERN =
  /\b(blurry vision|blurred vision|vision loss|double vision|cannot see well|cannot see)\b/i;

const BLOOD_PRESSURE_CONCERN_PATTERN = /\b(bp|blood pressure|hypertension)\b/i;

const NEURO_CONCERN_PATTERN =
  /\b(weakness|confusion|slurred speech|face drooping|numbness|cannot move)\b/i;

const LAB_CONTEXT_PATTERN = /\b(widal|lab result|test result|typhoid test|malaria test|1:\d+)\b/i;

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function detectMessageContext(rawText: string, normalizedTerms: string[]): MessageContext {
  const normalized = normalizeText(rawText);
  const termsBlob = normalizeText(normalizedTerms.join(' '));

  return {
    feverConcern:
      FEVER_CONCERN_PATTERN.test(normalized) ||
      /\bfever|hot body|body temperature\b/i.test(termsBlob),
    medicationMentioned:
      MEDICATION_CONTEXT_PATTERN.test(normalized) ||
      /\bmedicine|medication|chemist|pharmacy\b/i.test(termsBlob),
    visionConcern: VISION_CONCERN_PATTERN.test(normalized),
    bloodPressureConcern: BLOOD_PRESSURE_CONCERN_PATTERN.test(normalized),
    neuroConcern: NEURO_CONCERN_PATTERN.test(normalized),
    labMentioned:
      LAB_CONTEXT_PATTERN.test(normalized) || /\blab|test result|widal\b/i.test(termsBlob),
  };
}

function moduleName(moduleId: HealthModuleId): string {
  return HEALTH_MODULE_BY_ID[moduleId].name;
}

function buildGuidanceLine(input: ComposeModuleAwareIntakeMessageInput): string {
  if (input.questions.length > 0) {
    return 'Answer a few short questions so we can prepare safe next steps.';
  }
  return input.nextStep;
}

function buildSafetyDisclaimer(): string {
  return 'This does not diagnose. If symptoms are severe, sudden, or unsafe, seek urgent care.';
}

function buildFeverOpening(context: MessageContext): string {
  const lines = [
    'It sounds like you are concerned about fever or your body feeling hot.',
    'Curavon can help organize when symptoms started, how they are changing, and what else you are noticing.',
  ];

  if (context.medicationMentioned) {
    lines.push(
      'If you already took medicine from a chemist, pharmacy, or clinic, we will note what was taken — not recommend doses or changes.',
    );
  }

  return lines.join(' ');
}

function buildHeadacheOpening(context: MessageContext): string {
  if (context.visionConcern || context.bloodPressureConcern || context.neuroConcern) {
    const safetyFocus: string[] = [];
    if (context.visionConcern) safetyFocus.push('vision changes');
    if (context.bloodPressureConcern) safetyFocus.push('blood pressure worries');
    if (context.neuroConcern) safetyFocus.push('other nerve-related signs');

    return [
      'Headache concerns need careful safety screening first — especially with',
      `${safetyFocus.join(', ')}.`,
      'We will ask safety questions before organizing your notes for a clinician to review.',
    ].join(' ');
  }

  return 'Curavon can help organize when the headache started, how strong it feels, and what else you are noticing — without naming a cause or giving treatment advice.';
}

function buildMedicationOpening(): string {
  return 'Curavon can help organize the medicine name, where it came from, and what changed after you took it — without telling you to start, stop, or change a medicine.';
}

function buildLabOpening(): string {
  return 'When a test slip or report is confusing, a clinician can review it more easily with the test name, date, your symptoms, and who ordered the test. Curavon will not interpret numbers or reactive flags on your behalf — we help organize context for professional review.';
}

function buildClinicPrepOpening(): string {
  return 'Curavon can help you prepare clear notes and questions for your clinic or pharmacy visit — your main concern, what to bring, and what you want to ask a health professional.';
}

function buildGenericOpening(
  primaryModuleId: HealthModuleId | null,
  selectedModules: ComposeModuleAwareIntakeMessageInput['selectedModules'],
): string {
  if (!primaryModuleId) {
    return 'Curavon can help organize your health notes for a clinician or pharmacist to review.';
  }

  const primaryName = moduleName(primaryModuleId);

  const otherNames = selectedModules
    .filter((module) => module.moduleId !== primaryModuleId)
    .map((module) => moduleName(module.moduleId));

  if (otherNames.length === 0) {
    return `Curavon can help organize notes for ${primaryName.toLowerCase()} for a clinician to review.`;
  }

  return `Curavon can help organize notes for ${primaryName.toLowerCase()} and related concerns (${otherNames.join(', ').toLowerCase()}) for a clinician to review.`;
}

function buildModuleOpening(
  primaryModuleId: HealthModuleId | null,
  context: MessageContext,
  selectedModules: ComposeModuleAwareIntakeMessageInput['selectedModules'],
): string {
  switch (primaryModuleId) {
    case 'fever_malaria_ng_v1':
      return buildFeverOpening(context);
    case 'headache_ng_v1':
      return buildHeadacheOpening(context);
    case 'medication_question_ng_v1':
      return buildMedicationOpening();
    case 'lab_result_confusion_ng_v1':
      return buildLabOpening();
    case 'clinic_pharmacy_prep_ng_v1':
      return buildClinicPrepOpening();
    default:
      return buildGenericOpening(primaryModuleId, selectedModules);
  }
}

function buildFormInsightTrustCopy(
  primaryModuleId: HealthModuleId | null,
  context: FormInsightProductContext | undefined,
): string | null {
  if (!context || context.responseCopyLines.length === 0) return null;

  const match =
    context.responseCopyLines.find((entry) => entry.moduleId === primaryModuleId) ??
    context.responseCopyLines.find((entry) => !entry.moduleId) ??
    context.responseCopyLines[0];

  return match?.line ?? null;
}

const CARE_ROUTE_PREP_MODULES = new Set<HealthModuleId>([
  'clinic_pharmacy_prep_ng_v1',
  'lab_result_confusion_ng_v1',
  'medication_question_ng_v1',
]);

function buildFormInsightCareRouteCopy(
  primaryModuleId: HealthModuleId | null,
  context: FormInsightProductContext | undefined,
): string | null {
  if (!context || context.careRouteCopyLines.length === 0 || !primaryModuleId) return null;
  if (!CARE_ROUTE_PREP_MODULES.has(primaryModuleId)) return null;

  const match =
    context.careRouteCopyLines.find((entry) => entry.moduleId === primaryModuleId) ??
    context.careRouteCopyLines.find((entry) => !entry.moduleId) ??
    context.careRouteCopyLines[0];

  return match?.line ?? null;
}

/** Compose a calm, module-aware intake message — never for urgent red-flag paths. */
export function composeModuleAwareIntakeMessage(
  input: ComposeModuleAwareIntakeMessageInput,
): string {
  const context = detectMessageContext(input.rawText, input.normalizedTerms);
  const productContext = resolveFormInsightContext(input.formInsightContext);
  const opening = buildModuleOpening(input.primaryModuleId, context, input.selectedModules);
  const trustCopy = buildFormInsightTrustCopy(input.primaryModuleId, productContext);
  const careRouteCopy = buildFormInsightCareRouteCopy(input.primaryModuleId, productContext);

  return [opening, careRouteCopy, trustCopy, buildGuidanceLine(input), buildSafetyDisclaimer()]
    .filter(Boolean)
    .join('\n\n');
}
