import {
  APP_STORAGE_KEYS,
  CORE_HEALTH_DATA_KEYS,
  HEALTH_DERIVED_TELEMETRY_KEYS,
} from './storageKeys';
import { safeRead } from '../../utils/healthStorage';
import { getSupabaseUserId } from './supabaseDataAdapter';
import {
  insertEventPayload,
  saveSupabaseActivityInsights,
  saveSupabaseDailyCheckin,
  saveSupabaseDoctorSummaryItem,
  saveSupabaseHealthProfile,
  saveSupabaseNextActionState,
  saveSupabaseRedFlagLog,
  SupabaseDataError,
} from './supabaseDataAdapter';

const MIGRATION_STATUS_KEY = 'curavon_local_to_supabase_migration_status';

export type LocalToSupabaseMigrationPreview = {
  localCollections: Record<string, number>;
  excludedFromMigration: string[];
  ready: boolean;
  reason?: string;
};

export type LocalToSupabaseMigrationStatus = {
  completed: boolean;
  completedAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  migratedCollections: string[];
};

const EXCLUDED_MIGRATION_KEYS = [
  APP_STORAGE_KEYS.authDemoUsers,
  APP_STORAGE_KEYS.orchestratorLogs,
  APP_STORAGE_KEYS.aiDecisionTraces,
  APP_STORAGE_KEYS.aiObservabilitySummary,
  APP_STORAGE_KEYS.syncQueue,
  APP_STORAGE_KEYS.syncLogs,
];

function countLocalEntries(key: string): number {
  const value = safeRead<unknown>(key as typeof APP_STORAGE_KEYS.healthProfile, null);
  if (value == null) return 0;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'object') return 1;
  return 1;
}

function defaultMigrationStatus(): LocalToSupabaseMigrationStatus {
  return safeRead<LocalToSupabaseMigrationStatus>(MIGRATION_STATUS_KEY, {
    completed: false,
    completedAt: null,
    lastAttemptAt: null,
    lastError: null,
    migratedCollections: [],
  });
}

export function getLocalToSupabaseMigrationStatus(): LocalToSupabaseMigrationStatus {
  return defaultMigrationStatus();
}

export function markLocalToSupabaseMigrationComplete(collections: string[]): LocalToSupabaseMigrationStatus {
  const next: LocalToSupabaseMigrationStatus = {
    completed: true,
    completedAt: new Date().toISOString(),
    lastAttemptAt: new Date().toISOString(),
    lastError: null,
    migratedCollections: collections,
  };
  localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(next));
  return next;
}

export async function previewLocalDataForMigration(): Promise<LocalToSupabaseMigrationPreview> {
  const userId = await getSupabaseUserId();
  if (!userId) {
    return {
      localCollections: {},
      excludedFromMigration: EXCLUDED_MIGRATION_KEYS,
      ready: false,
      reason: 'Sign in with Supabase before migrating local data.',
    };
  }

  const localCollections: Record<string, number> = {};
  for (const key of CORE_HEALTH_DATA_KEYS) {
    localCollections[key] = countLocalEntries(key);
  }
  for (const key of HEALTH_DERIVED_TELEMETRY_KEYS) {
    if (key === APP_STORAGE_KEYS.aiDecisionTraces) continue;
    localCollections[key] = countLocalEntries(key);
  }

  return {
    localCollections,
    excludedFromMigration: EXCLUDED_MIGRATION_KEYS,
    ready: true,
  };
}

export async function migrateLocalDataToSupabase(): Promise<LocalToSupabaseMigrationStatus> {
  const preview = await previewLocalDataForMigration();
  if (!preview.ready) {
    const status: LocalToSupabaseMigrationStatus = {
      ...defaultMigrationStatus(),
      lastAttemptAt: new Date().toISOString(),
      lastError: preview.reason ?? 'Migration is not ready.',
    };
    localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
    return status;
  }

  try {
    const profile = safeRead(APP_STORAGE_KEYS.healthProfile, null);
    if (profile) await saveSupabaseHealthProfile(profile);

    const checkins = safeRead<import('../../types/health').DailyCheckIn[]>(
      APP_STORAGE_KEYS.dailyCheckins,
      [],
    );
    for (const checkin of checkins) {
      await saveSupabaseDailyCheckin(checkin);
    }

    const nextAction = safeRead(APP_STORAGE_KEYS.nextActionState, null);
    if (nextAction) await saveSupabaseNextActionState(nextAction);

    const summaryItems = safeRead<import('../../types/doctorSummary').DoctorSummaryItem[]>(
      APP_STORAGE_KEYS.doctorSummaryItems,
      [],
    );
    for (const item of summaryItems) {
      await saveSupabaseDoctorSummaryItem(item);
    }

    const redFlags = safeRead<import('../../types/doctorSummary').RedFlagLog[]>(
      APP_STORAGE_KEYS.redFlagLogs,
      [],
    );
    for (const log of redFlags) {
      await saveSupabaseRedFlagLog(log);
    }

    const insights = safeRead<import('../../types/activityInsights').ActivityInsightStore | null>(
      APP_STORAGE_KEYS.activityInsights,
      null,
    );
    if (insights) await saveSupabaseActivityInsights(insights);

    const consentRecord = {
      consentComplete: safeRead(APP_STORAGE_KEYS.consentComplete, false),
      setupComplete: safeRead(APP_STORAGE_KEYS.setupComplete, false),
      profileSetup: safeRead(APP_STORAGE_KEYS.profileSetup, null),
      migratedAt: new Date().toISOString(),
    };
    await insertEventPayload('consent_records', consentRecord);

    return markLocalToSupabaseMigrationComplete([
      'health_profiles',
      'daily_checkins',
      'next_action_state',
      'doctor_summary_items',
      'red_flag_logs',
      'activity_insights',
      'consent_records',
    ]);
  } catch (error) {
    const message =
      error instanceof SupabaseDataError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Migration failed.';

    const status: LocalToSupabaseMigrationStatus = {
      ...defaultMigrationStatus(),
      lastAttemptAt: new Date().toISOString(),
      lastError: message,
    };
    localStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
    return status;
  }
}
