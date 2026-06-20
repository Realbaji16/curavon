export interface GuideResultRecord {
  guideId: string;
  guideTitle: string;
  completedAt: string;
  resultSummary: string;
  safeNextStep: string;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  sourceSignals: string[];
}
