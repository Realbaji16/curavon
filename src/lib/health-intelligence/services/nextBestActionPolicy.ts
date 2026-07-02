import type { ApprovedActionId } from '../actions/allowedActions';
import { APPROVED_ACTIONS } from '../actions/allowedActions';
import type { HealthModuleId } from '../modules/moduleIds';
import type { RouterRiskLevel } from './moduleRouter';
import type { FlowProposalIntelligenceContext } from './intelligenceContextSerializer';
import {
  resolveModuleFlowProposalAction,
  type ModuleFlowProposalAction,
} from './moduleActionTemplates';

export type { ModuleFlowProposalAction };

export type NextBestActionInput = {
  riskLevel: RouterRiskLevel;
  primaryModuleId: HealthModuleId | null;
  selectedModuleIds: HealthModuleId[];
  hasRedFlags?: boolean;
  hasPendingGuidedQuestions?: boolean;
  medicationContext?: boolean;
  labContext?: boolean;
  pregnancyContext?: boolean;
  childContext?: boolean;
};

export type NextBestActionResult = {
  actionId: ApprovedActionId;
  nextStep: string;
  reason: string;
};

const URGENT_PRIMARY_MODULES: ReadonlySet<HealthModuleId> = new Set([
  'chest_pain_ng_v1',
  'breathing_difficulty_ng_v1',
  'pregnancy_concern_ng_v1',
  'child_fever_illness_ng_v1',
]);

function buildResult(actionId: ApprovedActionId, reason: string): NextBestActionResult {
  const action = APPROVED_ACTIONS[actionId];
  return {
    actionId,
    nextStep: action.instruction,
    reason,
  };
}

/** Map risk and module context to one approved next step. Deterministic — no AI. */
export function resolveNextBestAction(input: NextBestActionInput): NextBestActionResult {
  if (input.hasPendingGuidedQuestions) {
    return buildResult(
      'answer_guided_questions',
      'Guided intake is incomplete — safety and timing questions come first.',
    );
  }

  if (
    input.riskLevel === 'urgent' ||
    input.hasRedFlags ||
    (input.primaryModuleId && URGENT_PRIMARY_MODULES.has(input.primaryModuleId))
  ) {
    return buildResult(
      'seek_urgent_care_now',
      'Urgent risk, red flags, or a high-acuity primary module requires emergency-oriented guidance.',
    );
  }

  if (input.labContext || input.selectedModuleIds.includes('lab_result_confusion_ng_v1')) {
    return buildResult(
      'ask_for_test_or_lab_context',
      'Lab or test confusion should be organized for clinician review, not interpreted as diagnosis.',
    );
  }

  if (input.medicationContext || input.selectedModuleIds.includes('medication_question_ng_v1')) {
    if (input.selectedModuleIds.length > 1) {
      return buildResult(
        'avoid_unsafe_medicine_mixing',
        'Medication concern with multiple symptom modules — document medicines before mixing or changing.',
      );
    }
    return buildResult(
      'visit_clinic_or_pharmacy_for_guidance',
      'Medication questions should involve a pharmacist or clinician, not dosing advice here.',
    );
  }

  if (input.pregnancyContext || input.selectedModuleIds.includes('pregnancy_concern_ng_v1')) {
    return buildResult(
      'speak_to_health_professional_today',
      'Pregnancy concerns need timely antenatal or obstetric review.',
    );
  }

  if (input.childContext || input.selectedModuleIds.includes('child_fever_illness_ng_v1')) {
    return buildResult(
      'speak_to_health_professional_today',
      'Child illness warrants timely pediatric or clinic review.',
    );
  }

  if (input.riskLevel === 'high') {
    return buildResult(
      'speak_to_health_professional_today',
      'Elevated risk level suggests speaking with a health professional today.',
    );
  }

  if (input.selectedModuleIds.includes('clinic_pharmacy_prep_ng_v1')) {
    return buildResult(
      'prepare_doctor_summary',
      'Visit-prep context — organize notes and clinician questions.',
    );
  }

  if (input.selectedModuleIds.length > 0) {
    return buildResult(
      'save_symptom_timeline',
      'Active symptom modules — capture timeline before deeper guidance.',
    );
  }

  return buildResult(
    'monitor_and_track',
    'Default safe organizational step when no acute routing signal is present.',
  );
}

/** Map serialized intake intelligence to one module-aware flow-proposal action. */
export function resolveFlowProposalActionFromIntelligenceContext(
  intelligenceContext: FlowProposalIntelligenceContext,
): ModuleFlowProposalAction {
  return resolveModuleFlowProposalAction(intelligenceContext);
}

/** @deprecated Use resolveNextBestAction — kept as alias for requirement naming. */
export const selectNextBestAction = resolveNextBestAction;
