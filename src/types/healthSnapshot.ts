export type SnapshotTrend = 'improving' | 'stable' | 'declining' | 'unknown';

export type SnapshotFocusArea =
  | 'routine_stabilization'
  | 'stress_support'
  | 'symptom_tracking'
  | 'clinician_preparation'
  | 'reduce_friction'
  | 'safety_awareness'
  | 'general_wellness';

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
  profileContext: {
    goalCount: number;
    hasMedications: boolean;
    hasConditions: boolean;
    primaryGoalsSummary: string;
  };
  followUpSignals: {
    recentHelped: number;
    recentBlocked: number;
    recentWorse: number;
    recentNotDone: number;
    repeatedBlocked: boolean;
    repeatedWorse: boolean;
  };
  guideActivity: {
    recentGuideTitles: string[];
    recentGuideCount: number;
  };
  safetySignalSummary: string;
  recentBlockers: string[];
  recommendedFocusArea: SnapshotFocusArea;
  trendSummary: string;
}
