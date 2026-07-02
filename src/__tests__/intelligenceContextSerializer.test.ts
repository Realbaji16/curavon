import { describe, expect, it } from 'vitest';
import {
  assertFlowProposalIntelligenceContextSafe,
  serializeIntelligenceForFlowProposal,
  type FlowProposalIntelligenceContext,
} from '../lib/health-intelligence/services/intelligenceContextSerializer';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { validateHealthIntelligenceResponse } from '../lib/health-intelligence/services/responseSafetyValidator';

const EXPECTED_TOP_LEVEL_KEYS = [
  'allowedActionIds',
  'normalizedTerms',
  'primaryModuleId',
  'questionCount',
  'riskLevel',
  'selectedModules',
  'summaryFieldIds',
] as const;

function sampleIntelligence() {
  return runHealthIntelligencePipeline({
    rawText: 'my body hot since yesterday and took malaria drug',
  });
}

describe('serializeIntelligenceForFlowProposal', () => {
  it('does not include rawText or other unsafe source fields', () => {
    const intelligence = sampleIntelligence();
    const serialized = serializeIntelligenceForFlowProposal(intelligence);

    expect(serialized).not.toHaveProperty('rawText');
    expect(serialized).not.toHaveProperty('message');
    expect(serialized).not.toHaveProperty('questions');
    expect(serialized).not.toHaveProperty('nextStep');
    expect(serialized).not.toHaveProperty('redFlags');
    expect(serialized).not.toHaveProperty('summaryPreview');
    expect(serialized).not.toHaveProperty('allowedActions');
    expect(Object.keys(serialized).sort()).toEqual([...EXPECTED_TOP_LEVEL_KEYS].sort());
    expect(() => assertFlowProposalIntelligenceContextSafe(serialized)).not.toThrow();
  });

  it('preserves selected module ids in routing order', () => {
    const intelligence = sampleIntelligence();
    const serialized = serializeIntelligenceForFlowProposal(intelligence);

    expect(serialized.selectedModules).toEqual(
      intelligence.selectedModules.map((module) => module.moduleId),
    );
    expect(serialized.selectedModules.length).toBeGreaterThan(0);
  });

  it('preserves allowed action ids from module-approved actions', () => {
    const intelligence = sampleIntelligence();
    const serialized = serializeIntelligenceForFlowProposal(intelligence);
    const expectedIds = intelligence.allowedActions.map((action) => action.id);

    expect(serialized.allowedActionIds).toEqual(expectedIds);
    expect(serialized.allowedActionIds.length).toBeGreaterThan(0);
  });

  it('preserves summary field ids from the summary preview', () => {
    const intelligence = sampleIntelligence();
    const serialized = serializeIntelligenceForFlowProposal(intelligence);

    expect(serialized.summaryFieldIds).toEqual(
      intelligence.summaryPreview.fields.map((field) => field.fieldId),
    );
    expect(serialized.summaryFieldIds.length).toBeGreaterThan(0);
  });

  it('produces JSON-safe session payload metadata without response text', () => {
    const intelligence = sampleIntelligence();
    const serialized = serializeIntelligenceForFlowProposal(intelligence);
    const roundTrip = JSON.parse(JSON.stringify(serialized)) as FlowProposalIntelligenceContext;

    expect(roundTrip).toEqual(serialized);
    expect(roundTrip.primaryModuleId).toBe(intelligence.primaryModuleId);
    expect(roundTrip.riskLevel).toBe(intelligence.riskLevel);
    expect(roundTrip.questionCount).toBe(intelligence.questions.length);
    expect(roundTrip.normalizedTerms).toEqual(intelligence.normalizedTerms);

    const blob = JSON.stringify(serialized).toLowerCase();
    expect(blob).not.toMatch(/\bmessage\b/);
    expect(blob).not.toMatch(/\bprompt\b/);
    expect(validateHealthIntelligenceResponse(blob).allowed).toBe(true);
  });
});
