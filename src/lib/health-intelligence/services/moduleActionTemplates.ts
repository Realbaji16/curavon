import type { ApprovedActionId } from '../actions/allowedActions';
import { APPROVED_ACTIONS } from '../actions/allowedActions';
import type { HealthModuleId } from '../modules/moduleIds';
import { isHealthModuleId } from '../modules/moduleIds';
import type { FlowProposalIntelligenceContext } from './intelligenceContextSerializer';

export type ModuleFlowProposalPlanCategory = 'track' | 'prepare' | 'stabilize';

export type ModuleFlowProposalAction = {
  actionId: ApprovedActionId;
  title: string;
  instruction: string;
  reason: string;
  category: ModuleFlowProposalPlanCategory;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  primaryModuleId: HealthModuleId | null;
};

export type ModuleFlowProposalPreview = {
  title: string;
  instruction: string;
  reason: string;
  category: ModuleFlowProposalPlanCategory;
  safetyLevel: 'normal' | 'caution' | 'urgent';
};

type TemplateOverrides = Partial<
  Pick<ModuleFlowProposalAction, 'title' | 'instruction' | 'reason' | 'category' | 'safetyLevel'>
>;

const ELEVATED_RISK_LEVELS = new Set(['medium_high', 'high', 'urgent']);

function hasNormalizedSignal(context: FlowProposalIntelligenceContext, pattern: RegExp): boolean {
  return context.normalizedTerms.some((term) => pattern.test(term));
}

function hasActionSignal(context: FlowProposalIntelligenceContext, pattern: RegExp): boolean {
  return context.allowedActionIds.some((actionId) => pattern.test(actionId));
}

function buildFromApprovedAction(
  actionId: ApprovedActionId,
  primaryModuleId: HealthModuleId | null,
  overrides: TemplateOverrides = {},
): ModuleFlowProposalAction {
  const approved = APPROVED_ACTIONS[actionId];
  const category =
    overrides.category ??
    (approved.category === 'track'
      ? 'track'
      : approved.category === 'prepare'
        ? 'prepare'
        : 'prepare');

  return {
    actionId,
    title: overrides.title ?? approved.label,
    instruction: overrides.instruction ?? approved.instruction,
    reason: overrides.reason ?? 'One safe organizational next step — not a diagnosis or treatment plan.',
    category,
    safetyLevel: overrides.safetyLevel ?? 'normal',
    primaryModuleId,
  };
}

function resolveFeverAction(context: FlowProposalIntelligenceContext): ModuleFlowProposalAction {
  const medsContext =
    hasNormalizedSignal(context, /\b(medicine|medication|chemist|pharmacy|drug|malaria drug)\b/i) ||
    hasActionSignal(context, /medicine|meds|mixing/i) ||
    context.summaryFieldIds.includes('medicines_taken');

  if (ELEVATED_RISK_LEVELS.has(context.riskLevel)) {
    return buildFromApprovedAction('follow_up_if_worse_or_persistent', 'fever_malaria_ng_v1', {
      title: 'Follow up if fever persists or worsens',
      reason:
        'Persistent or worsening fever should be reviewed in person. This organizes timing — it does not diagnose malaria or typhoid.',
      safetyLevel: context.riskLevel === 'urgent' ? 'urgent' : 'caution',
      category: 'prepare',
    });
  }

  return {
    actionId: 'save_symptom_timeline',
    title: 'Track fever timeline',
    instruction: medsContext
      ? 'Write when the fever started, how it is changing, and medicine names you already took from a chemist, pharmacy, or clinic.'
      : APPROVED_ACTIONS.save_symptom_timeline.instruction,
    reason:
      'Organizing fever timing and medicines already taken helps a clinician review — not a diagnosis or dosing advice.',
    category: 'track',
    safetyLevel: 'normal',
    primaryModuleId: 'fever_malaria_ng_v1',
  };
}

function resolveHeadacheAction(context: FlowProposalIntelligenceContext): ModuleFlowProposalAction {
  const safetyContext =
    hasNormalizedSignal(
      context,
      /\b(vision|blurry|bp|blood pressure|weakness|confusion|neuro|face drooping)\b/i,
    ) || context.riskLevel === 'urgent' || context.riskLevel === 'high';

  if (safetyContext) {
    return buildFromApprovedAction('speak_to_health_professional_today', 'headache_ng_v1', {
      title: 'Safety review for headache',
      reason:
        'Headache with possible safety signs should be reviewed in person. Organize notes first — not a diagnosis.',
      safetyLevel: context.riskLevel === 'urgent' ? 'urgent' : 'caution',
      category: 'prepare',
    });
  }

  if (ELEVATED_RISK_LEVELS.has(context.riskLevel)) {
    return buildFromApprovedAction('follow_up_if_worse_or_persistent', 'headache_ng_v1', {
      title: 'Follow up if headache persists',
      reason: 'A persistent or worsening headache warrants clinician review without waiting.',
      safetyLevel: 'caution',
      category: 'prepare',
    });
  }

  return buildFromApprovedAction('monitor_and_track', 'headache_ng_v1', {
    title: 'Track headache pattern',
    instruction:
      'Note when the headache started, how strong it feels, and any vision, weakness, or neck pain signs to watch.',
    reason: 'Tracking onset, severity, and safety signs supports the next clinician conversation.',
    category: 'track',
  });
}

function resolveMedicationAction(context: FlowProposalIntelligenceContext): ModuleFlowProposalAction {
  const allergyOrUrgent =
    context.riskLevel === 'urgent' ||
    hasNormalizedSignal(context, /\b(itch|rash|swelling|reaction|breathing|overdose)\b/i) ||
    hasActionSignal(context, /urgent|seek_care|escalate/i);

  if (allergyOrUrgent) {
    return buildFromApprovedAction('speak_to_health_professional_today', 'medication_question_ng_v1', {
      title: 'Urgent medicine concern review',
      instruction:
        'With breathing difficulty, face or lip swelling, or a spreading rash, seek emergency care now. Otherwise speak with a pharmacist or clinician today about the reaction.',
      reason:
        'Possible allergic reaction or urgent medicine concern needs in-person review — organize what was taken for the pharmacist or clinician.',
      safetyLevel: context.riskLevel === 'urgent' ? 'urgent' : 'caution',
      category: 'prepare',
    });
  }

  return {
    actionId: 'prepare_pharmacist_summary',
    title: 'Prepare pharmacist summary',
    instruction:
      'List the medicine name, where it came from, and what changed after taking it. Note all other medicines you use and ask a pharmacist before mixing them.',
    reason:
      'Organizing what was taken and what changed supports safe pharmacist review — one organizational step, not treatment advice here.',
    category: 'prepare',
    safetyLevel: 'normal',
    primaryModuleId: 'medication_question_ng_v1',
  };
}

function resolveLabAction(context: FlowProposalIntelligenceContext): ModuleFlowProposalAction {
  return buildFromApprovedAction('ask_for_test_or_lab_context', 'lab_result_confusion_ng_v1', {
    title: 'Organize test slip details',
    instruction:
      'Write the test name, date, symptoms that led to the test, and the wording that confuses you — leave result meaning to a clinician.',
    reason:
      'Test slips need symptom and timing context for a clinician. Curavon does not name an illness from numbers on a slip.',
    category: 'prepare',
    safetyLevel: ELEVATED_RISK_LEVELS.has(context.riskLevel) ? 'caution' : 'normal',
  });
}

function resolveClinicPrepAction(context: FlowProposalIntelligenceContext): ModuleFlowProposalAction {
  return buildFromApprovedAction('prepare_doctor_summary', 'clinic_pharmacy_prep_ng_v1', {
    title: 'Prepare visit checklist',
    instruction:
      'List your main concern, medicines and test results to bring, and the top questions you want to ask at the clinic or pharmacy.',
    reason: 'A short visit checklist helps you speak clearly with a health professional — not a diagnosis.',
    category: 'prepare',
    safetyLevel: ELEVATED_RISK_LEVELS.has(context.riskLevel) ? 'caution' : 'normal',
  });
}

/** Deterministic module-aware safe next step for flow proposal. */
export function resolveModuleFlowProposalAction(
  context: FlowProposalIntelligenceContext,
): ModuleFlowProposalAction {
  const primaryModuleId =
    context.primaryModuleId && isHealthModuleId(context.primaryModuleId)
      ? context.primaryModuleId
      : context.selectedModules.find((moduleId) => isHealthModuleId(moduleId)) ?? null;

  switch (primaryModuleId) {
    case 'fever_malaria_ng_v1':
      return resolveFeverAction(context);
    case 'headache_ng_v1':
      return resolveHeadacheAction(context);
    case 'medication_question_ng_v1':
      return resolveMedicationAction(context);
    case 'lab_result_confusion_ng_v1':
      return resolveLabAction(context);
    case 'clinic_pharmacy_prep_ng_v1':
      return resolveClinicPrepAction(context);
    default:
      return buildFromApprovedAction('monitor_and_track', primaryModuleId, {
        title: 'Track your concern',
        reason: 'Organize timing and changes before deeper guidance — not a diagnosis.',
        category: 'track',
      });
  }
}

export function toProposedActionPreview(action: ModuleFlowProposalAction): ModuleFlowProposalPreview {
  return {
    title: action.title,
    instruction: action.instruction,
    reason: action.reason,
    category: action.category,
    safetyLevel: action.safetyLevel,
  };
}

export function proposedActionText(action: ModuleFlowProposalAction): string {
  return `${action.title} ${action.instruction} ${action.reason}`;
}
