export type SnapshotTrend = 'improving' | 'stable' | 'declining' | 'unknown';

export type SnapshotFocusArea =
  | 'rest and recovery'
  | 'stress reduction support'
  | 'symptom tracking consistency'
  | 'preparation for clinician visit'
  | 'routine stabilization';

export interface HealthSnapshot {
  updatedAt: string;
  currentState: {
    moodTrend: SnapshotTrend;
    energyTrend: SnapshotTrend;
    stressTrend: SnapshotTrend;
    sleepTrend: SnapshotTrend;
  };
  activeConcerns: {
    repeatingSymptoms: string[];
    unresolvedAskConcerns: string[];
    blockedActions: number;
  };
  riskSignals: {
    repeatedRedFlags: boolean;
    increasingSymptomFrequency: boolean;
    worseningCheckinPatterns: boolean;
  };
  engagementSignals: {
    missedCheckins: number;
    frequentAskUsage: boolean;
    repeatedBlockedActions: boolean;
  };
  recommendedFocusArea: SnapshotFocusArea;
  trendSummary: string;
}
