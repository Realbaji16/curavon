import type { AskHistoryEntry } from '../types/askIntake';
import type { DoctorSummaryItem, RedFlagLog } from '../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../types/health';
import type { HealthSnapshot, SnapshotFocusArea, SnapshotTrend } from '../types/healthSnapshot';
import type { FollowUpRecord } from '../lib/followUp/followUpTypes';
import type { GuideResultRecord } from '../types/guideResult';
import {
  createDefaultHealthProfile,
  todayDateKey,
} from './healthUtils';

const MOOD_SCORE: Record<string, number> = {
  Clear: 4,
  Worried: 2,
  Low: 1,
  Irritable: 2,
  Numb: 1,
  'Not sure': 2,
};

const ENERGY_SCORE: Record<string, number> = {
  High: 4,
  Steady: 3,
  Low: 2,
  Drained: 1,
};

const STRESS_WELLBEING_SCORE: Record<string, number> = {
  Calm: 4,
  'A little tense': 3,
  Stressed: 2,
  Overwhelmed: 1,
};

const SLEEP_SCORE: Record<string, number> = {
  Restful: 4,
  Okay: 3,
  Poor: 2,
  'Very poor': 1,
};

const SYMPTOM_KEYWORDS = [
  'headache',
  'stomach',
  'nausea',
  'cramp',
  'diarrhea',
  'fatigue',
  'sleep',
  'stress',
  'worry',
  'pain',
  'breathing',
];

function toTrend(values: number[]): SnapshotTrend {
  if (values.length < 3) return 'unknown';
  const recent = values.slice(0, Math.ceil(values.length / 2));
  const earlier = values.slice(Math.ceil(values.length / 2));
  if (!earlier.length) return 'stable';
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const delta = recentAvg - earlierAvg;
  if (delta >= 0.35) return 'improving';
  if (delta <= -0.35) return 'declining';
  return 'stable';
}

function inLastDays(iso: string, days: number): boolean {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function extractSymptoms(text: string): string[] {
  const lower = text.toLowerCase();
  return SYMPTOM_KEYWORDS.filter((keyword) => lower.includes(keyword));
}

function lastNDates(n: number): string[] {
  const base = new Date(`${todayDateKey()}T00:00:00`);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() - i);
    return d.toISOString().slice(0, 10);
  });
}

function buildProfileContext(profile: HealthProfile): HealthSnapshot['profileContext'] {
  const goals = profile.primaryGoals.filter(Boolean).slice(0, 3);
  return {
    goalCount: profile.primaryGoals.length,
    hasMedications: profile.medications.length > 0,
    hasConditions: profile.conditions.length > 0,
    primaryGoalsSummary: goals.length > 0 ? goals.join(', ') : 'No goals noted yet',
  };
}

function buildFollowUpSignals(followUps: FollowUpRecord[]): HealthSnapshot['followUpSignals'] {
  const recent = followUps.filter(
    (item) => item.status === 'completed' && inLastDays(item.createdAt, 14),
  );
  const recentHelped = recent.filter((item) => item.outcome === 'helped').length;
  const recentBlocked = recent.filter(
    (item) => item.outcome === 'blocked' || item.outcome === 'not_done',
  ).length;
  const recentWorse = recent.filter((item) => item.outcome === 'worse').length;
  const recentNotDone = recent.filter((item) => item.outcome === 'not_done').length;
  return {
    recentHelped,
    recentBlocked,
    recentWorse,
    recentNotDone,
    repeatedBlocked: recentBlocked >= 2,
    repeatedWorse: recentWorse >= 2,
  };
}

function buildGuideActivity(guideResults: GuideResultRecord[]): HealthSnapshot['guideActivity'] {
  const recent = guideResults.filter((item) => inLastDays(item.completedAt, 14));
  return {
    recentGuideTitles: recent.slice(0, 3).map((item) => item.guideTitle),
    recentGuideCount: recent.length,
  };
}

function buildSafetySignalSummary(redFlags: RedFlagLog[], followUpSignals: HealthSnapshot['followUpSignals']): string {
  const recentFlags = redFlags.filter((log) => inLastDays(log.createdAt, 7));
  if (recentFlags.length >= 2) {
    return 'Multiple urgent concerns were noted recently. Safety-aware support is prioritized.';
  }
  if (recentFlags.length === 1) {
    return 'A recent urgent concern was logged. Patterns are tracked without diagnosis.';
  }
  if (followUpSignals.repeatedWorse) {
    return 'Follow-up responses suggest worsening patterns. Clinician preparation may help.';
  }
  return 'No recent urgent safety pattern detected in stored notes.';
}

function collectRecentBlockers(
  doctorItems: DoctorSummaryItem[],
  nextAction: NextActionState | null,
): string[] {
  const blockers: string[] = [];
  doctorItems
    .filter((item) => item.type === 'next_action' && /status:\s*blocked/i.test(item.content) && inLastDays(item.createdAt, 14))
    .slice(0, 2)
    .forEach((item) => {
      const match = item.content.match(/blocker:\s*([^|]+)/i);
      blockers.push(match?.[1]?.trim() || 'Action blocked recently');
    });
  if (nextAction?.status === 'blocked' && nextAction.blockedLabel) {
    blockers.unshift(nextAction.blockedLabel);
  }
  return Array.from(new Set(blockers)).slice(0, 3);
}

export function createEmptyHealthSnapshot(): HealthSnapshot {
  return {
    updatedAt: new Date().toISOString(),
    currentState: {
      moodTrend: 'unknown',
      energyTrend: 'unknown',
      stressTrend: 'unknown',
      sleepTrend: 'unknown',
    },
    activeConcerns: {
      repeatingSymptoms: [],
      unresolvedAskConcerns: [],
      blockedActions: 0,
    },
    riskSignals: {
      repeatedRedFlags: false,
      increasingSymptomFrequency: false,
      worseningCheckinPatterns: false,
    },
    engagementSignals: {
      missedCheckins: 0,
      frequentAskUsage: false,
      repeatedBlockedActions: false,
    },
    profileContext: {
      goalCount: 0,
      hasMedications: false,
      hasConditions: false,
      primaryGoalsSummary: 'No goals noted yet',
    },
    followUpSignals: {
      recentHelped: 0,
      recentBlocked: 0,
      recentWorse: 0,
      recentNotDone: 0,
      repeatedBlocked: false,
      repeatedWorse: false,
    },
    guideActivity: {
      recentGuideTitles: [],
      recentGuideCount: 0,
    },
    safetySignalSummary: 'No recent urgent safety pattern detected in stored notes.',
    recentBlockers: [],
    recommendedFocusArea: 'routine_stabilization',
    trendSummary: 'Build consistency with one small daily check-in.',
  };
}

function chooseFocusArea(
  risk: HealthSnapshot['riskSignals'],
  trends: HealthSnapshot['currentState'],
  engagement: HealthSnapshot['engagementSignals'],
  followUpSignals: HealthSnapshot['followUpSignals'],
): SnapshotFocusArea {
  if (followUpSignals.repeatedWorse || risk.repeatedRedFlags) {
    return followUpSignals.repeatedWorse ? 'safety_awareness' : 'clinician_preparation';
  }
  if (followUpSignals.repeatedBlocked || engagement.repeatedBlockedActions) {
    return 'reduce_friction';
  }
  if (risk.increasingSymptomFrequency) return 'symptom_tracking';
  if (trends.stressTrend === 'declining' || trends.moodTrend === 'declining') {
    return 'stress_support';
  }
  if (trends.sleepTrend === 'declining' || trends.energyTrend === 'declining') {
    return 'general_wellness';
  }
  if (engagement.missedCheckins >= 3) return 'routine_stabilization';
  return 'symptom_tracking';
}

function formatFocusLabel(focus: SnapshotFocusArea): string {
  return focus.replace(/_/g, ' ');
}

function trendSummary(
  currentState: HealthSnapshot['currentState'],
  focus: SnapshotFocusArea,
  profileContext: HealthSnapshot['profileContext'],
  guideActivity: HealthSnapshot['guideActivity'],
): string {
  const declining = Object.entries(currentState)
    .filter(([, trend]) => trend === 'declining')
    .map(([key]) => key.replace('Trend', ''));
  const focusLabel = formatFocusLabel(focus);
  const guideHint =
    guideActivity.recentGuideCount > 0
      ? ` Recent guided flow activity: ${guideActivity.recentGuideTitles.slice(0, 2).join(', ')}.`
      : '';
  const goalHint =
    profileContext.goalCount > 0 ? ` Profile goals noted: ${profileContext.primaryGoalsSummary}.` : '';
  if (declining.length > 0) {
    return `${declining.slice(0, 2).join(' and ')} patterns look heavier recently. Focus: ${focusLabel}.${goalHint}${guideHint}`;
  }
  const improving = Object.entries(currentState)
    .filter(([, trend]) => trend === 'improving')
    .map(([key]) => key.replace('Trend', ''));
  if (improving.length > 0) {
    return `${improving.slice(0, 2).join(' and ')} patterns look steadier. Keep focus on ${focusLabel}.${guideHint}`;
  }
  return `Patterns are mostly stable. Keep focus on ${focusLabel}.${goalHint}${guideHint}`;
}

export type HealthSnapshotCoreInputs = {
  profile?: HealthProfile;
  dailyCheckins?: DailyCheckIn[];
  askHistory?: AskHistoryEntry[];
  nextActionState?: NextActionState | null;
};

export type HealthSnapshotProductInputs = {
  doctorItems?: DoctorSummaryItem[];
  redFlags?: RedFlagLog[];
  followUps?: FollowUpRecord[];
  guideResults?: GuideResultRecord[];
};

export type HealthSnapshotInputs = HealthSnapshotCoreInputs & HealthSnapshotProductInputs;

export function buildHealthSnapshot(inputs?: HealthSnapshotInputs): HealthSnapshot {
  const checkins = (inputs?.dailyCheckins ?? [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const askHistory = inputs?.askHistory ?? [];
  const nextAction = inputs?.nextActionState ?? null;
  const doctorItems = inputs?.doctorItems ?? [];
  const redFlags = inputs?.redFlags ?? [];
  const profile = inputs?.profile ?? createDefaultHealthProfile();
  const followUps = inputs?.followUps ?? [];
  const guideResults = inputs?.guideResults ?? [];

  const profileContext = buildProfileContext(profile);
  const followUpSignals = buildFollowUpSignals(followUps);
  const guideActivity = buildGuideActivity(guideResults);
  const safetySignalSummary = buildSafetySignalSummary(redFlags, followUpSignals);
  const recentBlockers = collectRecentBlockers(doctorItems, nextAction);

  if (
    checkins.length === 0 &&
    askHistory.length === 0 &&
    !nextAction &&
    redFlags.length === 0 &&
    followUps.length === 0 &&
    guideResults.length === 0 &&
    profileContext.goalCount === 0
  ) {
    return createEmptyHealthSnapshot();
  }

  const latest = checkins.slice(0, 6);
  const moodTrend = toTrend(latest.map((c) => MOOD_SCORE[c.mood] ?? 2));
  const energyTrend = toTrend(latest.map((c) => ENERGY_SCORE[c.energyLevel] ?? 2));
  const stressTrend = toTrend(latest.map((c) => STRESS_WELLBEING_SCORE[c.stressLevel] ?? 2));
  const sleepTrend = toTrend(latest.map((c) => SLEEP_SCORE[c.sleepQuality] ?? 2));

  const symptomCounts = new Map<string, number>();
  checkins.slice(0, 10).forEach((checkIn) => {
    extractSymptoms(`${checkIn.symptoms} ${checkIn.notes}`).forEach((symptom) => {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1);
    });
  });
  askHistory.slice(0, 10).forEach((entry) => {
    extractSymptoms(`${entry.concern} ${entry.nextStep} ${entry.concernType}`).forEach((symptom) => {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1);
    });
  });
  guideResults.slice(0, 5).forEach((entry) => {
    extractSymptoms(entry.resultSummary).forEach((symptom) => {
      symptomCounts.set(symptom, (symptomCounts.get(symptom) ?? 0) + 1);
    });
  });
  const repeatingSymptoms = Array.from(symptomCounts.entries())
    .filter(([, count]) => count >= 2)
    .map(([symptom]) => symptom)
    .slice(0, 4);

  const unresolvedAskConcerns = askHistory
    .filter((entry) => !entry.savedToDoctorSummary)
    .slice(0, 3)
    .map((entry) => entry.concern);

  const blockedFromSummary = doctorItems
    .filter((item) => item.type === 'next_action' && /status:\s*blocked/i.test(item.content) && inLastDays(item.createdAt, 14))
    .length;
  const blockedActions = blockedFromSummary + (nextAction?.status === 'blocked' ? 1 : 0);

  const redFlags7 = redFlags.filter((log) => inLastDays(log.createdAt, 7)).length;
  const redFlags14 = redFlags.filter((log) => inLastDays(log.createdAt, 14)).length;
  const repeatedRedFlags = redFlags7 >= 2 || redFlags14 >= 3;

  const currentWeekSymptoms = checkins
    .filter((c) => inLastDays(c.createdAt, 7) && c.symptoms.trim().length > 0)
    .length;
  const priorWeekSymptoms = checkins
    .filter((c) => {
      const daysAgo = (Date.now() - new Date(c.createdAt).getTime()) / (24 * 60 * 60 * 1000);
      return daysAgo > 7 && daysAgo <= 14 && c.symptoms.trim().length > 0;
    })
    .length;
  const increasingSymptomFrequency = currentWeekSymptoms > priorWeekSymptoms;

  const worseningCheckinPatterns =
    moodTrend === 'declining' ||
    energyTrend === 'declining' ||
    stressTrend === 'declining' ||
    sleepTrend === 'declining';

  const recentCheckinDates = new Set(checkins.slice(0, 14).map((c) => c.date));
  const missedCheckins = lastNDates(7).filter((date) => !recentCheckinDates.has(date)).length;
  const frequentAskUsage = askHistory.filter((entry) => inLastDays(entry.createdAt, 7)).length >= 3;
  const repeatedBlockedActions = blockedActions >= 2 || followUpSignals.repeatedBlocked;

  const currentState = { moodTrend, energyTrend, stressTrend, sleepTrend };
  const riskSignals = {
    repeatedRedFlags,
    increasingSymptomFrequency,
    worseningCheckinPatterns,
  };
  const engagementSignals = {
    missedCheckins,
    frequentAskUsage,
    repeatedBlockedActions,
  };

  const recommendedFocusArea = chooseFocusArea(
    riskSignals,
    currentState,
    engagementSignals,
    followUpSignals,
  );

  return {
    updatedAt: new Date().toISOString(),
    currentState,
    activeConcerns: {
      repeatingSymptoms,
      unresolvedAskConcerns,
      blockedActions,
    },
    riskSignals,
    engagementSignals,
    profileContext,
    followUpSignals,
    guideActivity,
    safetySignalSummary,
    recentBlockers,
    recommendedFocusArea,
    trendSummary: trendSummary(currentState, recommendedFocusArea, profileContext, guideActivity),
  };
}

let healthSnapshotCache: HealthSnapshot | null = null;

export function saveHealthSnapshot(snapshot: HealthSnapshot) {
  healthSnapshotCache = snapshot;
}

export function loadHealthSnapshot(): HealthSnapshot {
  const stored = healthSnapshotCache ?? createEmptyHealthSnapshot();
  return {
    ...createEmptyHealthSnapshot(),
    ...stored,
    profileContext: { ...createEmptyHealthSnapshot().profileContext, ...stored.profileContext },
    followUpSignals: { ...createEmptyHealthSnapshot().followUpSignals, ...stored.followUpSignals },
    guideActivity: { ...createEmptyHealthSnapshot().guideActivity, ...stored.guideActivity },
  };
}

export function resetHealthSnapshotCacheForTests() {
  healthSnapshotCache = null;
}

export function refreshHealthSnapshot(inputs?: HealthSnapshotInputs): HealthSnapshot {
  const snapshot = buildHealthSnapshot(inputs);
  saveHealthSnapshot(snapshot);
  return snapshot;
}
