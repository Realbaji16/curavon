export type DoctorSummaryItemType =
  | 'checkin'
  | 'guided_flow'
  | 'ask_intake'
  | 'next_action'
  | 'red_flag'
  | 'medication_note'
  | 'doctor_question';

export type DoctorSummarySource =
  | 'Today Check-In'
  | 'Guides'
  | 'Ask Curavon'
  | 'Profile'
  | 'Next Action';

export type DoctorSummarySeverity = 'normal' | 'attention' | 'urgent';

export interface DoctorSummaryItem {
  id: string;
  type: DoctorSummaryItemType;
  title: string;
  source: DoctorSummarySource;
  content: string;
  tags: string[];
  severity: DoctorSummarySeverity;
  createdAt: string;
  includedInSummary: boolean;
}

export interface DoctorSummaryDraft {
  id: string;
  title: string;
  dateRange: string;
  includedItemIds: string[];
  summaryText: string;
  questionsForClinician: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RedFlagLog {
  id: string;
  source: DoctorSummarySource | string;
  matchedConcern: string;
  userText: string;
  guidanceShown: string;
  createdAt: string;
}
