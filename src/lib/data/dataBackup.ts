import { APP_STORAGE_KEYS } from './storageKeys';
import { exportCuravonData } from './dataExport';
import { getCurrentDataVersion, CURAVON_DATA_SCHEMA_VERSION } from './dataVersioning';
import { safeRead, safeWrite } from '../../utils/healthStorage';

export type CuravonLocalBackup = {
  appName: 'Curavon';
  backupVersion: '1.0.0';
  exportedAt: string;
  userId: string;
  authMode: 'local_demo';
  dataSchemaVersion: string;
  collections: {
    healthProfile: unknown;
    dailyCheckins: unknown[];
    askHistory: unknown[];
    doctorSummaryItems: unknown[];
    doctorSummaryDrafts: unknown[];
    redFlagLogs: unknown[];
    nextActionState: unknown;
    followUps: unknown[];
    memorySnapshot: unknown;
    guideResults: unknown[];
    userPreferences: unknown;
  };
};

type BackupMetadata = {
  lastBackupAt: string;
  userId: string;
  itemCounts: Record<string, number>;
};

export function downloadJsonFile(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function createLocalBackup(userId: string): CuravonLocalBackup {
  const exported = exportCuravonData(userId);
  const backup: CuravonLocalBackup = {
    appName: 'Curavon',
    backupVersion: '1.0.0',
    exportedAt: exported.exportedAt,
    userId,
    authMode: 'local_demo',
    dataSchemaVersion: getCurrentDataVersion() ?? CURAVON_DATA_SCHEMA_VERSION,
    collections: {
      healthProfile: exported.healthProfile,
      dailyCheckins: exported.dailyCheckins,
      askHistory: exported.askHistory,
      doctorSummaryItems: exported.doctorSummaryItems,
      doctorSummaryDrafts: exported.doctorSummaryDrafts,
      redFlagLogs: exported.redFlagLogs,
      nextActionState: exported.nextActionState,
      followUps: exported.followUps,
      memorySnapshot: exported.memorySnapshot,
      guideResults: exported.guideResults,
      userPreferences: exported.userPreferences,
    },
  };

  const metadata: BackupMetadata = {
    lastBackupAt: backup.exportedAt,
    userId,
    itemCounts: {
      dailyCheckins: backup.collections.dailyCheckins.length,
      askHistory: backup.collections.askHistory.length,
      doctorSummaryItems: backup.collections.doctorSummaryItems.length,
      doctorSummaryDrafts: backup.collections.doctorSummaryDrafts.length,
      redFlagLogs: backup.collections.redFlagLogs.length,
      followUps: backup.collections.followUps.length,
      guideResults: backup.collections.guideResults.length,
    },
  };
  safeWrite(APP_STORAGE_KEYS.localBackupMetadata, metadata);
  return backup;
}

export function getBackupPreview(userId: string) {
  const exported = exportCuravonData(userId);
  const backup: CuravonLocalBackup = {
    appName: 'Curavon',
    backupVersion: '1.0.0',
    exportedAt: exported.exportedAt,
    userId,
    authMode: 'local_demo',
    dataSchemaVersion: getCurrentDataVersion() ?? CURAVON_DATA_SCHEMA_VERSION,
    collections: {
      healthProfile: exported.healthProfile,
      dailyCheckins: exported.dailyCheckins,
      askHistory: exported.askHistory,
      doctorSummaryItems: exported.doctorSummaryItems,
      doctorSummaryDrafts: exported.doctorSummaryDrafts,
      redFlagLogs: exported.redFlagLogs,
      nextActionState: exported.nextActionState,
      followUps: exported.followUps,
      memorySnapshot: exported.memorySnapshot,
      guideResults: exported.guideResults,
      userPreferences: exported.userPreferences,
    },
  };
  return {
    appName: backup.appName,
    backupVersion: backup.backupVersion,
    exportedAt: backup.exportedAt,
    userId: backup.userId,
    collectionCounts: {
      dailyCheckins: backup.collections.dailyCheckins.length,
      askHistory: backup.collections.askHistory.length,
      doctorSummaryItems: backup.collections.doctorSummaryItems.length,
      followUps: backup.collections.followUps.length,
      guideResults: backup.collections.guideResults.length,
    },
  };
}

export function downloadLocalBackup(userId: string) {
  const backup = createLocalBackup(userId);
  const filename = `curavon-backup-${new Date().toISOString().slice(0, 10)}.json`;
  downloadJsonFile(filename, backup);
}

export function getLatestBackupMetadata() {
  return safeRead<BackupMetadata | null>(APP_STORAGE_KEYS.localBackupMetadata, null);
}
