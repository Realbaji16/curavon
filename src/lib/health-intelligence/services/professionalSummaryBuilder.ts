import type { HealthModuleId } from '../modules/moduleIds';
import type { IntelligenceRedFlagHit, IntelligenceRiskLevel } from '../types';
import type { RouterRiskLevel } from './moduleRouter';
import { isHealthIntelligenceResponseAllowed } from './responseSafetyValidator';

export type ProfessionalSummaryType = 'pharmacist' | 'lab_follow_up' | 'doctor' | 'general';

export type ProfessionalSummaryField = {
  fieldId: string;
  label: string;
};

export type ProfessionalSummaryPreview = {
  summaryType: ProfessionalSummaryType;
  title: string;
  fields: ProfessionalSummaryField[];
  footer: string;
};

export type BuildProfessionalSummaryInput = {
  rawText?: string;
  selectedModuleIds: HealthModuleId[];
  primaryModuleId?: HealthModuleId | null;
  riskLevel?: RouterRiskLevel | IntelligenceRiskLevel;
  redFlags?: IntelligenceRedFlagHit[];
};

const NON_SYMPTOM_MODULES: ReadonlySet<HealthModuleId> = new Set([
  'clinic_pharmacy_prep_ng_v1',
  'medication_question_ng_v1',
  'lab_result_confusion_ng_v1',
  'missed_medication_ng_v1',
]);

const SUMMARY_FIELD_DEFINITIONS = {
  main_concern: 'Main concern',
  when_started: 'When it started',
  symptoms_noticed: 'Symptoms noticed',
  severity: 'Severity',
  medication_taken: 'Medication already taken',
  known_conditions: 'Known conditions',
  allergies: 'Allergies',
  tests_lab_results: 'Tests/lab results',
  red_flags_checked: 'Red flags checked',
  questions_for_health_worker: 'Questions for health worker',
} as const;

type SummaryFieldKey = keyof typeof SUMMARY_FIELD_DEFINITIONS;

const SAFE_FOOTER =
  'These fields help you organize notes for a health worker. This is not a diagnosis or treatment advice.';

const SUMMARY_TITLES: Record<ProfessionalSummaryType, string> = {
  pharmacist: 'Pharmacist summary preparation',
  lab_follow_up: 'Test slip follow-up preparation',
  doctor: 'Clinician summary preparation',
  general: 'Health visit note preparation',
};

function field(key: SummaryFieldKey): ProfessionalSummaryField {
  return { fieldId: key, label: SUMMARY_FIELD_DEFINITIONS[key] };
}

function isElevatedSymptomRisk(
  riskLevel: RouterRiskLevel | IntelligenceRiskLevel | undefined,
): boolean {
  return (
    riskLevel === 'medium' ||
    riskLevel === 'high' ||
    riskLevel === 'urgent' ||
    riskLevel === 'medium_high'
  );
}

function hasSymptomConcern(moduleIds: HealthModuleId[]): boolean {
  return moduleIds.some((moduleId) => !NON_SYMPTOM_MODULES.has(moduleId));
}

function shouldIncludeLabFields(
  summaryType: ProfessionalSummaryType,
  moduleIds: HealthModuleId[],
): boolean {
  return summaryType === 'lab_follow_up' || moduleIds.includes('lab_result_confusion_ng_v1');
}

/** Deterministic summary type — medication > lab > elevated symptom > general. */
export function resolveProfessionalSummaryType(input: {
  selectedModuleIds: HealthModuleId[];
  riskLevel?: RouterRiskLevel | IntelligenceRiskLevel;
}): ProfessionalSummaryType {
  if (input.selectedModuleIds.includes('medication_question_ng_v1')) {
    return 'pharmacist';
  }
  if (input.selectedModuleIds.includes('lab_result_confusion_ng_v1')) {
    return 'lab_follow_up';
  }
  if (isElevatedSymptomRisk(input.riskLevel) && hasSymptomConcern(input.selectedModuleIds)) {
    return 'doctor';
  }
  return 'general';
}

function buildFieldList(
  summaryType: ProfessionalSummaryType,
  moduleIds: HealthModuleId[],
): ProfessionalSummaryField[] {
  const fields: ProfessionalSummaryField[] = [
    field('main_concern'),
    field('when_started'),
    field('symptoms_noticed'),
    field('severity'),
    field('medication_taken'),
    field('known_conditions'),
    field('allergies'),
  ];

  if (shouldIncludeLabFields(summaryType, moduleIds)) {
    fields.push(field('tests_lab_results'));
  }

  fields.push(field('red_flags_checked'), field('questions_for_health_worker'));

  if (summaryType === 'pharmacist') {
    return prioritizeFields(fields, [
      'main_concern',
      'medication_taken',
      'when_started',
      'symptoms_noticed',
      'allergies',
      'known_conditions',
      'severity',
      'tests_lab_results',
      'red_flags_checked',
      'questions_for_health_worker',
    ]);
  }

  if (summaryType === 'lab_follow_up') {
    return prioritizeFields(fields, [
      'main_concern',
      'tests_lab_results',
      'when_started',
      'symptoms_noticed',
      'medication_taken',
      'severity',
      'known_conditions',
      'allergies',
      'red_flags_checked',
      'questions_for_health_worker',
    ]);
  }

  if (summaryType === 'doctor') {
    return prioritizeFields(fields, [
      'main_concern',
      'when_started',
      'symptoms_noticed',
      'severity',
      'red_flags_checked',
      'medication_taken',
      'known_conditions',
      'allergies',
      'tests_lab_results',
      'questions_for_health_worker',
    ]);
  }

  return fields;
}

function prioritizeFields(
  fields: ProfessionalSummaryField[],
  order: string[],
): ProfessionalSummaryField[] {
  const byId = new Map(fields.map((entry) => [entry.fieldId, entry]));
  const ordered: ProfessionalSummaryField[] = [];
  for (const fieldId of order) {
    const match = byId.get(fieldId);
    if (match) ordered.push(match);
  }
  for (const entry of fields) {
    if (!ordered.some((item) => item.fieldId === entry.fieldId)) {
      ordered.push(entry);
    }
  }
  return ordered;
}

function assertSafeCopy(text: string): string {
  if (!isHealthIntelligenceResponseAllowed(text)) {
    throw new Error(`Unsafe professional summary copy: ${text}`);
  }
  return text;
}

/**
 * Phase 1 professional summary preview — field labels only, no generated values.
 * Never includes diagnosis or prescription wording.
 */
export function buildProfessionalSummaryPreview(
  input: BuildProfessionalSummaryInput,
): ProfessionalSummaryPreview {
  const summaryType = resolveProfessionalSummaryType({
    selectedModuleIds: input.selectedModuleIds,
    riskLevel: input.riskLevel,
  });

  const title = assertSafeCopy(SUMMARY_TITLES[summaryType]);
  const fields = buildFieldList(summaryType, input.selectedModuleIds).map((entry) => ({
    fieldId: entry.fieldId,
    label: entry.label,
  }));

  const footer = assertSafeCopy(SAFE_FOOTER);

  return {
    summaryType,
    title,
    fields,
    footer,
  };
}
