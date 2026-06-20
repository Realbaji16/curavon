import type { ActivityInsightInputSummary } from '../../types/activityInsights';
import {
  loadMetaActionOutcomes,
  loadMetaFlowBehavior,
  loadMetaSafetyEvents,
} from '../../utils/metaSystem';
import type { DailyCheckIn } from '../../types/health';
import { fetchUserPreference } from '../data/productDataService';

let userPreferencesCache: Record<string, unknown> = {};

export async function hydrateUserPreferencesSnapshot(): Promise<Record<string, unknown>> {
  userPreferencesCache = (await fetchUserPreference()) ?? {};
  return userPreferencesCache;
}

export function loadUserPreferencesSnapshot(): Record<string, unknown> {
  return userPreferencesCache;
}

const SUMMARY_DAYS = 14;

function inLastDays(iso: string, days: number): boolean {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function trendFromCheckIns(
  checkins: DailyCheckIn[],
  field: 'mood' | 'energy',
): ActivityInsightInputSummary['checkInStats']['recentMoodTrend'] {
  const recent = checkins.filter((c) => inLastDays(c.createdAt, SUMMARY_DAYS));
  if (recent.length < 2) return 'not_enough_data';

  const lowMoods = new Set(['Low', 'Worried', 'Irritable', 'Numb', 'Not sure']);
  const lowEnergy = new Set(['Low', 'Drained']);

  const scores = recent.map((c) => {
    if (field === 'mood') return lowMoods.has(c.mood) ? 0 : 1;
    return lowEnergy.has(c.energyLevel) ? 0 : 1;
  });

  const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
  const secondHalf = scores.slice(Math.ceil(scores.length / 2));
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const delta = avg(secondHalf) - avg(firstHalf);
  if (Math.abs(delta) < 0.15) return 'mixed';
  return delta > 0 ? 'steadier' : 'lower';
}

function generalizeFlowId(flowId: string): string {
  return flowId.replace(/-/g, ' ').slice(0, 40);
}

export function buildActivityInsightInputSummary(checkins: DailyCheckIn[] = []): ActivityInsightInputSummary {
  const outcomes = loadMetaActionOutcomes().filter((o) => inLastDays(o.createdAt, SUMMARY_DAYS));
  const flows = loadMetaFlowBehavior().filter((f) => inLastDays(f.createdAt, SUMMARY_DAYS));
  const safety = loadMetaSafetyEvents().filter((e) => inLastDays(e.createdAt, SUMMARY_DAYS));
  const recentCheckins = checkins.filter((c) => inLastDays(c.createdAt, SUMMARY_DAYS));

  const completed = outcomes.filter((o) => o.status === 'done').length;
  const blocked = outcomes.filter((o) => o.status === 'blocked').length;
  const worse = outcomes.filter((o) => o.reasonCode?.includes('worse')).length;
  const skipped = outcomes.filter((o) => o.status === 'ignored').length;

  const started = flows.filter((f) => f.event === 'start').length;
  const completedFlows = flows.filter((f) => f.event === 'complete').length;
  const abandoned = flows.filter((f) => f.event === 'abandon').length;

  const abandonByFlow = new Map<string, number>();
  flows
    .filter((f) => f.event === 'abandon')
    .forEach((f) => abandonByFlow.set(f.flowId, (abandonByFlow.get(f.flowId) ?? 0) + 1));
  const topAbandon = Array.from(abandonByFlow.entries()).sort((a, b) => b[1] - a[1])[0];

  const safetySources = Array.from(
    new Set(safety.filter((e) => e.eventType === 'red_flag_trigger').map((e) => e.source)),
  ).slice(0, 4);

  const categories = Array.from(
    new Set(outcomes.map((o) => o.category).filter(Boolean) as string[]),
  ).slice(0, 4);

  return {
    dateRange: `Last ${SUMMARY_DAYS} days`,
    actionOutcomes: { completed, blocked, worse, skipped },
    flowStats: {
      started,
      completed: completedFlows,
      abandoned,
      mostAbandonedFlow: topAbandon ? generalizeFlowId(topAbandon[0]) : undefined,
    },
    checkInStats: {
      count: recentCheckins.length,
      recentMoodTrend: trendFromCheckIns(recentCheckins, 'mood'),
      recentEnergyTrend: trendFromCheckIns(recentCheckins, 'energy'),
    },
    safetyStats: {
      redFlagCount: safety.filter((e) => e.eventType === 'red_flag_trigger').length,
      sources: safetySources,
    },
    repeatedBlockers: blocked >= 2 ? [`${blocked} actions marked blocked`] : [],
    commonFocusAreas: categories,
    followUpPatterns:
      worse > 0 ? [`${worse} follow-up signals noted as harder`] : [],
    guidePatterns:
      abandoned > 0
        ? [`${abandoned} guide${abandoned === 1 ? '' : 's'} stopped before the final step`]
        : [],
  };
}

export function hashActivitySummary(summary: ActivityInsightInputSummary): string {
  return JSON.stringify({
    blocked: summary.actionOutcomes.blocked,
    checkins: summary.checkInStats.count,
    abandoned: summary.flowStats.abandoned,
    redFlags: summary.safetyStats.redFlagCount,
  });
}

export function summaryHasMeaningfulActivity(summary: ActivityInsightInputSummary): boolean {
  const { actionOutcomes, flowStats, checkInStats, safetyStats } = summary;
  return (
    actionOutcomes.completed +
      actionOutcomes.blocked +
      actionOutcomes.skipped +
      flowStats.started +
      checkInStats.count +
      safetyStats.redFlagCount >
    0
  );
}
