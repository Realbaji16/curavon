import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextActionState } from '../types/health';
import type { PlanEngineInput, PlanEngineV3Result } from '../lib/plan/planTypes';
import {
  PLAN_V3_CACHE,
  PLAN_V3_CACHE_MAX_ENTRIES,
  PLAN_V3_CACHE_SAFETY_TTL_MS,
  PLAN_V3_CACHE_TTL_MS,
  getPlanV3CacheEntry,
  prunePlanV3Cache,
  resetPlanV3CacheForTests,
  setPlanV3CacheEntry,
  shouldCachePlanV3Result,
} from '../lib/plan/planEngineV3Cache';

const baseInput: PlanEngineInput = {
  snapshot: null,
  intakeResult: null,
  latestCheckIn: null,
  askHistory: [],
  guideHistory: [],
  nextActionState: null,
  redFlagLogs: [],
  profile: null,
  currentConcern: 'mild headache',
  sourceSignals: [],
};

const urgentCurrentState: NextActionState = {
  currentAction: 'Review urgent-support notes before any self-care step.',
  title: 'Review urgent-support notes',
  reason: 'Safety path active.',
  source: "Today's Check-In",
  status: 'pending',
  category: 'escalate',
  safetyLevel: 'urgent',
  actionId: 'plan-urgent-existing',
  updatedAt: new Date().toISOString(),
};

const normalResult: PlanEngineV3Result = {
  action: {
    id: 'cand-stabilize-hydrate',
    title: 'Hydrate gently',
    actionText: 'Drink a glass of water and pause for one minute.',
    reason: 'Low-risk stabilizing step.',
    category: 'stabilize',
    safetyLevel: 'normal',
    followUpPrompt: 'How did this step go?',
    watchFor: 'Any noticeable change.',
    sourceSignals: [],
    selectedBy: 'rules',
    aiReasoned: false,
    fallbackUsed: true,
    aiSynthesized: false,
    boundaryValidated: true,
  },
  reasoningResult: {
    selectedCandidateId: 'cand-stabilize-hydrate',
    reasoning: 'Safe baseline.',
    whyNotOthers: 'Deterministic.',
    followUpPrompt: 'How did this step go?',
    watchFor: 'Any noticeable change.',
    confidence: 'medium',
    fallbackUsed: true,
    aiUsed: false,
  },
  candidates: [],
  safetyOverride: false,
};

describe('planEngineV3 cache TTL', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-18T12:00:00.000Z'));
    resetPlanV3CacheForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetPlanV3CacheForTests();
  });

  it('returns cache hit before TTL expires', () => {
    setPlanV3CacheEntry('plan-v3-1', baseInput, normalResult);
    vi.advanceTimersByTime(PLAN_V3_CACHE_TTL_MS - 1_000);

    expect(getPlanV3CacheEntry('plan-v3-1', baseInput)?.action.id).toBe('cand-stabilize-hydrate');
  });

  it('misses cache after TTL expires and deletes expired entry', () => {
    setPlanV3CacheEntry('plan-v3-1', baseInput, normalResult);
    vi.advanceTimersByTime(PLAN_V3_CACHE_TTL_MS + 1);

    expect(getPlanV3CacheEntry('plan-v3-1', baseInput)).toBeNull();
    expect(PLAN_V3_CACHE.has('plan-v3-1')).toBe(false);
  });

  it('prunePlanV3Cache removes expired entries', () => {
    setPlanV3CacheEntry('plan-v3-1', baseInput, normalResult);
    setPlanV3CacheEntry('plan-v3-2', baseInput, normalResult);
    vi.advanceTimersByTime(PLAN_V3_CACHE_TTL_MS + 1);

    expect(prunePlanV3Cache()).toBe(2);
    expect(PLAN_V3_CACHE.size).toBe(0);
  });

  it('does not cache urgent safety override results', () => {
    const urgentResult: PlanEngineV3Result = {
      ...normalResult,
      safetyOverride: true,
      action: {
        ...normalResult.action,
        category: 'escalate',
        safetyLevel: 'urgent',
      },
    };

    expect(shouldCachePlanV3Result(baseInput, urgentResult)).toBe(false);
    setPlanV3CacheEntry('plan-v3-urgent', baseInput, urgentResult);
    expect(PLAN_V3_CACHE.size).toBe(0);
  });

  it('uses shorter TTL for safety-sensitive input', () => {
    const sensitiveInput: PlanEngineInput = {
      ...baseInput,
      redFlagLogs: [
        {
          id: 'rf-1',
          source: 'ask',
          matchedConcern: 'chest pain',
          userText: 'chest pain',
          guidanceShown: 'Seek urgent care',
          createdAt: new Date().toISOString(),
        },
      ],
    };

    setPlanV3CacheEntry('plan-v3-sensitive', sensitiveInput, normalResult);
    const entry = PLAN_V3_CACHE.get('plan-v3-sensitive');
    expect(entry?.expiresAt).toBe(Date.now() + PLAN_V3_CACHE_SAFETY_TTL_MS);
  });

  it('drops stale cache when input becomes safety-sensitive', () => {
    setPlanV3CacheEntry('plan-v3-1', baseInput, normalResult);
    const sensitiveInput: PlanEngineInput = {
      ...baseInput,
      currentConcern: 'severe chest pain and trouble breathing',
    };

    expect(getPlanV3CacheEntry('plan-v3-1', sensitiveInput)).toBeNull();
    expect(PLAN_V3_CACHE.has('plan-v3-1')).toBe(false);
  });

  it('does not return cached action when current action is urgent', () => {
    setPlanV3CacheEntry('plan-v3-1', baseInput, normalResult);
    const inputWithUrgentCurrent: PlanEngineInput = {
      ...baseInput,
      nextActionState: urgentCurrentState,
    };

    expect(getPlanV3CacheEntry('plan-v3-1', inputWithUrgentCurrent)).toBeNull();
    expect(PLAN_V3_CACHE.has('plan-v3-1')).toBe(false);
  });

  it('rejects disallowed action text on write and read', () => {
    const badResult: PlanEngineV3Result = {
      ...normalResult,
      action: {
        ...normalResult.action,
        actionText: 'Start taking medication for this symptom today.',
      },
    };

    setPlanV3CacheEntry('plan-v3-bad', baseInput, badResult);
    expect(PLAN_V3_CACHE.has('plan-v3-bad')).toBe(false);

    PLAN_V3_CACHE.set('plan-v3-bad', {
      result: badResult,
      createdAt: Date.now(),
      expiresAt: Date.now() + PLAN_V3_CACHE_TTL_MS,
    });
    expect(getPlanV3CacheEntry('plan-v3-bad', baseInput)).toBeNull();
    expect(PLAN_V3_CACHE.has('plan-v3-bad')).toBe(false);
  });

  it('enforces a simple max entry cap by evicting oldest entries', () => {
    const now = Date.now();
    for (let i = 0; i < PLAN_V3_CACHE_MAX_ENTRIES + 5; i += 1) {
      setPlanV3CacheEntry(`plan-v3-${i}`, baseInput, normalResult, now + i);
    }

    expect(PLAN_V3_CACHE.size).toBeLessThanOrEqual(PLAN_V3_CACHE_MAX_ENTRIES);
    expect(PLAN_V3_CACHE.has('plan-v3-0')).toBe(false);
    expect(PLAN_V3_CACHE.has(`plan-v3-${PLAN_V3_CACHE_MAX_ENTRIES + 4}`)).toBe(true);
  });
});
