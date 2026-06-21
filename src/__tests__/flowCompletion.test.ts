import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FLOW_CARDS } from '../data/guides/flowCatalog';
import { FLOW_RUNNERS } from '../data/guides/flowRunners';
import {
  buildFlowConcernSummary,
  completeFlowCompletion,
  getFlowCompletionBlockReason,
  mapGuidePlanToPlanAction,
} from '../lib/guides/flowCompletion';
import { loadGuideResults, resetGuideResultsCacheForTests, saveGuideResult } from '../utils/guideResultStorage';
import { loadMetaFlowBehavior, resetMetaSystemForTests } from '../utils/metaSystem';

const mockGenerateCuravonNextAction = vi.fn();
const mockScheduleFollowUpForAction = vi.fn();
const mockAddFromFlow = vi.fn();
const mockRefreshHealthSnapshot = vi.fn();

vi.mock('../lib/plan/nextActionAdapter', () => ({
  generateCuravonNextAction: (...args: unknown[]) => mockGenerateCuravonNextAction(...args),
}));

vi.mock('../lib/followUp/followUpScheduler', () => ({
  scheduleFollowUpForAction: (...args: unknown[]) => mockScheduleFollowUpForAction(...args),
}));

vi.mock('../utils/metaSystem', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/metaSystem')>();
  return {
    ...actual,
    runMetaSystemCycle: vi.fn(),
  };
});

const flow = FLOW_CARDS[0];
const runner = FLOW_RUNNERS[flow.id];
const safeAnswers = {
  noticeable: 'Low energy',
  duration: 'Today',
  intensity: 4,
  worse: 'nothing',
  urgent: ['None of these'],
};

const baseInput = {
  flow,
  runner,
  answers: safeAnswers,
  flowUrgentTerminal: false,
  privacyLevel: 'private' as const,
  acceptanceSource: 'guide_completed' as const,
  healthSnapshot: null,
  nextActionState: null,
  healthProfile: null,
  addFromFlow: mockAddFromFlow,
  refreshHealthSnapshot: mockRefreshHealthSnapshot,
};

describe('flowCompletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetGuideResultsCacheForTests();
    resetMetaSystemForTests();
    mockGenerateCuravonNextAction.mockResolvedValue({
      actionId: 'guide-v2-test-action',
      title: 'One small step',
      actionText: 'Write down what changed today',
      reason: 'Organize your notes',
      category: 'track',
      safetyLevel: 'normal',
      sourceSignals: ['guide_completion'],
      selectedBy: 'rules',
      aiReasoned: false,
      fallbackUsed: true,
      followUpPrompt: 'How did it go?',
      watchFor: 'Timing shifts',
    });
    mockScheduleFollowUpForAction.mockReturnValue({
      status: 'created',
      record: { id: 'fup-guide-test-1' },
    });
  });

  it('blocks completion when urgent terminal is active', async () => {
    const result = await completeFlowCompletion({
      ...baseInput,
      flowUrgentTerminal: true,
    });

    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toBe('urgent_terminal');
    }
    expect(mockGenerateCuravonNextAction).not.toHaveBeenCalled();
    expect(mockAddFromFlow).not.toHaveBeenCalled();
    expect(loadGuideResults()).toHaveLength(0);
  });

  it('blocks completion when urgent answers are present', async () => {
    const result = await completeFlowCompletion({
      ...baseInput,
      answers: { ...safeAnswers, urgent: ['Chest pain'] },
    });

    expect(result.status).toBe('blocked');
    if (result.status === 'blocked') {
      expect(result.reason).toBe('urgent_answers');
    }
    expect(mockGenerateCuravonNextAction).not.toHaveBeenCalled();
    expect(mockScheduleFollowUpForAction).not.toHaveBeenCalled();
  });

  it('saves guide result and doctor summary on safe completion', async () => {
    const result = await completeFlowCompletion(baseInput);

    expect(result.status).toBe('success');
    expect(mockGenerateCuravonNextAction).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'guides',
        currentConcern: expect.stringContaining('Low energy'),
      }),
    );
    expect(loadGuideResults()).toHaveLength(1);
    expect(loadGuideResults()[0]?.guideId).toBe(flow.id);
    expect(mockAddFromFlow).toHaveBeenCalledWith(
      expect.objectContaining({
        title: flow.title,
        nextStep: 'Write down what changed today',
      }),
    );
    expect(loadMetaFlowBehavior().some((entry) => entry.event === 'complete')).toBe(true);
  });

  it('schedules follow-up with acceptanceSource guide_completed', async () => {
    await completeFlowCompletion(baseInput);

    expect(mockScheduleFollowUpForAction).toHaveBeenCalledWith(
      expect.objectContaining({
        acceptanceSource: 'guide_completed',
        context: { guideId: flow.id },
      }),
    );
  });

  it('returns typed success metadata', async () => {
    const result = await completeFlowCompletion(baseInput);

    expect(result).toMatchObject({
      status: 'success',
      nextActionId: 'guide-v2-test-action',
      followUpId: 'fup-guide-test-1',
      planAction: expect.objectContaining({
        id: 'test-action',
        actionText: 'Write down what changed today',
      }),
    });
  });

  it('uses flow title instead of raw answers for sensitive privacy level', () => {
    const answerMap = {
      'What feels most noticeable right now?': 'Chest pain',
    };
    expect(buildFlowConcernSummary(flow, answerMap, 'sensitive')).toBe(flow.title);
    expect(buildFlowConcernSummary(flow, answerMap, 'private')).toContain('Chest pain');
  });

  it('does not pass raw sensitive answers into plan concern summary', async () => {
    await completeFlowCompletion({
      ...baseInput,
      privacyLevel: 'sensitive',
      answers: { ...safeAnswers, noticeable: 'private symptom detail' },
    });

    expect(mockGenerateCuravonNextAction).toHaveBeenCalledWith(
      expect.objectContaining({
        currentConcern: flow.title,
        intakeResult: expect.objectContaining({
          concern: flow.title,
        }),
      }),
    );
  });

  it('returns safe error when completion side effects fail', async () => {
    mockRefreshHealthSnapshot.mockImplementationOnce(() => {
      throw new Error('refresh failed');
    });

    const result = await completeFlowCompletion(baseInput);

    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.safeMessage).toMatch(/could not be saved safely/i);
    }
    expect(mockAddFromFlow).not.toHaveBeenCalled();
    expect(mockScheduleFollowUpForAction).not.toHaveBeenCalled();
  });

  it('maps guide plan output to plan action', () => {
    const mapped = mapGuidePlanToPlanAction({
      actionId: 'guide-v2-abc',
      title: 'Step',
      actionText: 'Do one thing',
      reason: 'Because',
      category: 'track',
      safetyLevel: 'normal',
      sourceSignals: [],
      selectedBy: 'rules',
      aiReasoned: false,
      fallbackUsed: false,
      followUpPrompt: '',
      watchFor: '',
      relatedGuideFlowId: 'something-feels-off',
      safetyOverride: false,
      planEngineReason: 'canonical_v3',
    });
    expect(mapped.id).toBe('abc');
  });

  it('detects block reasons for urgent states', () => {
    expect(getFlowCompletionBlockReason(true, safeAnswers, runner)).toBe('urgent_terminal');
    expect(
      getFlowCompletionBlockReason(false, { ...safeAnswers, urgent: ['Chest pain'] }, runner),
    ).toBe('urgent_answers');
    expect(getFlowCompletionBlockReason(false, safeAnswers, runner)).toBeNull();
  });
});

describe('saveGuideResult integration', () => {
  beforeEach(() => {
    resetGuideResultsCacheForTests();
  });

  it('persists guide result records through storage helper', () => {
    saveGuideResult({
      guideId: 'headache',
      guideTitle: 'Headache',
      completedAt: '2026-01-01T00:00:00.000Z',
      resultSummary: 'Mild headache',
      safeNextStep: 'Track timing',
      safetyLevel: 'normal',
      sourceSignals: [],
    });
    expect(loadGuideResults()).toHaveLength(1);
  });
});
