export type FullFlowSectionType =
  | 'context'
  | 'safety'
  | 'focus'
  | 'current_action'
  | 'next_step'
  | 'follow_up'
  | 'doctor_summary'
  | 'guide'
  | 'urgent_boundary';

export type FullFlowSection = {
  id: string;
  type: FullFlowSectionType;
  title: string;
  body: string;
  tone?: 'neutral' | 'supportive' | 'caution' | 'urgent';
  actionLabel?: string;
  actionTarget?: 'today' | 'ask' | 'guides' | 'doctor_summary' | 'settings';
};

export type FullFlowModel = {
  id: string;
  title: string;
  subtitle: string;
  source: 'today' | 'ask' | 'guide' | 'follow_up' | 'fallback';
  generatedAt: string;
  safetyLevel: 'normal' | 'caution' | 'urgent';
  currentAction: {
    title: string;
    body?: string;
    status?: string;
    source?: string;
  };
  sections: FullFlowSection[];
};
