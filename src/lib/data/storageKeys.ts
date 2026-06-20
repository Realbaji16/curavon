export const APP_STORAGE_KEYS = {
  healthProfile: 'curavon_health_profile',
  dailyCheckins: 'curavon_daily_checkins',
  askHistory: 'curavon_ask_history',
  doctorSummaryItems: 'curavon_doctor_summary_items',
  doctorSummaryDrafts: 'curavon_doctor_summary_drafts',
  redFlagLogs: 'curavon_red_flag_logs',
  nextActionState: 'curavon_next_action_state',
  followUps: 'curavon_follow_ups',
  healthSnapshot: 'curavon_health_snapshot',
  aiUsageLog: 'curavon_ai_usage_log',
  guideResults: 'curavon_guide_results',
  authDemoUser: 'curavon_auth_demo_user',
  authDemoUsers: 'curavon_auth_demo_users',
  authDemoUserId: 'curavon_demo_user_id',
  consentComplete: 'curavon_consent_complete',
  setupComplete: 'curavon_setup_complete',
  profileSetup: 'curavon_profile_setup',
  userPreferences: 'curavon_user_preferences',
  onboardingSeen: 'curavon_onboarding_seen',
  dailySteps: 'curavon_daily_steps',
  followUpDebugLog: 'curavon_follow_up_debug_log',
  dataSchemaVersion: 'curavon_data_schema_version',
  localBackupMetadata: 'curavon_local_backup_metadata',
  corruptedDataBackup: 'curavon_corrupted_data_backup',
  syncQueue: 'curavon_sync_queue',
  syncState: 'curavon_sync_state',
  syncLogs: 'curavon_sync_logs',
  orchestratorLogs: 'curavon_orchestrator_logs',
  aiDecisionTraces: 'curavon_ai_decision_traces',
  aiObservabilitySummary: 'curavon_ai_observability_summary',
  aiBudgetState: 'curavon_ai_budget_state',
  aiPolicyState: 'curavon_ai_policy_state',
  activityInsights: 'curavon_meta_activity_insights',
} as const;

export type AppStorageKey = (typeof APP_STORAGE_KEYS)[keyof typeof APP_STORAGE_KEYS];

/** User-owned health records (export + delete with health data). */
export const CORE_HEALTH_DATA_KEYS: AppStorageKey[] = [
  APP_STORAGE_KEYS.healthProfile,
  APP_STORAGE_KEYS.dailyCheckins,
  APP_STORAGE_KEYS.askHistory,
  APP_STORAGE_KEYS.doctorSummaryItems,
  APP_STORAGE_KEYS.doctorSummaryDrafts,
  APP_STORAGE_KEYS.nextActionState,
  APP_STORAGE_KEYS.redFlagLogs,
  APP_STORAGE_KEYS.followUps,
  APP_STORAGE_KEYS.healthSnapshot,
  APP_STORAGE_KEYS.aiUsageLog,
  APP_STORAGE_KEYS.guideResults,
  APP_STORAGE_KEYS.userPreferences,
  APP_STORAGE_KEYS.dailySteps,
];

/** Health-derived AI/telemetry metadata cleared with delete health data. Excludes raw prompts/responses. */
export const HEALTH_DERIVED_TELEMETRY_KEYS: AppStorageKey[] = [
  APP_STORAGE_KEYS.aiDecisionTraces,
  APP_STORAGE_KEYS.aiObservabilitySummary,
  APP_STORAGE_KEYS.aiBudgetState,
  APP_STORAGE_KEYS.aiPolicyState,
  APP_STORAGE_KEYS.orchestratorLogs,
  APP_STORAGE_KEYS.followUpDebugLog,
  APP_STORAGE_KEYS.syncQueue,
  APP_STORAGE_KEYS.syncState,
  APP_STORAGE_KEYS.syncLogs,
];

/** Recovery/backup metadata — cleared on delete health data for a clean local reset. */
export const RECOVERY_METADATA_KEYS: AppStorageKey[] = [
  APP_STORAGE_KEYS.localBackupMetadata,
  APP_STORAGE_KEYS.corruptedDataBackup,
  APP_STORAGE_KEYS.dataSchemaVersion,
];

/** App/session keys — cleared on sign out or delete account, not on sign-out-only. */
export const AUTH_SESSION_KEYS: AppStorageKey[] = [
  APP_STORAGE_KEYS.authDemoUser,
  APP_STORAGE_KEYS.consentComplete,
  APP_STORAGE_KEYS.setupComplete,
  APP_STORAGE_KEYS.profileSetup,
];

/** Prefixes cleared with delete health data (meta-system analytics, behavior traces). */
export const HEALTH_DERIVED_DELETE_PREFIXES = ['curavon_meta_'] as const;

/** All keys removed by delete all health data. */
export const DELETE_HEALTH_DATA_KEYS: AppStorageKey[] = [
  ...CORE_HEALTH_DATA_KEYS,
  ...HEALTH_DERIVED_TELEMETRY_KEYS,
  ...RECOVERY_METADATA_KEYS,
];

/** User-facing export keys — no secrets, raw prompts, or model responses. */
export const EXPORT_HEALTH_DATA_KEYS: AppStorageKey[] = [
  ...CORE_HEALTH_DATA_KEYS,
  APP_STORAGE_KEYS.activityInsights,
];
