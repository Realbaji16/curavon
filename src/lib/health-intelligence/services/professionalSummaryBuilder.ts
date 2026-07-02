import type { FormInsightProductContext } from '../../form-insights/formInsightContextTypes';
import { resolveFormInsightContext } from '../../form-insights/runtime/productContextProvider';
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
  formInsightContext?: FormInsightProductContext;
};

const PHASE2_PRIMARY_MODULES = new Set<HealthModuleId>([
  'fever_malaria_ng_v1',
  'headache_ng_v1',
  'medication_question_ng_v1',
  'lab_result_confusion_ng_v1',
  'clinic_pharmacy_prep_ng_v1',
]);

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

const LAB_CONTEXT_PATTERN = /\b(widal|lab result|test result|typhoid test|malaria test|1:\d+)\b/i;

function field(key: SummaryFieldKey): ProfessionalSummaryField {
  return { fieldId: key, label: SUMMARY_FIELD_DEFINITIONS[key] };
}

function moduleField(fieldId: string, label: string): ProfessionalSummaryField {
  return { fieldId, label };
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

function mentionsLabContext(rawText?: string, moduleIds: HealthModuleId[] = []): boolean {
  if (moduleIds.includes('lab_result_confusion_ng_v1')) return true;
  if (!rawText) return false;
  return LAB_CONTEXT_PATTERN.test(rawText.toLowerCase());
}

function resolvePrimaryModuleId(input: BuildProfessionalSummaryInput): HealthModuleId | null {
  if (input.primaryModuleId) return input.primaryModuleId;
  return input.selectedModuleIds[0] ?? null;
}

/** Deterministic summary type — primary module first, then medication > lab > elevated symptom > general. */
export function resolveProfessionalSummaryType(input: {
  selectedModuleIds: HealthModuleId[];
  primaryModuleId?: HealthModuleId | null;
  riskLevel?: RouterRiskLevel | IntelligenceRiskLevel;
}): ProfessionalSummaryType {
  const primaryModuleId = input.primaryModuleId ?? input.selectedModuleIds[0] ?? null;

  if (primaryModuleId === 'medication_question_ng_v1') {
    return 'pharmacist';
  }
  if (primaryModuleId === 'lab_result_confusion_ng_v1') {
    return 'lab_follow_up';
  }
  if (primaryModuleId === 'clinic_pharmacy_prep_ng_v1') {
    return 'general';
  }
  if (
    (primaryModuleId === 'fever_malaria_ng_v1' || primaryModuleId === 'headache_ng_v1') &&
    isElevatedSymptomRisk(input.riskLevel)
  ) {
    return 'doctor';
  }
  if (primaryModuleId === 'fever_malaria_ng_v1' || primaryModuleId === 'headache_ng_v1') {
    return 'doctor';
  }

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

function buildFeverSummaryFields(input: BuildProfessionalSummaryInput): ProfessionalSummaryField[] {
  const fields: ProfessionalSummaryField[] = [
    moduleField('concern', 'Main concern'),
    moduleField('timeline', 'When it started'),
    moduleField('peak_heat', 'Temperature if known'),
    moduleField('symptoms', 'Other symptoms'),
    moduleField('fluids', 'Fluids and urine'),
    moduleField('medicines_taken', 'Medicines already taken'),
  ];

  if (mentionsLabContext(input.rawText, input.selectedModuleIds)) {
    fields.push(moduleField('lab_test_context', 'Tests/lab results'));
  }

  fields.push(moduleField('clinician_questions', 'Questions for clinician'));
  return fields;
}

function buildHeadacheSummaryFields(input: BuildProfessionalSummaryInput): ProfessionalSummaryField[] {
  void input;
  return [
    moduleField('concern', 'Headache description'),
    moduleField('timeline', 'Start and pattern'),
    moduleField('severity', 'Severity'),
    moduleField('vision_changes', 'Vision changes'),
    moduleField('neuro_symptoms', 'Weakness, confusion, or speech symptoms'),
    moduleField('bp_reading', 'Blood pressure reading if known'),
    moduleField('medications_tried', 'Medicines already taken'),
    moduleField('clinician_questions', 'Questions for clinician'),
  ];
}

function buildMedicationSummaryFields(input: BuildProfessionalSummaryInput): ProfessionalSummaryField[] {
  void input;
  return [
    moduleField('medicine_name', 'Medicine name'),
    moduleField('medicine_source', 'Where it came from'),
    moduleField('when_taken', 'When taken'),
    moduleField('instructions_received', 'Instructions received'),
    moduleField('reaction_after', 'What changed after taking it'),
    moduleField('allergies', 'Allergies'),
    moduleField('pharmacist_questions', 'Questions for pharmacist'),
  ];
}

function buildLabSummaryFields(input: BuildProfessionalSummaryInput): ProfessionalSummaryField[] {
  void input;
  return [
    moduleField('test_name', 'Test name'),
    moduleField('test_date', 'Date and facility'),
    moduleField('unclear_wording', 'Result section you are confused about'),
    moduleField('symptoms_context', 'Symptoms now'),
    moduleField('who_ordered', 'Who ordered the test'),
    moduleField('medicines_started', 'Medicines started because of result'),
    moduleField('clinician_questions', 'Questions for clinician'),
  ];
}

function buildClinicPrepSummaryFields(input: BuildProfessionalSummaryInput): ProfessionalSummaryField[] {
  void input;
  return [
    moduleField('visit_type', 'Visit type'),
    moduleField('concern', 'Main concern'),
    moduleField('timeline', 'Timeline'),
    moduleField('medications', 'Medicines'),
    moduleField('labs', 'Lab/test documents'),
    moduleField('questions', 'Top questions'),
    moduleField('blockers', 'Blocker'),
  ];
}

function buildPhase2ModuleFields(input: BuildProfessionalSummaryInput): ProfessionalSummaryField[] | null {
  const primaryModuleId = resolvePrimaryModuleId(input);
  if (!primaryModuleId || !PHASE2_PRIMARY_MODULES.has(primaryModuleId)) {
    return null;
  }

  switch (primaryModuleId) {
    case 'fever_malaria_ng_v1':
      return buildFeverSummaryFields(input);
    case 'headache_ng_v1':
      return buildHeadacheSummaryFields(input);
    case 'medication_question_ng_v1':
      return buildMedicationSummaryFields(input);
    case 'lab_result_confusion_ng_v1':
      return buildLabSummaryFields(input);
    case 'clinic_pharmacy_prep_ng_v1':
      return buildClinicPrepSummaryFields(input);
    default:
      return null;
  }
}

function buildGenericFieldList(
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

  if (summaryType === 'lab_follow_up' || moduleIds.includes('lab_result_confusion_ng_v1')) {
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

function mergeApprovedSummaryFieldCandidates(
  fields: ProfessionalSummaryField[],
  input: BuildProfessionalSummaryInput,
): ProfessionalSummaryField[] {
  const context = resolveFormInsightContext(input.formInsightContext);
  if (!context || context.summaryFieldCandidates.length === 0) {
    return fields;
  }

  const primaryModuleId = resolvePrimaryModuleId(input);
  const existing = new Set(fields.map((field) => field.fieldId));
  const merged = [...fields];

  for (const candidate of context.summaryFieldCandidates) {
    if (candidate.moduleId && primaryModuleId && candidate.moduleId !== primaryModuleId) {
      continue;
    }
    if (existing.has(candidate.fieldId)) continue;
    merged.push(moduleField(candidate.fieldId, candidate.label));
    existing.add(candidate.fieldId);
  }

  return merged;
}

function assertSafeCopy(text: string): string {
  if (!isHealthIntelligenceResponseAllowed(text)) {
    throw new Error(`Unsafe professional summary copy: ${text}`);
  }
  return text;
}

/**
 * Professional summary preview — field labels only, no generated values.
 * Phase 2 primary modules use module-specific field layouts from approved seeds.
 */
export function buildProfessionalSummaryPreview(
  input: BuildProfessionalSummaryInput,
): ProfessionalSummaryPreview {
  const summaryType = resolveProfessionalSummaryType({
    selectedModuleIds: input.selectedModuleIds,
    primaryModuleId: input.primaryModuleId,
    riskLevel: input.riskLevel,
  });

  const phase2Fields = buildPhase2ModuleFields(input);
  const baseFields = phase2Fields ?? buildGenericFieldList(summaryType, input.selectedModuleIds);
  const mergedFields = mergeApprovedSummaryFieldCandidates(baseFields, input);

  const fields = mergedFields.map((entry) => ({
    fieldId: entry.fieldId,
    label: entry.label,
  }));

  const title = assertSafeCopy(SUMMARY_TITLES[summaryType]);
  const footer = assertSafeCopy(SAFE_FOOTER);

  return {
    summaryType,
    title,
    fields,
    footer,
  };
}
