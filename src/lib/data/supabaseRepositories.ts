import {
  appendSupabaseAiDecisionTrace,
  appendSupabaseAiUsageLog,
  readSupabaseAiDecisionTraces,
  readSupabaseAiUsageLogs,
  readSupabaseAskHistory,
  readSupabaseDailyCheckins,
  readSupabaseDoctorSummaryDrafts,
  readSupabaseDoctorSummaryItems,
  readSupabaseFollowUps,
  readSupabaseGuideResults,
  readSupabaseHealthProfile,
  readSupabaseNextActionState,
  readSupabaseProfile,
  readSupabaseRedFlagLogs,
  readSupabaseActivityInsights,
  readSupabaseUserPreferences,
  saveSupabaseAskHistoryEntry,
  saveSupabaseDailyCheckin,
  saveSupabaseDoctorSummaryDraft,
  saveSupabaseDoctorSummaryItem,
  saveSupabaseFollowUp,
  saveSupabaseGuideResult,
  saveSupabaseHealthProfile,
  saveSupabaseNextActionState,
  saveSupabaseRedFlagLog,
  saveSupabaseActivityInsights,
  saveSupabaseUserPreferences,
  softDeleteUserRows,
  upsertSupabaseProfile,
} from './supabaseDataClient';
import type { SupabaseDataPorts } from './supabaseDataPorts';

/** Wire Supabase table operations to typed persistence ports (Phase 1 scaffolding). */
export function createSupabaseDataPorts(): SupabaseDataPorts {
  return {
    profile: {
      read: readSupabaseProfile,
      upsert: upsertSupabaseProfile,
    },
    healthProfile: {
      read: readSupabaseHealthProfile,
      save: saveSupabaseHealthProfile,
      softDelete: () => softDeleteUserRows('health_profiles'),
    },
    dailyCheckins: {
      list: readSupabaseDailyCheckins,
      save: saveSupabaseDailyCheckin,
      softDeleteAll: () => softDeleteUserRows('daily_checkins'),
    },
    askHistory: {
      list: readSupabaseAskHistory,
      save: saveSupabaseAskHistoryEntry,
      softDeleteAll: () => softDeleteUserRows('ask_history'),
    },
    guideResults: {
      list: readSupabaseGuideResults,
      save: saveSupabaseGuideResult,
      softDeleteAll: () => softDeleteUserRows('guide_results'),
    },
    followUps: {
      list: readSupabaseFollowUps,
      save: saveSupabaseFollowUp,
      softDeleteAll: () => softDeleteUserRows('follow_ups'),
    },
    nextActionState: {
      read: readSupabaseNextActionState,
      save: saveSupabaseNextActionState,
      softDelete: () => softDeleteUserRows('next_action_state'),
    },
    doctorSummary: {
      listItems: readSupabaseDoctorSummaryItems,
      saveItem: saveSupabaseDoctorSummaryItem,
      listDrafts: readSupabaseDoctorSummaryDrafts,
      saveDraft: saveSupabaseDoctorSummaryDraft,
      softDeleteAll: async () => {
        await softDeleteUserRows('doctor_summary_items');
        await softDeleteUserRows('doctor_summary_drafts');
      },
    },
    redFlagLogs: {
      list: readSupabaseRedFlagLogs,
      save: saveSupabaseRedFlagLog,
      softDeleteAll: () => softDeleteUserRows('red_flag_logs'),
    },
    activityInsights: {
      read: readSupabaseActivityInsights,
      save: saveSupabaseActivityInsights,
      softDeleteAll: () => softDeleteUserRows('activity_insights'),
    },
    aiAudit: {
      listUsageLogs: readSupabaseAiUsageLogs,
      appendUsageLog: appendSupabaseAiUsageLog,
      listDecisionTraces: readSupabaseAiDecisionTraces,
      appendDecisionTrace: appendSupabaseAiDecisionTrace,
      softDeleteAll: async () => {
        await softDeleteUserRows('ai_usage_logs');
        await softDeleteUserRows('ai_decision_traces');
      },
    },
    userPreferences: {
      read: readSupabaseUserPreferences,
      save: saveSupabaseUserPreferences,
      softDelete: () => softDeleteUserRows('user_preferences'),
    },
  };
}
