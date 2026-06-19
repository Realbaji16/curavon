import { beforeEach, describe, expect, it } from 'vitest';
import { AUTH_SESSION_KEYS } from '../lib/data/storageKeys';
import { deleteAllHealthData } from '../lib/data/dataDeletion';
import { exportCuravonData } from '../lib/data/dataExport';
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
import {
  ACTIVITY_INSIGHTS_STORAGE_KEY,
  saveActivityInsights,
} from '../lib/activityInsights/activityInsightStorage';
import { refreshActivityInsights } from '../lib/activityInsights/activityInsightEngine';
import { META_STORAGE_KEYS } from '../utils/metaSystem';
import { safeWrite } from '../utils/healthStorage';
import { clearLocalStorage } from './testUtils';
import type { ActivityInsight, ActivityInsightInputSummary } from '../types/activityInsights';

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

describe('activity insights delete scope', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('removes curavon_meta_activity_insights on delete health data', () => {
    saveActivityInsights([
      {
        id: 'test-1',
        type: 'data_quality',
        title: 'Test',
        body: 'Test body',
        tone: 'neutral',
        evidence: [],
        createdAt: new Date().toISOString(),
        source: 'rules',
        safetyLabel: 'not_medical',
      },
    ]);
    expect(localStorage.getItem(ACTIVITY_INSIGHTS_STORAGE_KEY)).not.toBeNull();

    deleteAllHealthData('local-test-user');

    expect(localStorage.getItem(ACTIVITY_INSIGHTS_STORAGE_KEY)).toBeNull();
  });

  it('removes curavon_meta_* keys and keeps auth session keys', () => {
    safeWrite(META_STORAGE_KEYS.actionOutcomes, []);
    safeWrite(ACTIVITY_INSIGHTS_STORAGE_KEY, { insights: [] });
    for (const key of AUTH_SESSION_KEYS) {
      safeWrite(key, { test: true });
    }

    deleteAllHealthData('local-test-user');

    expect(localStorage.getItem(META_STORAGE_KEYS.actionOutcomes)).toBeNull();
    expect(localStorage.getItem(ACTIVITY_INSIGHTS_STORAGE_KEY)).toBeNull();
    for (const key of AUTH_SESSION_KEYS) {
      expect(localStorage.getItem(key)).not.toBeNull();
    }
  });
});

describe('buildActivityInsightInputSummary', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('compresses meta events into counts without raw prompts', () => {
    const now = new Date().toISOString();
    safeWrite(META_STORAGE_KEYS.actionOutcomes, [
      { id: '1', status: 'blocked', category: 'movement', createdAt: now },
      { id: '2', status: 'blocked', category: 'movement', createdAt: now },
      { id: '3', status: 'done', category: 'rest', createdAt: now },
    ]);
    safeWrite(META_STORAGE_KEYS.flowBehavior, [
      { id: 'f1', flowId: 'breathing-guide', event: 'abandon', createdAt: now },
    ]);
    safeWrite(META_STORAGE_KEYS.safetyEvents, [
      {
        id: 's1',
        source: 'ask',
        eventType: 'red_flag_trigger',
        severity: 'medium',
        signal: 'breathing concern',
        createdAt: now,
      },
    ]);

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
    clearLocalStorage();
  });

  it('drops invalid AI output and keeps safe rule insights', async () => {
    const now = new Date().toISOString();
    safeWrite(META_STORAGE_KEYS.actionOutcomes, [
      { id: '1', status: 'blocked', createdAt: now },
      { id: '2', status: 'blocked', createdAt: now },
    ]);

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
        createdAt: now,
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
        createdAt: now,
        source: 'ai',
        safetyLabel: 'not_medical',
      },
    ];

    const safeAi = filterSafeActivityInsights(aiCandidates);
    expect(safeAi.some((i) => /anxiety|disorder/i.test(i.body))).toBe(false);
    expect(safeAi.some((i) => i.title === 'Shorter next steps may work better')).toBe(true);
  });
});

describe('activity insights export', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('includes user-readable activityInsights in export payload', () => {
    saveActivityInsights([
      {
        id: 'exp-1',
        type: 'check_in_pattern',
        title: 'You’re building useful context',
        body: 'Recent check-ins help Curavon suggest safer next actions.',
        tone: 'encouraging',
        evidence: ['Check-ins were completed on 4 days last 14 days.'],
        createdAt: new Date().toISOString(),
        source: 'rules',
        safetyLabel: 'not_medical',
      },
    ]);

    const payload = exportCuravonData('test-user');
    expect(payload.activityInsights).toBeDefined();
    const exported = JSON.stringify(payload.activityInsights);
    expect(exported).toContain('You’re building useful context');
    expect(exported).not.toMatch(/raw prompt|model response/i);
  });
});

describe('summaryHasMeaningfulActivity', () => {
  it('returns false for empty summary', () => {
    expect(summaryHasMeaningfulActivity(sparseSummary())).toBe(false);
  });
});
