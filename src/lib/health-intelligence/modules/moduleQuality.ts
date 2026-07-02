import { findHealthIntelligenceBlockedViolations } from '../actions/blockedOutputs';
import type { HealthModuleId } from './moduleIds';
import type { HealthModule, ModuleQuestionKind } from './moduleTypes';

/** Phase 2 production-quality targets — first five modules only. */
export const PRIORITY_PHASE2_MODULE_IDS = [
  'fever_malaria_ng_v1',
  'headache_ng_v1',
  'medication_question_ng_v1',
  'lab_result_confusion_ng_v1',
  'clinic_pharmacy_prep_ng_v1',
] as const satisfies readonly HealthModuleId[];

export type PriorityPhase2ModuleId = (typeof PRIORITY_PHASE2_MODULE_IDS)[number];

export type ModuleQualityCheckId =
  | 'status'
  | 'entry_triggers'
  | 'red_flags'
  | 'questions'
  | 'allowed_actions'
  | 'summary_fields'
  | 'not_allowed_boundaries'
  | 'ai_question_policy'
  | 'allowed_action_safety'
  | 'summary_field_safety';

export type ModuleQualityIssue = {
  checkId: ModuleQualityCheckId;
  message: string;
};

export type ModuleQualityResult = {
  moduleId: HealthModuleId;
  passed: boolean;
  issues: ModuleQualityIssue[];
};

export type ClinicalReviewMarker = {
  reviewed_at: string;
  reviewer_role?: string;
};

const MIN_ENTRY_TRIGGER_TERMS = 8;
const MIN_RED_FLAGS = 4;
const MIN_QUESTIONS = 6;
const MIN_ALLOWED_ACTIONS = 4;
const MIN_SUMMARY_FIELDS = 6;

const QUESTION_KINDS_FOR_COUNT: ReadonlySet<ModuleQuestionKind> = new Set([
  'required',
  'conditional',
]);

const NOT_ALLOWED_BOUNDARY_PATTERNS = {
  diagnosis:
    /\b(diagnos\w*|naming\s+.*\s+illness|naming\s+.*\s+condition|conclud(e|ing)\s+.*\s+(illness|disease|condition)|interpreting\s+.*\s+as\s+(proof|confirming))\b/i,
  prescription: /\bprescri\w*/i,
  dosage: /\b(dosage|dosing|dose)\b/i,
  emergency_replacement:
    /\b(replacing\s+(emergency|triage)|replacing\s+emergency\s+services|instead\s+of\s+waiting\s+for\s+(emergency|urgent))\b/i,
} as const;

const SUMMARY_DISEASE_CONCLUSION_PATTERNS: RegExp[] = [
  /\byou have\b/i,
  /\bdiagnos(e|is|ed|ing)\b/i,
  /\bconfirm(s|ed)?\s+(malaria|typhoid|infection|disease)\b/i,
  /\b(proves?|proof of)\s+(malaria|typhoid|infection|disease)\b/i,
  /\bthis means you have\b/i,
  /\b(normal|abnormal)\s+result\s+means\b/i,
];

function isPriorityPhase2ModuleId(moduleId: HealthModuleId): moduleId is PriorityPhase2ModuleId {
  return (PRIORITY_PHASE2_MODULE_IDS as readonly string[]).includes(moduleId);
}

function countEntryTriggerTerms(module: HealthModule): number {
  return module.entry_triggers.reduce((total, trigger) => total + trigger.terms.length, 0);
}

function countEligibleQuestions(module: HealthModule): number {
  return module.required_questions.filter((question) =>
    QUESTION_KINDS_FOR_COUNT.has(question.kind),
  ).length;
}

function getClinicalReviewMarker(module: HealthModule): ClinicalReviewMarker | undefined {
  const extended = module as HealthModule & { clinical_review?: ClinicalReviewMarker };
  return extended.clinical_review;
}

function hasClinicalReviewMarker(module: HealthModule): boolean {
  const marker = getClinicalReviewMarker(module);
  return Boolean(marker?.reviewed_at?.trim());
}

function notAllowedBlob(module: HealthModule): string {
  return module.not_allowed.join(' ').toLowerCase();
}

function boundaryPresent(blob: string, pattern: RegExp): boolean {
  return pattern.test(blob);
}

function checkNotAllowedBoundaries(module: HealthModule): ModuleQualityIssue[] {
  const blob = notAllowedBlob(module);
  const issues: ModuleQualityIssue[] = [];

  if (!boundaryPresent(blob, NOT_ALLOWED_BOUNDARY_PATTERNS.diagnosis)) {
    issues.push({
      checkId: 'not_allowed_boundaries',
      message: 'not_allowed must document diagnosis boundary language.',
    });
  }
  if (!boundaryPresent(blob, NOT_ALLOWED_BOUNDARY_PATTERNS.prescription)) {
    issues.push({
      checkId: 'not_allowed_boundaries',
      message: 'not_allowed must document prescription boundary language.',
    });
  }
  if (!boundaryPresent(blob, NOT_ALLOWED_BOUNDARY_PATTERNS.dosage)) {
    issues.push({
      checkId: 'not_allowed_boundaries',
      message: 'not_allowed must document dosage boundary language.',
    });
  }
  if (!boundaryPresent(blob, NOT_ALLOWED_BOUNDARY_PATTERNS.emergency_replacement)) {
    issues.push({
      checkId: 'not_allowed_boundaries',
      message: 'not_allowed must document emergency or triage replacement boundary language.',
    });
  }

  return issues;
}

function checkAiQuestionPolicy(module: HealthModule): ModuleQualityIssue[] {
  const policy = module.ai_generated_question_policy;
  const issues: ModuleQualityIssue[] = [];

  if (!policy?.enabled) {
    issues.push({
      checkId: 'ai_question_policy',
      message: 'ai_generated_question_policy.enabled must be true.',
    });
  }
  if (!policy?.forbiddenTopics?.length) {
    issues.push({
      checkId: 'ai_question_policy',
      message: 'ai_generated_question_policy.forbiddenTopics must be non-empty.',
    });
  }

  return issues;
}

function maskSafeAllowedActionPhrases(text: string): string {
  return text
    .replace(/\bif you have not\b/gi, '')
    .replace(/\b(or )?you have ongoing conditions\b/gi, '')
    .replace(/\bwithout naming an illness\b/gi, '')
    .replace(/\bnot a diagnos\w*\b/gi, '');
}

function checkAllowedActionSafety(module: HealthModule): ModuleQualityIssue[] {
  const issues: ModuleQualityIssue[] = [];

  for (const action of module.allowed_actions) {
    const blob = maskSafeAllowedActionPhrases(`${action.title} ${action.instruction}`);
    const violations = findHealthIntelligenceBlockedViolations(blob);
    if (violations.length > 0) {
      issues.push({
        checkId: 'allowed_action_safety',
        message: `allowed action "${action.id}" contains unsafe language (${violations[0]?.label}).`,
      });
    }
  }

  return issues;
}

function checkSummaryFieldSafety(module: HealthModule): ModuleQualityIssue[] {
  const issues: ModuleQualityIssue[] = [];

  for (const field of module.summary_fields) {
    const blob = `${field.label} ${field.id}`;
    for (const pattern of SUMMARY_DISEASE_CONCLUSION_PATTERNS) {
      if (pattern.test(blob)) {
        issues.push({
          checkId: 'summary_field_safety',
          message: `summary field "${field.id}" must not prompt disease conclusion language.`,
        });
        break;
      }
    }
  }

  return issues;
}

function checkStatus(module: HealthModule): ModuleQualityIssue[] {
  if (module.status === 'approved' && !hasClinicalReviewMarker(module)) {
    return [
      {
        checkId: 'status',
        message:
          'status "approved" requires clinical_review.reviewed_at; use "review" until clinical review exists.',
      },
    ];
  }

  if (module.status !== 'review' && module.status !== 'approved') {
    return [
      {
        checkId: 'status',
        message: `status must be "review" or "approved" (got "${module.status}").`,
      },
    ];
  }

  return [];
}

/** Validate Phase 2 production-quality rules for a priority module seed. */
export function validatePriorityModuleQuality(module: HealthModule): ModuleQualityResult {
  const issues: ModuleQualityIssue[] = [];

  if (!isPriorityPhase2ModuleId(module.module_id)) {
    return {
      moduleId: module.module_id,
      passed: false,
      issues: [
        {
          checkId: 'status',
          message: `${module.module_id} is not a Phase 2 priority module.`,
        },
      ],
    };
  }

  issues.push(...checkStatus(module));

  const triggerTermCount = countEntryTriggerTerms(module);
  if (triggerTermCount < MIN_ENTRY_TRIGGER_TERMS) {
    issues.push({
      checkId: 'entry_triggers',
      message: `expected at least ${MIN_ENTRY_TRIGGER_TERMS} entry trigger terms, got ${triggerTermCount}.`,
    });
  }

  if (module.red_flags.length < MIN_RED_FLAGS) {
    issues.push({
      checkId: 'red_flags',
      message: `expected at least ${MIN_RED_FLAGS} red flags, got ${module.red_flags.length}.`,
    });
  }

  const questionCount = countEligibleQuestions(module);
  if (questionCount < MIN_QUESTIONS) {
    issues.push({
      checkId: 'questions',
      message: `expected at least ${MIN_QUESTIONS} required or conditional questions, got ${questionCount}.`,
    });
  }

  if (module.allowed_actions.length < MIN_ALLOWED_ACTIONS) {
    issues.push({
      checkId: 'allowed_actions',
      message: `expected at least ${MIN_ALLOWED_ACTIONS} allowed actions, got ${module.allowed_actions.length}.`,
    });
  }

  if (module.summary_fields.length < MIN_SUMMARY_FIELDS) {
    issues.push({
      checkId: 'summary_fields',
      message: `expected at least ${MIN_SUMMARY_FIELDS} summary fields, got ${module.summary_fields.length}.`,
    });
  }

  issues.push(...checkNotAllowedBoundaries(module));
  issues.push(...checkAiQuestionPolicy(module));
  issues.push(...checkAllowedActionSafety(module));
  issues.push(...checkSummaryFieldSafety(module));

  return {
    moduleId: module.module_id,
    passed: issues.length === 0,
    issues,
  };
}

export function validateAllPriorityModuleQuality(
  modules: readonly HealthModule[],
): ModuleQualityResult[] {
  return PRIORITY_PHASE2_MODULE_IDS.map((moduleId) => {
    const module = modules.find((entry) => entry.module_id === moduleId);
    if (!module) {
      return {
        moduleId,
        passed: false,
        issues: [{ checkId: 'status', message: `module seed missing for ${moduleId}.` }],
      };
    }
    return validatePriorityModuleQuality(module);
  });
}
