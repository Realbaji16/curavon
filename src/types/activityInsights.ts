export type ActivityInsightType =
  | 'action_pattern'
  | 'follow_up_pattern'
  | 'guide_pattern'
  | 'check_in_pattern'
  | 'safety_note'
  | 'data_quality'
  | 'preference';

export type ActivityInsightTone = 'neutral' | 'encouraging' | 'caution';

export type ActivityInsight = {
  id: string;
  type: ActivityInsightType;
  title: string;
  body: string;
  tone: ActivityInsightTone;
  evidence: string[];
  suggestedPreference?: {
    label: string;
    value: string;
  };
  createdAt: string;
  source: 'rules' | 'ai' | 'fallback';
  safetyLabel: 'not_medical' | 'safety_related';
};

export type ActivityInsightInputSummary = {
  dateRange: string;
  actionOutcomes: {
    completed: number;
    blocked: number;
    worse: number;
    skipped: number;
  };
  flowStats: {
    started: number;
    completed: number;
    abandoned: number;
    mostAbandonedFlow?: string;
  };
  checkInStats: {
    count: number;
    recentMoodTrend?: 'steadier' | 'lower' | 'mixed' | 'not_enough_data';
    recentEnergyTrend?: 'steadier' | 'lower' | 'mixed' | 'not_enough_data';
  };
  safetyStats: {
    redFlagCount: number;
    sources: string[];
  };
  repeatedBlockers: string[];
  commonFocusAreas: string[];
  followUpPatterns: string[];
  guidePatterns: string[];
};

export type ActivityInsightStore = {
  insights: ActivityInsight[];
  ruleGeneratedAt: string | null;
  lastAiRunAt: string | null;
  summaryHash: string | null;
};
