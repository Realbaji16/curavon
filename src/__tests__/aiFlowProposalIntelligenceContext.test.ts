import { describe, expect, it } from 'vitest';
import {
  parseFlowProposalBody,
  parseFlowProposalIntelligenceContext,
} from '../lib/server/aiRouteGuards';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
import { serializeIntelligenceForFlowProposal } from '../lib/health-intelligence/services/intelligenceContextSerializer';

const STRUCTURED_BASE = {
  concernSummary: {
    concernType: 'Physical symptom',
    timeline: 'A few days',
    goal: 'One next step',
  },
  safetyResult: {
    safetyCheckText: 'Mild headache and fatigue for a few days',
  },
  proposedAction: {
    title: 'Track symptoms',
    instruction: 'Write down when symptoms started and what changed.',
    reason: 'Organize notes first.',
    category: 'track',
    safetyLevel: 'normal',
  },
};

function validIntelligenceContext() {
  return serializeIntelligenceForFlowProposal(
    runHealthIntelligencePipeline({
      rawText: 'my body hot since yesterday and took malaria drug',
    }),
  );
}

describe('parseFlowProposalIntelligenceContext', () => {
  it('accepts valid derived intelligence context', () => {
    const parsed = parseFlowProposalIntelligenceContext(validIntelligenceContext());
    expect(parsed?.selectedModules).toContain('fever_malaria_ng_v1');
    expect(parsed?.primaryModuleId).toBe('fever_malaria_ng_v1');
    expect(parsed?.questionCount).toBeGreaterThan(0);
  });

  it('ignores invalid intelligence context shapes', () => {
    expect(parseFlowProposalIntelligenceContext(null)).toBeUndefined();
    expect(parseFlowProposalIntelligenceContext({ rawText: 'secret concern' })).toBeUndefined();
    expect(
      parseFlowProposalIntelligenceContext({
        ...validIntelligenceContext(),
        selectedModules: ['not_a_real_module'],
      }),
    ).toBeUndefined();
    expect(
      parseFlowProposalIntelligenceContext({
        ...validIntelligenceContext(),
        riskLevel: 'critical',
      }),
    ).toBeUndefined();
    expect(
      parseFlowProposalIntelligenceContext({
        ...validIntelligenceContext(),
        questionCount: 'three',
      }),
    ).toBeUndefined();
  });
});

describe('parseFlowProposalBody intelligenceContext', () => {
  it('parses structured body with valid intelligenceContext', () => {
    const intelligenceContext = validIntelligenceContext();
    const parsed = parseFlowProposalBody({
      ...STRUCTURED_BASE,
      intelligenceContext,
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.kind).toBe('structured');
      if (parsed.data.kind === 'structured') {
        expect(parsed.data.intelligenceContext).toEqual(intelligenceContext);
      }
    }
  });

  it('ignores invalid intelligenceContext without failing the request', () => {
    const parsed = parseFlowProposalBody({
      ...STRUCTURED_BASE,
      intelligenceContext: {
        selectedModules: ['unknown_module'],
        primaryModuleId: null,
        riskLevel: 'low',
        normalizedTerms: [],
        questionCount: 1,
        summaryFieldIds: [],
        allowedActionIds: [],
      },
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.data.kind === 'structured') {
      expect(parsed.data.intelligenceContext).toBeUndefined();
    }
  });

  it('still parses structured body when intelligenceContext is missing', () => {
    const parsed = parseFlowProposalBody(STRUCTURED_BASE);

    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.data.kind === 'structured') {
      expect(parsed.data.intelligenceContext).toBeUndefined();
      expect(parsed.data.concernSummary.concernType).toBe('Physical symptom');
    }
  });
});
