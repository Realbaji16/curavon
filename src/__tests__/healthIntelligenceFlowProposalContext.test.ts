import { describe, expect, it } from 'vitest';
import { isHealthIntelligenceOutputBlocked } from '../lib/health-intelligence/actions/blockedOutputs';
import {
  proposedActionText,
  resolveModuleFlowProposalAction,
} from '../lib/health-intelligence/services/moduleActionTemplates';
import { resolveFlowProposalActionFromIntelligenceContext } from '../lib/health-intelligence/services/nextBestActionPolicy';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { serializeIntelligenceForFlowProposal } from '../lib/health-intelligence/services/intelligenceContextSerializer';
import type { FlowProposalIntelligenceContext } from '../lib/health-intelligence/services/intelligenceContextSerializer';

function baseContext(
  primaryModuleId: FlowProposalIntelligenceContext['primaryModuleId'],
  overrides: Partial<FlowProposalIntelligenceContext> = {},
): FlowProposalIntelligenceContext {
  return {
    selectedModules: primaryModuleId ? [primaryModuleId] : [],
    primaryModuleId,
    riskLevel: 'medium',
    normalizedTerms: [],
    questionCount: 3,
    summaryFieldIds: [],
    allowedActionIds: [],
    ...overrides,
  };
}

function expectSafeAction(action: ReturnType<typeof resolveModuleFlowProposalAction>): void {
  const blob = proposedActionText(action).toLowerCase();
  expect(blob).not.toMatch(/\byou have (malaria|typhoid)\b/);
  expect(blob).not.toMatch(/\bwhat dose\b/);
  expect(blob).not.toMatch(/\b(start|stop|change) (your )?(medicine|medication|drug)\b/);
  expect(isHealthIntelligenceOutputBlocked(proposedActionText(action))).toBe(false);
  expect(['track', 'prepare', 'stabilize']).toContain(action.category);
}

describe('resolveModuleFlowProposalAction', () => {
  it('fever module tracks timeline and medicines already taken', () => {
    const action = resolveModuleFlowProposalAction(
      baseContext('fever_malaria_ng_v1', {
        normalizedTerms: ['fever / feeling hot', 'malaria drug'],
        summaryFieldIds: ['medicines_taken'],
      }),
    );

    expect(action.primaryModuleId).toBe('fever_malaria_ng_v1');
    expect(action.category).toBe('track');
    expect(action.instruction.toLowerCase()).toMatch(/fever|started|changing/);
    expect(action.instruction.toLowerCase()).toMatch(/medicine/);
    expectSafeAction(action);
  });

  it('fever module recommends professional review when risk is elevated', () => {
    const action = resolveModuleFlowProposalAction(
      baseContext('fever_malaria_ng_v1', { riskLevel: 'high' }),
    );

    expect(action.actionId).toBe('follow_up_if_worse_or_persistent');
    expect(action.instruction.toLowerCase()).toMatch(/worsen|persist|care/);
    expectSafeAction(action);
  });

  it('headache module tracks onset and severity for routine cases', () => {
    const action = resolveModuleFlowProposalAction(baseContext('headache_ng_v1'));

    expect(action.category).toBe('track');
    expect(action.instruction.toLowerCase()).toMatch(/started|strong|severity/);
    expectSafeAction(action);
  });

  it('headache module prioritizes safety review when vision context is present', () => {
    const action = resolveModuleFlowProposalAction(
      baseContext('headache_ng_v1', {
        normalizedTerms: ['headache', 'blurry vision'],
      }),
    );

    expect(action.actionId).toBe('speak_to_health_professional_today');
    expect(action.instruction.toLowerCase()).toMatch(/professional|clinician|pharmacist/);
    expectSafeAction(action);
  });

  it('medication module prepares pharmacist summary without start/stop/change advice', () => {
    const action = resolveModuleFlowProposalAction(
      baseContext('medication_question_ng_v1', {
        normalizedTerms: ['medicine from chemist'],
      }),
    );

    expect(action.actionId).toBe('prepare_pharmacist_summary');
    expect(action.category).toBe('prepare');
    expect(action.instruction.toLowerCase()).toMatch(/medicine name|pharmacist/);
    expect(action.instruction.toLowerCase()).toMatch(/ask a pharmacist before mixing/);
    expectSafeAction(action);
  });

  it('medication module escalates for allergy or urgent reaction context', () => {
    const action = resolveModuleFlowProposalAction(
      baseContext('medication_question_ng_v1', {
        riskLevel: 'urgent',
        normalizedTerms: ['body itching after drug'],
      }),
    );

    expect(action.safetyLevel).toBe('urgent');
    expect(action.instruction.toLowerCase()).toMatch(/emergency|pharmacist|clinician/);
    expectSafeAction(action);
  });

  it('lab result module organizes test details without interpretation', () => {
    const action = resolveModuleFlowProposalAction(
      baseContext('lab_result_confusion_ng_v1', {
        normalizedTerms: ['widal test / lab slip concern'],
      }),
    );

    expect(action.actionId).toBe('ask_for_test_or_lab_context');
    expect(action.instruction.toLowerCase()).toMatch(/test name|date|symptom/);
    expect(action.instruction.toLowerCase()).toMatch(/clinician/);
    expect(action.reason.toLowerCase()).not.toMatch(/\byou have typhoid\b/);
    expectSafeAction(action);
  });

  it('clinic prep module prepares visit checklist and questions', () => {
    const action = resolveModuleFlowProposalAction(baseContext('clinic_pharmacy_prep_ng_v1'));

    expect(action.actionId).toBe('prepare_doctor_summary');
    expect(action.instruction.toLowerCase()).toMatch(/questions|visit|bring/);
    expectSafeAction(action);
  });

  it('nextBestActionPolicy re-exports the same module-aware flow action', () => {
    const context = serializeIntelligenceForFlowProposal(
      runHealthIntelligencePipeline({ rawText: 'my Widal is 1:160 do I have typhoid' }),
    );
    expect(resolveFlowProposalActionFromIntelligenceContext(context).actionId).toBe(
      resolveModuleFlowProposalAction(context).actionId,
    );
  });
});

describe('flow-proposal handler with intelligenceContext', () => {
  it('uses module-aware action instead of generic client proposedAction when context is present', async () => {
    const intelligenceContext = serializeIntelligenceForFlowProposal(
      runHealthIntelligencePipeline({
        rawText: 'my body hot since yesterday and took malaria drug',
      }),
    );

    const action = resolveModuleFlowProposalAction(intelligenceContext);
    expect(action.title).not.toBe('Generic client step');
    expect(action.instruction).not.toBe('Generic client instruction.');
    expect(action.primaryModuleId).toBe('fever_malaria_ng_v1');
  });
});
