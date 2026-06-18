import type { AskHistoryEntry } from '../types/askIntake';
import type { DoctorSummaryItem, RedFlagLog } from '../types/doctorSummary';
import type { DailyCheckIn, NextActionState } from '../types/health';
import type { HealthSnapshot, SnapshotFocusArea, SnapshotTrend } from '../types/healthSnapshot';
import { safeRead, safeWrite, todayDateKey } from './healthStorage';

const DAILY_CHECKINS_KEY = 'curavon_daily_checkins';
const ASK_HISTORY_KEY = 'curavon_ask_history';
const NEXT_ACTION_KEY = 'curavon_next_action_state';
const DOCTOR_ITEMS_KEY = 'curavon_doctor_summary_items';
const RED_FLAGS_KEY = 'curavon_red_flag_logs';
export const HEALTH_SNAPSHOT_KEY = 'curavon_health_snapshot';

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
    recommendedFocusArea: 'routine stabilization',
    trendSummary: 'Build consistency with one small daily check-in.',
  };
}

function chooseFocusArea(
  risk: HealthSnapshot['riskSignals'],
  trends: HealthSnapshot['currentState'],
  engagement: HealthSnapshot['engagementSignals'],
): SnapshotFocusArea {
  if (risk.repeatedRedFlags) return 'preparation for clinician visit';
  if (risk.increasingSymptomFrequency) return 'symptom tracking consistency';
  if (trends.stressTrend === 'declining' || trends.moodTrend === 'declining') {
    return 'stress reduction support';
  }
  if (trends.sleepTrend === 'declining' || trends.energyTrend === 'declining') {
    return 'rest and recovery';
  }
  if (engagement.repeatedBlockedActions || engagement.missedCheckins >= 3) {
    return 'routine stabilization';
  }
  return 'symptom tracking consistency';
}

function trendSummary(currentState: HealthSnapshot['currentState'], focus: SnapshotFocusArea): string {
  const declining = Object.entries(currentState)
    .filter(([, trend]) => trend === 'declining')
    .map(([key]) => key.replace('Trend', ''));
  if (declining.length > 0) {
    return `${declining.slice(0, 2).join(' and ')} patterns look heavier recently. Focus: ${focus}.`;
  }
  const improving = Object.entries(currentState)
    .filter(([, trend]) => trend === 'improving')
    .map(([key]) => key.replace('Trend', ''));
  if (improving.length > 0) {
    return `${improving.slice(0, 2).join(' and ')} patterns look steadier. Keep focus on ${focus}.`;
  }
  return `Patterns are mostly stable. Keep focus on ${focus}.`;
}

export function buildHealthSnapshot(): HealthSnapshot {
  const checkins = safeRead<DailyCheckIn[]>(DAILY_CHECKINS_KEY, [])
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const askHistory = safeRead<AskHistoryEntry[]>(ASK_HISTORY_KEY, []);
  const nextAction = safeRead<NextActionState | null>(NEXT_ACTION_KEY, null);
  const doctorItems = safeRead<DoctorSummaryItem[]>(DOCTOR_ITEMS_KEY, []);
  const redFlags = safeRead<RedFlagLog[]>(RED_FLAGS_KEY, []);

  if (checkins.length === 0 && askHistory.length === 0 && !nextAction && redFlags.length === 0) {
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
  const repeatedBlockedActions = blockedActions >= 2;

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

  const recommendedFocusArea = chooseFocusArea(riskSignals, currentState, engagementSignals);

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
    recommendedFocusArea,
    trendSummary: trendSummary(currentState, recommendedFocusArea),
  };
}

export function saveHealthSnapshot(snapshot: HealthSnapshot) {
  safeWrite(HEALTH_SNAPSHOT_KEY, snapshot);
}

export function loadHealthSnapshot(): HealthSnapshot {
  return safeRead<HealthSnapshot>(HEALTH_SNAPSHOT_KEY, createEmptyHealthSnapshot());
}

export function refreshHealthSnapshot(): HealthSnapshot {
  const snapshot = buildHealthSnapshot();
  saveHealthSnapshot(snapshot);
  return snapshot;
}
