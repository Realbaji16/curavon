import type { AskHistoryEntry } from '../types/askIntake';
import type { RedFlagLog } from '../types/doctorSummary';
import { syncRuleInsightsAfterMetaCycle } from '../lib/activityInsights/activityInsightEngine';
import type { DailyCheckIn } from '../types/health';
import type {
  MetaActionOutcome,
  MetaFailureInsight,
  MetaFlowBehaviorEvent,
  MetaImprovementProposal,
  MetaInsightsBundle,
  MetaPatternInsight,
  MetaSafetyEvent,
} from '../types/metaSystem';
import { ASK_HISTORY_KEY } from './askIntakeStorage';
import { HEALTH_STORAGE_KEYS, safeRead, safeWrite } from './healthStorage';

export const META_STORAGE_KEYS = {
  actionOutcomes: 'curavon_meta_action_outcomes',
  safetyEvents: 'curavon_meta_safety_events',
  flowBehavior: 'curavon_meta_flow_behavior',
  orchestratorEvents: 'curavon_meta_orchestrator_events',
  insights: 'curavon_meta_insights',
  improvementQueue: 'curavon_meta_improvement_queue',
} as const;

function appendLimited<T extends { createdAt: string }>(items: T[], entry: T, limit = 300): T[] {
  return [entry, ...items].slice(0, limit);
}

function inLastDays(iso: string, days: number): boolean {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function severityFromCount(count: number, high = 4, medium = 2): 'low' | 'medium' | 'high' {
  if (count >= high) return 'high';
  if (count >= medium) return 'medium';
  return 'low';
}

function sanitizeSignal(signal: string): string {
  return signal.trim().toLowerCase().slice(0, 80) || 'unspecified-signal';
}

export function loadMetaActionOutcomes(): MetaActionOutcome[] {
  return safeRead<MetaActionOutcome[]>(META_STORAGE_KEYS.actionOutcomes, []);
}

export function loadMetaSafetyEvents(): MetaSafetyEvent[] {
  return safeRead<MetaSafetyEvent[]>(META_STORAGE_KEYS.safetyEvents, []);
}

export function loadMetaFlowBehavior(): MetaFlowBehaviorEvent[] {
  return safeRead<MetaFlowBehaviorEvent[]>(META_STORAGE_KEYS.flowBehavior, []);
}

export function loadMetaInsights(): MetaInsightsBundle {
  return safeRead<MetaInsightsBundle>(META_STORAGE_KEYS.insights, {
    generatedAt: new Date(0).toISOString(),
    patterns: [],
    failures: [],
    proposals: [],
  });
}

export function collectOrchestratorExecution(input: {
  stage: string;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  decisionOutcome: string;
  actionCategory: string;
  memoryUsed: string[];
}) {
  const events = safeRead<
    Array<{
      id: string;
      stage: string;
      safetyLevel: 'normal' | 'caution' | 'urgent';
      decisionOutcome: string;
      actionCategory: string;
      memoryUsed: string[];
      createdAt: string;
    }>
  >(META_STORAGE_KEYS.orchestratorEvents, []);
  const entry = {
    id: `meta-orch-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    stage: input.stage,
    safetyLevel: input.safetyLevel,
    decisionOutcome: input.decisionOutcome,
    actionCategory: input.actionCategory,
    memoryUsed: input.memoryUsed.slice(0, 6),
    createdAt: new Date().toISOString(),
  };
  safeWrite(META_STORAGE_KEYS.orchestratorEvents, appendLimited(events, entry));
}

export function collectActionOutcome(input: {
  actionId?: string;
  status: MetaActionOutcome['status'];
  category?: string;
  source?: string;
  reasonCode?: string;
}) {
  const entry: MetaActionOutcome = {
    id: `meta-action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    actionId: input.actionId ?? 'unknown-action',
    status: input.status,
    category: input.category,
    source: input.source,
    reasonCode: input.reasonCode,
    createdAt: new Date().toISOString(),
  };
  const next = appendLimited(loadMetaActionOutcomes(), entry);
  safeWrite(META_STORAGE_KEYS.actionOutcomes, next);
}

export function collectSafetyEvent(input: {
  source: string;
  eventType: MetaSafetyEvent['eventType'];
  severity: MetaSafetyEvent['severity'];
  signal: string;
}) {
  const entry: MetaSafetyEvent = {
    id: `meta-safety-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: input.source,
    eventType: input.eventType,
    severity: input.severity,
    signal: sanitizeSignal(input.signal),
    createdAt: new Date().toISOString(),
  };
  const next = appendLimited(loadMetaSafetyEvents(), entry);
  safeWrite(META_STORAGE_KEYS.safetyEvents, next);
}

export function collectFlowBehavior(input: {
  flowId: string;
  event: MetaFlowBehaviorEvent['event'];
  stepIndex?: number;
  totalSteps?: number;
}) {
  const entry: MetaFlowBehaviorEvent = {
    id: `meta-flow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    flowId: input.flowId,
    event: input.event,
    stepIndex: input.stepIndex,
    totalSteps: input.totalSteps,
    createdAt: new Date().toISOString(),
  };
  const next = appendLimited(loadMetaFlowBehavior(), entry);
  safeWrite(META_STORAGE_KEYS.flowBehavior, next);
}

export function analyzePatterns(): MetaPatternInsight[] {
  const outcomes = loadMetaActionOutcomes();
  const flows = loadMetaFlowBehavior();
  const checkins = safeRead<DailyCheckIn[]>(HEALTH_STORAGE_KEYS.dailyCheckins, []);
  const ask = safeRead<AskHistoryEntry[]>(ASK_HISTORY_KEY, []);

  const patterns: MetaPatternInsight[] = [];

  const blockedRecent = outcomes.filter((o) => o.status === 'blocked' && inLastDays(o.createdAt, 14));
  if (blockedRecent.length >= 2) {
    patterns.push({
      id: 'pattern-repeated-blockers',
      type: 'repeated_blockers',
      description: 'Repeated blockers detected in recent action outcomes.',
      evidence: [`blocked_outcomes_14d=${blockedRecent.length}`],
      severity: severityFromCount(blockedRecent.length, 5, 2),
    });
  }

  const stressRecent = checkins.filter(
    (c) => inLastDays(c.createdAt, 14) && (c.stressLevel === 'Stressed' || c.stressLevel === 'Overwhelmed'),
  );
  if (stressRecent.length >= 3) {
    patterns.push({
      id: 'pattern-recurring-stress',
      type: 'recurring_stress',
      description: 'Recurring stress signals detected across check-ins.',
      evidence: [`high_stress_checkins_14d=${stressRecent.length}`],
      severity: severityFromCount(stressRecent.length, 6, 3),
    });
  }

  const symptomRecent = checkins.filter((c) => inLastDays(c.createdAt, 14) && c.symptoms.trim().length > 0).length;
  if (symptomRecent >= 3) {
    patterns.push({
      id: 'pattern-repeated-symptoms',
      type: 'repeated_symptoms',
      description: 'Repeated symptom reporting detected in recent check-ins.',
      evidence: [`symptom_checkins_14d=${symptomRecent}`],
      severity: severityFromCount(symptomRecent, 7, 3),
    });
  }

  const askRecent = ask.filter((entry) => inLastDays(entry.createdAt, 7)).length;
  if (askRecent >= 3) {
    patterns.push({
      id: 'pattern-repeated-ask',
      type: 'repeated_ask_usage',
      description: 'Repeated Ask usage suggests ongoing uncertainty or unresolved concerns.',
      evidence: [`ask_entries_7d=${askRecent}`],
      severity: severityFromCount(askRecent, 8, 3),
    });
  }

  const abandonCounts = new Map<string, number>();
  flows
    .filter((f) => inLastDays(f.createdAt, 14) && f.event === 'abandon')
    .forEach((f) => abandonCounts.set(f.flowId, (abandonCounts.get(f.flowId) ?? 0) + 1));
  const abandoned = Array.from(abandonCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (abandoned[0] && abandoned[0][1] >= 2) {
    patterns.push({
      id: 'pattern-flow-abandonment',
      type: 'repeated_flow_abandonment',
      description: 'A flow is being repeatedly abandoned before completion.',
      evidence: [`flow=${abandoned[0][0]}`, `abandon_count_14d=${abandoned[0][1]}`],
      severity: severityFromCount(abandoned[0][1], 4, 2),
    });
  }

  return patterns;
}

export function analyzeFailures(): MetaFailureInsight[] {
  const outcomes = loadMetaActionOutcomes();
  const flows = loadMetaFlowBehavior();
  const safety = loadMetaSafetyEvents();

  const failures: MetaFailureInsight[] = [];

  const blockedByAction = new Map<string, number>();
  outcomes
    .filter((o) => o.status === 'blocked' && inLastDays(o.createdAt, 30))
    .forEach((o) => blockedByAction.set(o.actionId, (blockedByAction.get(o.actionId) ?? 0) + 1));
  const topBlocked = Array.from(blockedByAction.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topBlocked && topBlocked[1] >= 2) {
    failures.push({
      id: 'failure-frequent-action-blocking',
      type: 'frequent_action_blocking',
      description: 'One action pattern is frequently blocked.',
      evidence: [`action_id=${topBlocked[0]}`, `blocked_count_30d=${topBlocked[1]}`],
      severity: severityFromCount(topBlocked[1], 5, 2),
    });
  }

  const abandonmentByFlow = new Map<string, number>();
  flows
    .filter((f) => f.event === 'abandon' && inLastDays(f.createdAt, 30))
    .forEach((f) => abandonmentByFlow.set(f.flowId, (abandonmentByFlow.get(f.flowId) ?? 0) + 1));
  const topAbandoned = Array.from(abandonmentByFlow.entries()).sort((a, b) => b[1] - a[1])[0];
  if (topAbandoned && topAbandoned[1] >= 2) {
    failures.push({
      id: 'failure-frequent-flow-abandonment',
      type: 'frequent_flow_abandonment',
      description: 'One flow is frequently abandoned.',
      evidence: [`flow=${topAbandoned[0]}`, `abandon_count_30d=${topAbandoned[1]}`],
      severity: severityFromCount(topAbandoned[1], 5, 2),
    });
  }

  const edgeCases = safety.filter(
    (event) => inLastDays(event.createdAt, 30) && (event.eventType === 'near_miss' || event.eventType === 'escalation'),
  );
  if (edgeCases.length > 0) {
    failures.push({
      id: 'failure-safety-edge-case',
      type: 'safety_edge_case',
      description: 'Safety edge-case activity requires manual review.',
      evidence: [`safety_edge_events_30d=${edgeCases.length}`],
      severity: severityFromCount(edgeCases.length, 4, 1),
    });
  }

  const adjustedCount = outcomes.filter((o) => o.status === 'adjusted' && inLastDays(o.createdAt, 30)).length;
  if (adjustedCount >= 3) {
    failures.push({
      id: 'failure-confusing-guidance',
      type: 'confusing_guidance',
      description: 'Frequent adjustments may indicate guidance friction or clarity gaps.',
      evidence: [`adjusted_actions_30d=${adjustedCount}`],
      severity: severityFromCount(adjustedCount, 7, 3),
    });
  }

  return failures;
}

export function generateImprovementProposals(): MetaImprovementProposal[] {
  const patterns = analyzePatterns();
  const failures = analyzeFailures();
  const proposals: MetaImprovementProposal[] = [];

  patterns.forEach((pattern) => {
    if (pattern.type === 'repeated_flow_abandonment') {
      proposals.push({
        type: 'flow_issue',
        severity: pattern.severity,
        description: 'Flow abandonment pattern detected.',
        evidence: pattern.evidence,
        suggestedFix: 'Reduce question count in the affected flow and add clearer progress framing.',
        affectedModule: 'Guides Flow Runner',
      });
    } else if (pattern.type === 'repeated_blockers') {
      proposals.push({
        type: 'behavior_pattern',
        severity: pattern.severity,
        description: 'Repeated blocker behavior detected.',
        evidence: pattern.evidence,
        suggestedFix: 'Increase micro-step defaults and friction-reduction prompts for blocked states.',
        affectedModule: 'Today Next Action',
      });
    } else if (pattern.type === 'repeated_ask_usage') {
      proposals.push({
        type: 'module_gap',
        severity: pattern.severity,
        description: 'Repeated Ask usage may indicate unresolved module coverage.',
        evidence: pattern.evidence,
        suggestedFix: 'Propose a focused flow module for the dominant recurring concern cluster.',
        affectedModule: 'Ask/Guides Module Factory',
      });
    }
  });

  failures.forEach((failure) => {
    if (failure.type === 'safety_edge_case') {
      proposals.push({
        type: 'safety_issue',
        severity: failure.severity,
        description: 'Safety edge-case review required.',
        evidence: failure.evidence,
        suggestedFix: 'Review edge-case triggers and clarify escalation copy under existing safety boundaries.',
        affectedModule: 'Safety Review Queue',
      });
    } else if (failure.type === 'frequent_action_blocking') {
      proposals.push({
        type: 'behavior_pattern',
        severity: failure.severity,
        description: 'A repeated action is frequently blocked.',
        evidence: failure.evidence,
        suggestedFix: 'Add alternate low-friction variants for the affected action category.',
        affectedModule: 'Action Guidance Layer',
      });
    } else if (failure.type === 'frequent_flow_abandonment') {
      proposals.push({
        type: 'flow_issue',
        severity: failure.severity,
        description: 'Specific flow abandonment is repeatedly observed.',
        evidence: failure.evidence,
        suggestedFix: 'Simplify early flow steps and improve step clarity before deeper intake.',
        affectedModule: 'Guides Flow Runner',
      });
    }
  });

  return proposals.slice(0, 20);
}

export function runMetaSystemCycle(): MetaInsightsBundle {
  const patterns = analyzePatterns();
  const failures = analyzeFailures();
  const proposals = generateImprovementProposals();
  const bundle: MetaInsightsBundle = {
    generatedAt: new Date().toISOString(),
    patterns,
    failures,
    proposals,
  };
  safeWrite(META_STORAGE_KEYS.insights, bundle);
  safeWrite(META_STORAGE_KEYS.improvementQueue, proposals);
  syncRuleInsightsAfterMetaCycle();
  return bundle;
}

export function collectSafetyFromRedFlag(log: Pick<RedFlagLog, 'id' | 'source' | 'matchedConcern' | 'createdAt'>) {
  const signal = sanitizeSignal(log.matchedConcern);
  const recent = loadMetaSafetyEvents().some(
    (event) =>
      event.eventType === 'red_flag_trigger' &&
      event.source === String(log.source || 'unknown') &&
      event.signal === signal &&
      inLastDays(event.createdAt, 1),
  );
  if (!recent) {
    collectSafetyEvent({
      source: String(log.source || 'unknown'),
      eventType: 'red_flag_trigger',
      severity: signal.includes('breathing') || signal.includes('faint') ? 'high' : 'medium',
      signal,
    });
  }
  if (inLastDays(log.createdAt, 2)) {
    const recentEscalation = loadMetaSafetyEvents().some(
      (event) =>
        event.eventType === 'escalation' &&
        event.source === String(log.source || 'unknown') &&
        inLastDays(event.createdAt, 1),
    );
    if (!recentEscalation) {
      collectSafetyEvent({
        source: String(log.source || 'unknown'),
        eventType: 'escalation',
        severity: 'high',
        signal: 'recent-red-flag-escalation',
      });
    }
  }
  runMetaSystemCycle();
}

export function collectAskCompletion() {
  runMetaSystemCycle();
}
