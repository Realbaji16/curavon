import type { ActivityInsight, ActivityInsightInputSummary } from '../../types/activityInsights';
import { getAIConfig } from '../ai/aiConfig';
import { runAIClient } from '../ai/aiClient';
import { evaluateAIPolicy } from '../ai/governance/aiPolicy';
import { canUseAI, incrementAICall } from '../ai/governance/aiBudget';
import { recordAIAllowed, recordAIBlocked, recordFallback } from '../ai/governance/aiPolicyState';
import { recordAIDecisionTrace } from '../ai/governance/aiDecisionTrace';
import { filterSafeActivityInsights, sanitizeActivityInsightCandidate } from './activityInsightGuards';

const SYSTEM_PROMPT = `You help Curavon write short Activity Insights for the user.
Rules:
- Never diagnose or name medical conditions.
- Never give medication or treatment advice.
- Never say the user is safe or does not need a doctor.
- Use calm, plain language about app activity only (blocked steps, guides, check-ins, safety notes saved).
- Return ONLY valid JSON: { "insights": [ { "type", "title", "body", "tone", "evidence", "safetyLabel" } ] }
- Max 2 insights. evidence must be short count-based strings, not raw user text.`;

function buildPrompt(summary: ActivityInsightInputSummary, ruleInsights: ActivityInsight[]): string {
  return JSON.stringify({
    summary,
    existingRuleTitles: ruleInsights.map((i) => i.title),
    allowedTypes: [
      'action_pattern',
      'guide_pattern',
      'check_in_pattern',
      'safety_note',
      'data_quality',
      'preference',
    ],
    instructions:
      'Improve or prioritize insights using only the summary counts. Do not invent medical facts.',
  });
}

function parseAIInsights(raw: string): ActivityInsight[] {
  try {
    const parsed = JSON.parse(raw) as { insights?: Partial<ActivityInsight>[] };
    if (!Array.isArray(parsed.insights)) return [];
    return parsed.insights
      .map((item) => sanitizeActivityInsightCandidate({ ...item, source: 'ai' }, 'ai'))
      .filter((item): item is ActivityInsight => Boolean(item));
  } catch {
    return [];
  }
}

export async function generateAIActivityInsights(input: {
  summary: ActivityInsightInputSummary;
  ruleInsights: ActivityInsight[];
  safetyLevel?: 'normal' | 'caution' | 'urgent';
  consentCompleted?: boolean;
}): Promise<ActivityInsight[]> {
  const task = 'activity_insight' as const;
  const requestId = `activity-insight-${Date.now()}`;
  const compressedContext = { summary: input.summary, ruleCount: input.ruleInsights.length };
  const policy = evaluateAIPolicy({
    task,
    source: 'today',
    safetyLevel: input.safetyLevel ?? 'normal',
    userInputSummary: 'activity insight refresh',
    compressedContext,
    sessionState: { sessionAIUsageCount: 0, requestAIUsageCount: 0 },
    cacheStatus: { hasCached: false },
    hasApiKey: Boolean(getAIConfig().enabled),
    candidateCount: input.ruleInsights.length,
    userConsentState: { consentCompleted: input.consentCompleted ?? true },
  });

  if (!policy.allowed || !canUseAI(task)) {
    recordAIBlocked(policy.blockReason ?? 'missing_api_key', 'today');
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: 'today',
      task,
      requestedStage: 'idle',
      allowed: false,
      blockReason: policy.blockReason,
      moduleSelected: 'none',
      safetyLevel: input.safetyLevel ?? 'normal',
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: false,
      estimatedTokens: 0,
      contextType: 'compressed',
      reason: policy.reason,
    });
    return [];
  }

  const client = await runAIClient({
    model: 'gpt-4o-mini',
    systemPrompt: SYSTEM_PROMPT,
    prompt: buildPrompt(input.summary, input.ruleInsights),
    temperature: 0.2,
    max_tokens: 350,
  });

  if (!client.success || !client.text) {
    recordFallback(task, 'today');
    return [];
  }

  incrementAICall(task);
  recordAIAllowed(task, 'today');
  recordAIDecisionTrace({
    id: requestId,
    timestamp: new Date().toISOString(),
    source: 'today',
    task,
    requestedStage: 'idle',
    allowed: true,
    moduleSelected: 'ai_kernel_summary',
    safetyLevel: input.safetyLevel ?? 'normal',
    cacheHit: false,
    fallbackUsed: false,
    aiUsed: true,
    estimatedTokens: Math.ceil(client.text.length / 4),
    contextType: 'compressed',
    reason: 'Activity insight AI refresh',
  });

  return filterSafeActivityInsights(parseAIInsights(client.text));
}
