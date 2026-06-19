import type { ActivityInsight } from '../../types/activityInsights';
import {
  buildActivityInsightInputSummary,
  hashActivitySummary,
  summaryHasMeaningfulActivity,
} from './activityInsightSummary';
import { generateRuleActivityInsights } from './ruleActivityInsights';
import { generateAIActivityInsights } from './aiActivityInsightInterpreter';
import {
  getActivityInsightLastAiRunAt,
  getActivityInsightSummaryHash,
  loadActivityInsights,
  saveActivityInsights,
  clearActivityInsights as clearStoredInsights,
} from './activityInsightStorage';

const AI_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function mergeInsights(ruleInsights: ActivityInsight[], aiInsights: ActivityInsight[]): ActivityInsight[] {
  const seen = new Set<string>();
  const merged: ActivityInsight[] = [];

  [...ruleInsights, ...aiInsights].forEach((insight) => {
    const key = `${insight.type}:${insight.title.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(insight);
  });

  return merged.slice(0, 4);
}

function shouldRunAiRefresh(summaryHash: string, force = false): boolean {
  if (force) return true;
  const lastRun = getActivityInsightLastAiRunAt();
  if (!lastRun) return true;
  const elapsed = Date.now() - new Date(lastRun).getTime();
  if (elapsed < AI_COOLDOWN_MS) return false;
  return getActivityInsightSummaryHash() !== summaryHash;
}

export function refreshRuleActivityInsights(): ActivityInsight[] {
  const summary = buildActivityInsightInputSummary();
  const ruleInsights = generateRuleActivityInsights(summary);
  const summaryHash = hashActivitySummary(summary);

  saveActivityInsights(ruleInsights, {
    ruleGeneratedAt: new Date().toISOString(),
    summaryHash,
  });

  return ruleInsights;
}

export async function refreshActivityInsights(options?: {
  forceAi?: boolean;
  safetyLevel?: 'normal' | 'caution' | 'urgent';
  consentCompleted?: boolean;
}): Promise<ActivityInsight[]> {
  const summary = buildActivityInsightInputSummary();
  const summaryHash = hashActivitySummary(summary);
  const ruleInsights = generateRuleActivityInsights(summary);

  let finalInsights = ruleInsights;

  const canTryAi =
    summaryHasMeaningfulActivity(summary) &&
    options?.safetyLevel !== 'urgent' &&
    shouldRunAiRefresh(summaryHash, options?.forceAi);

  if (canTryAi) {
    const aiInsights = await generateAIActivityInsights({
      summary,
      ruleInsights,
      safetyLevel: options?.safetyLevel,
      consentCompleted: options?.consentCompleted,
    });
    finalInsights = mergeInsights(ruleInsights, aiInsights);
    saveActivityInsights(finalInsights, {
      ruleGeneratedAt: new Date().toISOString(),
      lastAiRunAt: new Date().toISOString(),
      summaryHash,
    });
  } else {
    saveActivityInsights(finalInsights, {
      ruleGeneratedAt: new Date().toISOString(),
      summaryHash,
    });
  }

  return finalInsights;
}

export function getCachedActivityInsights(): ActivityInsight[] {
  const cached = loadActivityInsights();
  if (cached.length > 0) return cached;
  return refreshRuleActivityInsights();
}

export function clearActivityInsightsData() {
  clearStoredInsights();
}

export function syncRuleInsightsAfterMetaCycle() {
  refreshRuleActivityInsights();
}
