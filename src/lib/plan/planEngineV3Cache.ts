/**
 * In-memory session cache for Plan Engine v3 results.
 *
 * - TTL-limited (see PLAN_V3_CACHE_TTL_MS)
 * - Never bypasses safety boundaries on read
 * - Does not cache urgent/safety-blocked outputs
 * - Cached actions are proposals only; urgent current actions are never replaced from cache
 */
import { detectUrgentConcern } from '../../utils/healthSafety';
import { containsDisallowedActionText } from './planActionBoundaries';
import { isUrgentFromContext } from './planGuards';
import type { PlanEngineInput, PlanEngineV3Result } from './planTypes';

/** Default session cache lifetime for normal plan entries. */
export const PLAN_V3_CACHE_TTL_MS = 30 * 60 * 1000;

/** Shorter TTL when context includes caution-level or red-flag signals. */
export const PLAN_V3_CACHE_SAFETY_TTL_MS = 5 * 60 * 1000;

/** Simple upper bound to prevent unbounded in-memory growth per session. */
export const PLAN_V3_CACHE_MAX_ENTRIES = 64;

export type PlanV3CacheEntry = {
  result: PlanEngineV3Result;
  createdAt: number;
  expiresAt: number;
};

export const PLAN_V3_CACHE = new Map<string, PlanV3CacheEntry>();

export function isSafetySensitivePlanInput(input: PlanEngineInput): boolean {
  const concernText = input.currentConcern ?? input.intakeResult?.concern ?? '';
  return (
    isUrgentFromContext(input) ||
    detectUrgentConcern(concernText).hasUrgent ||
    Boolean(input.snapshot?.riskSignals.repeatedRedFlags) ||
    (input.redFlagLogs?.length ?? 0) > 0 ||
    input.snapshot?.riskSignals.increasingSymptomFrequency === true
  );
}

export function hasUrgentCurrentAction(input: PlanEngineInput): boolean {
  const state = input.nextActionState;
  if (!state?.currentAction?.trim()) return false;
  return state.safetyLevel === 'urgent' || state.category === 'escalate';
}

export function resolvePlanV3CacheTtlMs(input: PlanEngineInput, result: PlanEngineV3Result): number {
  if (isSafetySensitivePlanInput(input)) return PLAN_V3_CACHE_SAFETY_TTL_MS;
  if (result.action.safetyLevel === 'caution') return PLAN_V3_CACHE_SAFETY_TTL_MS;
  return PLAN_V3_CACHE_TTL_MS;
}

export function shouldCachePlanV3Result(input: PlanEngineInput, result: PlanEngineV3Result): boolean {
  if (result.safetyOverride) return false;
  if (result.action.safetyLevel === 'urgent') return false;
  if (result.action.category === 'escalate') return false;
  if (isSafetySensitivePlanInput(input) && result.action.safetyLevel !== 'normal') return false;
  const actionText = `${result.action.actionText} ${result.action.title} ${result.action.reason}`;
  if (containsDisallowedActionText(actionText)) return false;
  return true;
}

export function isPlanV3CacheEntryValid(entry: PlanV3CacheEntry, now = Date.now()): boolean {
  return entry.expiresAt > now;
}

export function validateCachedPlanV3Result(
  input: PlanEngineInput,
  result: PlanEngineV3Result,
): boolean {
  if (isSafetySensitivePlanInput(input)) return false;
  if (hasUrgentCurrentAction(input)) return false;
  const actionText = `${result.action.actionText} ${result.action.title} ${result.action.reason}`;
  if (containsDisallowedActionText(actionText)) return false;
  return true;
}

/** Remove expired cache entries; returns count removed. */
export function prunePlanV3Cache(now = Date.now()): number {
  let removed = 0;
  for (const [key, entry] of PLAN_V3_CACHE) {
    if (!isPlanV3CacheEntryValid(entry, now)) {
      PLAN_V3_CACHE.delete(key);
      removed += 1;
    }
  }
  return removed;
}

/** @deprecated Prefer prunePlanV3Cache */
export const pruneExpiredPlanV3Cache = prunePlanV3Cache;

function enforceCacheSizeCap(now = Date.now()): void {
  if (PLAN_V3_CACHE.size <= PLAN_V3_CACHE_MAX_ENTRIES) return;
  const ranked = [...PLAN_V3_CACHE.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
  while (PLAN_V3_CACHE.size > PLAN_V3_CACHE_MAX_ENTRIES && ranked.length > 0) {
    const [oldestKey] = ranked.shift()!;
    PLAN_V3_CACHE.delete(oldestKey);
  }
  prunePlanV3Cache(now);
}

export function getPlanV3CacheEntry(
  cacheKey: string,
  input: PlanEngineInput,
  now = Date.now(),
): PlanEngineV3Result | null {
  prunePlanV3Cache(now);
  const entry = PLAN_V3_CACHE.get(cacheKey);
  if (!entry) return null;
  if (!isPlanV3CacheEntryValid(entry, now)) {
    PLAN_V3_CACHE.delete(cacheKey);
    return null;
  }
  if (!validateCachedPlanV3Result(input, entry.result)) {
    PLAN_V3_CACHE.delete(cacheKey);
    return null;
  }
  return entry.result;
}

export function setPlanV3CacheEntry(
  cacheKey: string,
  input: PlanEngineInput,
  result: PlanEngineV3Result,
  now = Date.now(),
): void {
  if (!shouldCachePlanV3Result(input, result)) return;
  prunePlanV3Cache(now);
  const ttlMs = resolvePlanV3CacheTtlMs(input, result);
  PLAN_V3_CACHE.set(cacheKey, {
    result,
    createdAt: now,
    expiresAt: now + ttlMs,
  });
  enforceCacheSizeCap(now);
}

export function resetPlanV3CacheForTests(): void {
  PLAN_V3_CACHE.clear();
}
