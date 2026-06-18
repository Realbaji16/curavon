import type { AskHistoryEntry } from '../../types/askIntake';
import type { DoctorSummaryItem, RedFlagLog } from '../../types/doctorSummary';
import type { DailyCheckIn, HealthProfile, NextActionState } from '../../types/health';

export interface DoctorSummaryInput {
  profileSnapshot: Pick<
    HealthProfile,
    'preferredName' | 'primaryGoals' | 'conditions' | 'medications' | 'allergies' | 'doctorQuestions'
  >;
  activeConcerns: string[];
  recentCheckIns: DailyCheckIn[];
  askHistory: AskHistoryEntry[];
  guideResults: DoctorSummaryItem[];
  nextActions: NextActionState[];
  redFlagLogs: RedFlagLog[];
  userNotes: string[];
  dateRange: string;
}

export interface DoctorSummarySection {
  title: string;
  content: string;
  sourceSignals: string[];
}

export interface DoctorSummaryOutput {
  summaryTitle: string;
  dateRange: string;
  mainConcerns: string[];
  symptomTimeline: string[];
  recentPatterns: string[];
  actionsTried: string[];
  questionsForClinician: string[];
  redFlagNotes: string[];
  medicationNotes: string[];
  userGoals: string[];
  footer: string;
  aiUsed: boolean;
  fallbackUsed: boolean;
}

export interface DoctorSummaryCompressionPayload {
  dateRange: string;
  mainConcernCount: number;
  activeConcernSummaries: string[];
  repeatedPatterns: string[];
  recentActions: string[];
  redFlagSummaries: string[];
  medicationNoteSummaries: string[];
  userQuestions: string[];
}
