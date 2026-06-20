import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildActivityInsightInputSummary,
  summaryHasMeaningfulActivity,
} from '../lib/activityInsights/activityInsightSummary';
import { generateRuleActivityInsights } from '../lib/activityInsights/ruleActivityInsights';
import {
  filterSafeActivityInsights,
  isActivityInsightSafe,
  sanitizeActivityInsightCandidate,
} from '../lib/activityInsights/activityInsightGuards';
import { resetActivityInsightStoreCacheForTests } from '../lib/activityInsights/activityInsightStorage';
import { refreshActivityInsights } from '../lib/activityInsights/activityInsightEngine';
import {
  collectActionOutcome,
  collectFlowBehavior,
  collectSafetyEvent,
  resetMetaSystemForTests,
} from '../utils/metaSystem';
import type { ActivityInsight, ActivityInsightInputSummary } from '../types/activityInsights';
import { createDefaultHealthProfile } from '../utils/healthUtils';

vi.mock('../lib/data/coreHealthDataService', () => ({
  loadCoreHealthData: vi.fn(async () => ({
    healthProfile: createDefaultHealthProfile(),
    dailyCheckins: [],
    nextActionState: null,
    askHistory: [],
    error: null,
  })),
}));

vi.mock('../lib/data/productDataService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/data/productDataService')>();
  return {
    ...actual,
    fetchUserPreference: vi.fn(async () => ({})),
    fetchActivityInsightStore: vi.fn(async () => ({
      insights: [],
      ruleGeneratedAt: null,
      lastAiRunAt: null,
      summaryHash: null,
    })),
    saveActivityInsightStoreRecord: vi.fn(async () => undefined),
  };
});

function sparseSummary(): ActivityInsightInputSummary {
  return {
    dateRange: 'Last 14 days',
    actionOutcomes: { completed: 0, blocked: 0, worse: 0, skipped: 0 },
    flowStats: { started: 0, completed: 0, abandoned: 0 },
    checkInStats: { count: 0 },
    safetyStats: { redFlagCount: 0, sources: [] },
    repeatedBlockers: [],
    commonFocusAreas: [],
    followUpPatterns: [],
    guidePatterns: [],
  };
}

describe('buildActivityInsightInputSummary', () => {
  beforeEach(() => {
    resetMetaSystemForTests();
  });

  it('compresses meta events into counts without raw prompts', () => {
    collectActionOutcome({ status: 'blocked', category: 'movement' });
    collectActionOutcome({ status: 'blocked', category: 'movement' });
    collectActionOutcome({ status: 'done', category: 'rest' });
    collectFlowBehavior({ flowId: 'breathing-guide', event: 'abandon' });
    collectSafetyEvent({
      source: 'ask',
      eventType: 'red_flag_trigger',
      severity: 'medium',
      signal: 'breathing concern',
    });

    const summary = buildActivityInsightInputSummary();
    const serialized = JSON.stringify(summary);

    expect(summary.actionOutcomes.blocked).toBe(2);
    expect(summary.flowStats.abandoned).toBe(1);
    expect(summary.safetyStats.redFlagCount).toBe(1);
    expect(serialized).not.toMatch(/raw prompt|model response|system prompt/i);
    expect(serialized.length).toBeLessThan(1200);
  });
});

describe('generateRuleActivityInsights', () => {
  it('maps blocked actions to smaller steps insight', () => {
    const summary = sparseSummary();
    summary.actionOutcomes.blocked = 3;
    const insights = generateRuleActivityInsights(summary);
    expect(insights.some((i) => i.title === 'Smaller steps may work better')).toBe(true);
  });

  it('maps abandoned guides to shorter guide insight', () => {
    const summary = sparseSummary();
    summary.flowStats.abandoned = 1;
    summary.guidePatterns = ['1 guide stopped before the final step'];
    const insights = generateRuleActivityInsights(summary);
    expect(insights.some((i) => i.title === 'A shorter guide may help')).toBe(true);
  });

  it('maps red flags to safety note insight', () => {
    const summary = sparseSummary();
    summary.safetyStats.redFlagCount = 1;
    summary.safetyStats.sources = ['ask'];
    const insights = generateRuleActivityInsights(summary);
    expect(insights.some((i) => i.title === 'A safety note was saved')).toBe(true);
  });

  it('maps sparse data to more context insight', () => {
    const insights = generateRuleActivityInsights(sparseSummary());
    expect(insights.some((i) => i.title === 'Curavon needs a little more context')).toBe(true);
  });
});

describe('activityInsightGuards', () => {
  const safeInsight: ActivityInsight = {
    id: 'safe-1',
    type: 'action_pattern',
    title: 'Smaller steps may work better',
    body: 'Curavon can make future next steps lighter. This is not a diagnosis.',
    tone: 'encouraging',
    evidence: ['2 actions were marked blocked this week.'],
    createdAt: new Date().toISOString(),
    source: 'rules',
    safetyLabel: 'not_medical',
  };

  it('accepts safe user-facing activity insight', () => {
    expect(isActivityInsightSafe(safeInsight)).toBe(true);
  });

  it('rejects diagnosis language', () => {
    expect(
      isActivityInsightSafe({
        ...safeInsight,
        body: 'This may be a diagnosis of a disorder.',
      }),
    ).toBe(false);
  });

  it('rejects you have / you may have phrasing', () => {
    expect(
      sanitizeActivityInsightCandidate(
        { ...safeInsight, title: 'You may have depression', type: 'action_pattern' },
        'ai',
      ),
    ).toBeNull();
  });

  it('rejects medication advice', () => {
    expect(
      isActivityInsightSafe({
        ...safeInsight,
        body: 'Take medication daily for better results.',
      }),
    ).toBe(false);
  });

  it('rejects no need to see doctor reassurance', () => {
    expect(
      isActivityInsightSafe({
        ...safeInsight,
        body: 'There is no need to see a doctor about this.',
      }),
    ).toBe(false);
  });
});

describe('AI activity insight fallback', () => {
  beforeEach(() => {
    resetMetaSystemForTests();
    resetActivityInsightStoreCacheForTests();
  });

  it('drops invalid AI output and keeps safe rule insights', async () => {
    collectActionOutcome({ status: 'blocked' });
    collectActionOutcome({ status: 'blocked' });

    const ruleInsights = await refreshActivityInsights({ forceAi: false, safetyLevel: 'normal' });
    expect(ruleInsights.some((i) => i.title === 'Smaller steps may work better')).toBe(true);

    const aiCandidates: ActivityInsight[] = [
      {
        id: 'ai-bad-1',
        type: 'action_pattern',
        title: 'You may have anxiety',
        body: 'Your blocked steps suggest a disorder.',
        tone: 'neutral',
        evidence: ['blocked actions'],
        createdAt: new Date().toISOString(),
        source: 'ai',
        safetyLabel: 'not_medical',
      },
      {
        id: 'ai-good-1',
        type: 'action_pattern',
        title: 'Shorter next steps may work better',
        body: 'Curavon can make future next steps lighter based on recent blocked steps.',
        tone: 'encouraging',
        evidence: ['2 actions were marked blocked this week.'],
        createdAt: new Date().toISOString(),
        source: 'ai',
        safetyLabel: 'not_medical',
      },
    ];

    const safeAi = filterSafeActivityInsights(aiCandidates);
    expect(safeAi.some((i) => /anxiety|disorder/i.test(i.body))).toBe(false);
    expect(safeAi.some((i) => i.title === 'Shorter next steps may work better')).toBe(true);
  });
});

describe('summaryHasMeaningfulActivity', () => {
  it('returns false for empty summary', () => {
    expect(summaryHasMeaningfulActivity(sparseSummary())).toBe(false);
  });
});
