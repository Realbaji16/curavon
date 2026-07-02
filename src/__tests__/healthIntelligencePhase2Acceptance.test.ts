import { describe, expect, it } from 'vitest';
import { isHealthIntelligenceOutputBlocked } from '../lib/health-intelligence/actions/blockedOutputs';
import {
  proposedActionText,
  resolveModuleFlowProposalAction,
} from '../lib/health-intelligence/services/moduleActionTemplates';
import { generateGuidedQuestions } from '../lib/health-intelligence/services/guidedQuestionEngine';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';
import { serializeIntelligenceForFlowProposal } from '../lib/health-intelligence/services/intelligenceContextSerializer';
import { isHealthIntelligenceResponseAllowed } from '../lib/health-intelligence/services/responseSafetyValidator';

const FEVER_MALARIA_DRUG = 'body hot since yesterday and took malaria drug';

const HEADACHE_BLURRY_VISION = 'headache and blurry vision since morning';

const HEADACHE_STROKE_RED_FLAG = 'headache with face drooping and slurred speech';

const MEDICATION_SIDE_EFFECT = 'chemist gave me drug and body itching after drug';

const LAB_RESULT_INPUT = 'Widal 1:160 do I have typhoid';

const CLINIC_PREP_INPUT = 'what should I tell doctor at clinic tomorrow';

const DIAGNOSIS_PATTERN =
  /\b(you have (malaria|typhoid|migraine|stroke|hypertension)|this confirms|widal.*means)\b/i;

const MEDICATION_CHANGE_PATTERN =
  /\b(start|stop|continue|change)\s+(taking\s+)?(your\s+)?(this\s+)?(medication|medicine|drug|antibiotic|antimalarial)\b/i;

const LAB_INTERPRETATION_PATTERN =
  /\b(you have typhoid|you have malaria|widal.*means|interpret.*result|positive means)\b/i;

const FACILITY_DIRECTIVE_PATTERN =
  /\b(go to|visit|head to)\s+(the\s+)?(hospital|clinic|pharmacy|chemist)\b/i;

function moduleIdsFromRouting(routing: ReturnType<typeof routeHealthModules>): string[] {
  return routing.selectedModules.map((module) => module.moduleId);
}

function pipelineBlob(result: ReturnType<typeof runHealthIntelligencePipeline>): string {
  return `${result.message} ${result.nextStep} ${result.summaryPreview.title} ${result.summaryPreview.footer}`;
}

function flowActionFor(rawText: string) {
  const intelligence = runHealthIntelligencePipeline({ rawText });
  const context = serializeIntelligenceForFlowProposal(intelligence);
  return {
    intelligence,
    context,
    action: resolveModuleFlowProposalAction(context),
  };
}

function expectSafePipelineCopy(result: ReturnType<typeof runHealthIntelligencePipeline>): void {
  expect(isHealthIntelligenceResponseAllowed(result.message)).toBe(true);
  expect(isHealthIntelligenceResponseAllowed(result.nextStep)).toBe(true);
  expect(isHealthIntelligenceOutputBlocked(pipelineBlob(result))).toBe(false);
}

function expectSafeFlowAction(action: ReturnType<typeof resolveModuleFlowProposalAction>): void {
  const blob = proposedActionText(action);
  expect(isHealthIntelligenceOutputBlocked(blob)).toBe(false);
  expect(blob.toLowerCase()).not.toMatch(DIAGNOSIS_PATTERN);
  expect(blob.toLowerCase()).not.toMatch(MEDICATION_CHANGE_PATTERN);
  expect(['track', 'prepare', 'stabilize']).toContain(action.category);
}

describe('Healthy.Ai Phase 2 acceptance', () => {
  describe('1. Fever + malaria drug', () => {
    it('routes fever and medication modules with fever as primary', () => {
      const routing = routeHealthModules({ rawText: FEVER_MALARIA_DRUG });
      const moduleIds = moduleIdsFromRouting(routing);

      expect(moduleIds).toEqual(
        expect.arrayContaining(['fever_malaria_ng_v1', 'medication_question_ng_v1']),
      );
      expect(routing.primaryModuleId).toBe('fever_malaria_ng_v1');
    });

    it('asks medication, history, and safety screening questions', () => {
      const routing = routeHealthModules({ rawText: FEVER_MALARIA_DRUG });
      const questions = generateGuidedQuestions({
        rawText: FEVER_MALARIA_DRUG,
        selectedModules: routing.selectedModules,
        primaryModuleId: routing.primaryModuleId,
      });

      expect(questions.length).toBeGreaterThanOrEqual(2);
      expect(questions.length).toBeLessThanOrEqual(5);
      expect(questions.some((question) => question.type === 'medication_context')).toBe(true);
      expect(questions.some((question) => question.type === 'red_flag')).toBe(true);
      expect(
        questions.some(
          (question) =>
            question.type === 'severity' ||
            /worse|improving|hottest|temperature|started/i.test(question.question),
        ),
      ).toBe(true);
    });

    it('produces a safe module-aware flow proposal action', () => {
      const { action, intelligence } = flowActionFor(FEVER_MALARIA_DRUG);

      expect(intelligence.primaryModuleId).toBe('fever_malaria_ng_v1');
      expect(action.primaryModuleId).toBe('fever_malaria_ng_v1');
      expect(['save_symptom_timeline', 'follow_up_if_worse_or_persistent']).toContain(action.actionId);
      expect(action.reason.toLowerCase()).toMatch(/fever|clinician|organiz/);
      expectSafeFlowAction(action);
    });

    it('does not diagnose malaria or typhoid in pipeline output', () => {
      const result = runHealthIntelligencePipeline({ rawText: FEVER_MALARIA_DRUG });

      expect(result.safety.allowed).toBe(true);
      expect(pipelineBlob(result).toLowerCase()).not.toMatch(DIAGNOSIS_PATTERN);
      expectSafePipelineCopy(result);
    });
  });

  describe('2. Headache + blurry vision', () => {
    it('places safety screening questions first', () => {
      const routing = routeHealthModules({ rawText: HEADACHE_BLURRY_VISION });
      const questions = generateGuidedQuestions({
        rawText: HEADACHE_BLURRY_VISION,
        selectedModules: routing.selectedModules,
        primaryModuleId: routing.primaryModuleId,
      });

      expect(routing.primaryModuleId).toBe('headache_ng_v1');
      expect(questions[0]?.type).toBe('red_flag');
      expect(questions[0]?.question.toLowerCase()).toMatch(
        /vision|weakness|confusion|face drooping/,
      );
    });

    it('does not diagnose migraine or stroke in routine pipeline output', () => {
      const result = runHealthIntelligencePipeline({ rawText: HEADACHE_BLURRY_VISION });
      const blob = pipelineBlob(result).toLowerCase();

      expect(result.safety.allowed).toBe(true);
      expect(blob).not.toMatch(/\byou have migraine\b/);
      expect(blob).not.toMatch(/\byou have stroke\b/);
      expect(blob).not.toMatch(/\bthis is just stress\b/);
      expectSafePipelineCopy(result);
    });

    it('uses safe escalation wording for vision context in flow proposal', () => {
      const { action, intelligence } = flowActionFor(HEADACHE_BLURRY_VISION);
      const blob = `${action.instruction} ${action.reason} ${intelligence.message}`.toLowerCase();

      expect(
        action.actionId === 'speak_to_health_professional_today' ||
          /vision|weakness|professional|clinician|safety/.test(blob),
      ).toBe(true);
      expectSafeFlowAction(action);
    });

    it('escalates urgently with safe wording when stroke red flags are present', () => {
      const result = runHealthIntelligencePipeline({ rawText: HEADACHE_STROKE_RED_FLAG });

      expect(result.riskLevel).toBe('urgent');
      expect(result.safety.allowed).toBe(false);
      expect(result.message.toLowerCase()).toMatch(/urgent|emergency|care|professional/);
      expect(result.message.toLowerCase()).not.toMatch(/\byou have stroke\b/);
      expect(isHealthIntelligenceOutputBlocked(result.message)).toBe(false);
    });
  });

  describe('3. Medication side effect', () => {
    it('uses pharmacist summary type and medication-specific summary fields', () => {
      const result = runHealthIntelligencePipeline({ rawText: MEDICATION_SIDE_EFFECT });
      const labels = result.summaryPreview.fields.map((field) => field.label);

      expect(result.primaryModuleId).toBe('medication_question_ng_v1');
      expect(result.summaryPreview.title.toLowerCase()).toMatch(/pharmacist/);
      expect(labels).toEqual(
        expect.arrayContaining([
          'Medicine name',
          'Where it came from',
          'When taken',
          'Questions for pharmacist',
        ]),
      );
    });

    it('escalates allergy-related red flags to urgent care', () => {
      const urgentText = 'difficulty breathing after medicine';
      const result = runHealthIntelligencePipeline({ rawText: urgentText });

      expect(result.riskLevel).toBe('urgent');
      expect(result.safety.allowed).toBe(false);
      expect(result.safety.blockedReason).toBe('urgent_red_flags');
    });

    it('does not tell the user to stop, start, or change medicine', () => {
      const result = runHealthIntelligencePipeline({ rawText: 'can I stop this drug' });
      const blob = pipelineBlob(result).toLowerCase();

      expect(result.selectedModules.some((module) => module.moduleId === 'medication_question_ng_v1')).toBe(
        true,
      );
      expect(blob).not.toMatch(MEDICATION_CHANGE_PATTERN);
      expect(blob).not.toMatch(/\byou should stop\b/);
      expect(blob).not.toMatch(/\byou can stop\b/);
      expectSafePipelineCopy(result);
    });

    it('escalates reaction context to pharmacist or clinician review in flow proposal', () => {
      const { action } = flowActionFor(MEDICATION_SIDE_EFFECT);

      expect(action.actionId).toBe('speak_to_health_professional_today');
      expect(action.category).toBe('prepare');
      expect(action.instruction.toLowerCase()).toMatch(/pharmacist|clinician|reaction|rash/);
      expectSafeFlowAction(action);
    });

    it('exposes pharmacist-summary preparation in allowed actions', () => {
      const { intelligence } = flowActionFor('chemist gave me drug what is the name on the pack');

      expect(intelligence.primaryModuleId).toBe('medication_question_ng_v1');
      expect(intelligence.allowedActions.some((action) => action.id === 'prepare_pharmacist_summary')).toBe(
        true,
      );
    });
  });

  describe('4. Lab result confusion', () => {
    it('does not interpret the lab result or name typhoid/malaria', () => {
      const result = runHealthIntelligencePipeline({ rawText: LAB_RESULT_INPUT });
      const blob = pipelineBlob(result).toLowerCase();

      expect(result.safety.allowed).toBe(true);
      expect(blob).not.toMatch(LAB_INTERPRETATION_PATTERN);
      expect(blob).not.toMatch(DIAGNOSIS_PATTERN);
      expectSafePipelineCopy(result);
    });

    it('asks test context questions (name, date, symptoms, who ordered)', () => {
      const routing = routeHealthModules({ rawText: LAB_RESULT_INPUT });
      const questions = generateGuidedQuestions({
        rawText: LAB_RESULT_INPUT,
        selectedModules: routing.selectedModules,
        primaryModuleId: routing.primaryModuleId,
      });
      const prompts = questions.map((question) => question.question.toLowerCase()).join(' ');

      expect(routing.primaryModuleId).toBe('lab_result_confusion_ng_v1');
      expect(questions.some((question) => question.moduleId === 'lab_result_confusion_ng_v1')).toBe(
        true,
      );
      expect(prompts).toMatch(/test name|name as written|what test was done|name on the slip/);
      expect(prompts).toMatch(/when was the test done|date/);
      expect(prompts).toMatch(/symptom/);
      expect(prompts).toMatch(/ordered/);
    });

    it('proposes clinician review / summary organization, not treatment', () => {
      const { action, intelligence } = flowActionFor(LAB_RESULT_INPUT);
      const blob = `${intelligence.nextStep} ${action.instruction} ${action.reason}`.toLowerCase();

      expect(action.actionId).toBe('ask_for_test_or_lab_context');
      expect(blob).toMatch(/clinician|test name|symptom/);
      expect(blob).not.toMatch(/\btake amoxicillin\b/);
      expect(blob).not.toMatch(/\btreatment plan\b/);
      expectSafeFlowAction(action);
    });
  });

  describe('5. Clinic / pharmacy prep', () => {
    it('routes to clinic prep and exposes visit checklist summary fields', () => {
      const routing = routeHealthModules({ rawText: CLINIC_PREP_INPUT });
      const result = runHealthIntelligencePipeline({ rawText: CLINIC_PREP_INPUT });
      const labels = result.summaryPreview.fields.map((field) => field.label);

      expect(moduleIdsFromRouting(routing)).toContain('clinic_pharmacy_prep_ng_v1');
      expect(routing.primaryModuleId).toBe('clinic_pharmacy_prep_ng_v1');
      expect(labels).toEqual(
        expect.arrayContaining([
          'Visit type',
          'Main concern',
          'Timeline',
          'Medicines',
          'Lab/test documents',
          'Top questions',
          'Blocker',
        ]),
      );
    });

    it('includes questions for a health worker without facility or medicine directives', () => {
      const result = runHealthIntelligencePipeline({ rawText: CLINIC_PREP_INPUT });
      const blob = pipelineBlob(result).toLowerCase();

      expect(blob).toMatch(/question|visit|clinic|pharmacist|health professional/);
      expect(blob).not.toMatch(FACILITY_DIRECTIVE_PATTERN);
      expect(blob).not.toMatch(MEDICATION_CHANGE_PATTERN);
      expectSafePipelineCopy(result);
    });

    it('proposes visit checklist preparation as the flow action', () => {
      const { action } = flowActionFor(CLINIC_PREP_INPUT);

      expect(action.actionId).toBe('prepare_doctor_summary');
      expect(action.instruction.toLowerCase()).toMatch(/questions|visit|bring/);
      expectSafeFlowAction(action);
    });
  });
});
