// Legacy next-action path. Do not use for new generation. Route through Plan Engine v2 via nextActionAdapter.
import type { AskHistoryEntry } from '../types/askIntake';
import type { RedFlagLog } from '../types/doctorSummary';
import type { DailyCheckIn, NextActionState } from '../types/health';
import type { HealthSnapshot } from '../types/healthSnapshot';
import { ASK_HISTORY_KEY } from './askIntakeStorage';
import { DOCTOR_SUMMARY_STORAGE_KEYS } from './doctorSummaryStorage';
import { HEALTH_STORAGE_KEYS, safeRead } from './healthStorage';

export type ActionEngineCategory =
  | 'stabilize'
  | 'track'
  | 'prepare'
  | 'reduce_friction'
  | 'escalate';

export interface ActionEnginePrimaryAction {
  title: string;
  action: string;
  reason: string;
  category: ActionEngineCategory;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  relatedGuide?: string;
}

export interface ActionEngineV2Output {
  primaryAction: ActionEnginePrimaryAction;
  supportingInsight?: string;
}

type ActionEngineInputs = {
  dailyCheckins: DailyCheckIn[];
  askHistory: AskHistoryEntry[];
  nextActionState: NextActionState | null;
  redFlagLogs: RedFlagLog[];
};

function inLastDays(iso: string, days: number): boolean {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function loadActionEngineInputs(): ActionEngineInputs {
  return {
    dailyCheckins: safeRead<DailyCheckIn[]>(HEALTH_STORAGE_KEYS.dailyCheckins, []),
    askHistory: safeRead<AskHistoryEntry[]>(ASK_HISTORY_KEY, []),
    nextActionState: safeRead<NextActionState | null>(HEALTH_STORAGE_KEYS.nextActionState, null),
    redFlagLogs: safeRead<RedFlagLog[]>(DOCTOR_SUMMARY_STORAGE_KEYS.redFlagLogs, []),
  };
}

function latestCheckIn(checkins: DailyCheckIn[]): DailyCheckIn | null {
  if (!checkins.length) return null;
  return [...checkins].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function repeatedAskConcerns(askHistory: AskHistoryEntry[]): boolean {
  if (askHistory.length < 2) return false;
  const counts = new Map<string, number>();
  askHistory.slice(0, 8).forEach((entry) => {
    const key = entry.concernType.trim().toLowerCase() || entry.concern.trim().toLowerCase();
    if (!key) return;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return Array.from(counts.values()).some((count) => count >= 2);
}

function defaultAction(): ActionEngineV2Output {
  return {
    primaryAction: {
      title: 'Keep today simple',
      action: 'Take one small stabilizing step: hydrate, pause for two breaths, and write one short note.',
      reason: 'A small consistent step keeps support practical and manageable.',
      category: 'stabilize',
      safetyLevel: 'normal',
      relatedGuide: 'Tiny Grounding Steps',
    },
    supportingInsight: 'No strong risk pattern was detected in your recent snapshot.',
  };
}

export function buildNextBestAction(snapshot: HealthSnapshot | null | undefined): ActionEngineV2Output {
  if (!snapshot) {
    return defaultAction();
  }

  const { dailyCheckins, askHistory, nextActionState, redFlagLogs } = loadActionEngineInputs();
  const latest = latestCheckIn(dailyCheckins);

  const recentRedFlags =
    snapshot.riskSignals.repeatedRedFlags ||
    redFlagLogs.filter((log) => inLastDays(log.createdAt, 14)).length >= 2;

  if (recentRedFlags) {
    return {
      primaryAction: {
        title: 'Prioritize safety and clear notes',
        action:
          'Open your doctor-ready summary and keep your concern notes clear so you can seek timely clinician support if needed.',
        reason: 'Recent safety signals were detected, so Curavon is prioritizing a safety-first next step.',
        category: 'escalate',
        safetyLevel: 'urgent',
        relatedGuide: 'Doctor Visit Prep',
      },
      supportingInsight: 'Safety-first override is active due to recent red-flag patterns.',
    };
  }

  const lowSleep = latest ? latest.sleepQuality === 'Poor' || latest.sleepQuality === 'Very poor' : false;
  const highStress = latest ? latest.stressLevel === 'Stressed' || latest.stressLevel === 'Overwhelmed' : false;
  const lowEnergy = latest ? latest.energyLevel === 'Low' || latest.energyLevel === 'Drained' : false;

  if (lowSleep || highStress || lowEnergy) {
    return {
      primaryAction: {
        title: 'Stabilize first',
        action: 'Choose one low-effort recovery step now, then reduce pressure on your next task.',
        reason: 'Recent check-ins suggest sleep, stress, or energy pressure.',
        category: 'stabilize',
        safetyLevel: 'normal',
        relatedGuide: 'Sleep And Mood',
      },
      supportingInsight: snapshot.trendSummary,
    };
  }

  const hasRepeatingSymptoms = snapshot.activeConcerns.repeatingSymptoms.length > 0;
  const increasingFrequency = snapshot.riskSignals.increasingSymptomFrequency;
  if (hasRepeatingSymptoms || increasingFrequency) {
    return {
      primaryAction: {
        title: 'Track the pattern clearly',
        action: 'Log timing, intensity, and changes for your main symptom so your pattern is easier to follow.',
        reason: 'A repeating or increasing symptom pattern was detected.',
        category: 'track',
        safetyLevel: 'normal',
        relatedGuide: 'Something Feels Off',
      },
      supportingInsight: `Pattern signal: ${snapshot.activeConcerns.repeatingSymptoms.slice(0, 2).join(', ') || 'increasing symptom frequency'}.`,
    };
  }

  const actionBlocked = snapshot.activeConcerns.blockedActions > 0 || nextActionState?.status === 'blocked';
  if (actionBlocked) {
    return {
      primaryAction: {
        title: 'Reduce friction',
        action: 'Shrink the step to two minutes or save one blocker note before trying again.',
        reason: 'Recent actions were blocked, so Curavon is reducing effort friction.',
        category: 'reduce_friction',
        safetyLevel: 'normal',
        relatedGuide: 'Tiny Grounding Steps',
      },
      supportingInsight: 'Blocked-action pattern detected in your recent activity.',
    };
  }

  const doctorPrepNeeded =
    snapshot.activeConcerns.unresolvedAskConcerns.length >= 2 || repeatedAskConcerns(askHistory);
  if (doctorPrepNeeded) {
    return {
      primaryAction: {
        title: 'Prepare for clinician discussion',
        action: 'Write your top question and a short timeline so your next clinician conversation stays focused.',
        reason: 'Repeated concerns suggest preparation could make care discussions clearer.',
        category: 'prepare',
        safetyLevel: 'caution',
        relatedGuide: 'Doctor Visit Prep',
      },
      supportingInsight: `${snapshot.activeConcerns.unresolvedAskConcerns.length} unresolved Ask concerns are currently in memory.`,
    };
  }

  return defaultAction();
}

function relatedGuideFlowId(relatedGuide?: string): NextActionState['relatedGuideFlowId'] {
  const guide = (relatedGuide ?? '').toLowerCase();
  if (guide.includes('doctor')) return 'doctor-visit-prep';
  if (guide.includes('sleep') || guide.includes('mood')) return 'mood-stress-checkin';
  if (guide.includes('stomach')) return 'stomach-pain';
  if (guide.includes('headache')) return 'headache';
  return 'something-feels-off';
}

export function toNextActionStateFromV2(result: ActionEngineV2Output): NextActionState {
  return {
    currentAction: result.primaryAction.action,
    title: result.primaryAction.title,
    reason: result.primaryAction.reason,
    source: "Today's Check-In",
    sourceSignals: [],
    sourceChips: ['Next Action'],
    effort: 'very_low',
    category: result.primaryAction.category,
    relatedGuide: result.primaryAction.relatedGuide,
    relatedGuideFlowId: relatedGuideFlowId(result.primaryAction.relatedGuide),
    safetyLevel: result.primaryAction.safetyLevel,
    actionId: `v2-${result.primaryAction.category}`,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  };
}
