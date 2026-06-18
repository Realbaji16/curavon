# Curavon Data Audit v1

Audit date: 2026-06-18  
Mode: audit-only (no backend migration)

## Central Storage Keys

- **Status:** mostly complete
- **Files:** `src/lib/data/storageKeys.ts`, `src/utils/healthStorage.ts` (`HEALTH_STORAGE_KEYS` alias)
- **What works:** `APP_STORAGE_KEYS` centralizes core keys; `CORE_HEALTH_DATA_KEYS` and `AUTH_SESSION_KEYS` defined.
- **Incomplete:** adapter uses separate `curavon_collection_*` keys not all listed in `APP_STORAGE_KEYS`.
- **Priority:** P1

## localDataAdapter

- **Status:** mostly complete
- **Files:** `src/lib/data/localDataAdapter.ts`, `src/lib/data/dataAdapter.ts`
- **What works:** user-scoped collections, legacy fallback reads, exportUserData, clearUserData.
- **Incomplete:** most feature modules still write legacy top-level keys directly, not through adapter.
- **Priority:** P1

## Auth Adapter

- **Status:** mostly complete
- **Files:** `src/lib/auth/localAuthAdapter.ts`, `src/lib/auth/authProvider.tsx`
- **What works:** local demo sign-in/up/out, session read, deleteLocalAccount.
- **Incomplete:** passwords stored in plaintext in `authDemoUsers` (demo-only, documented in code).
- **Priority:** P2 (acceptable for local demo; P0 if real auth expected)

## Export

- **Status:** mostly complete
- **Files:** `src/lib/data/dataExport.ts`, `src/context/HealthContext.tsx`, `src/screens/Settings.tsx`
- **What works:** structured JSON export of core health collections.
- **Incomplete:** does not export AI observability keys, sync queue, orchestrator logs, follow-up debug log, auth credential store.
- **Priority:** P1

## Delete Health Data

- **Status:** mostly complete
- **Files:** `src/lib/data/dataDeletion.ts`, `src/context/HealthContext.tsx`, `src/screens/Settings.tsx`
- **What works:** clears `CORE_HEALTH_DATA_KEYS`; Settings also clears doctor summary via context.
- **Incomplete:** telemetry/meta keys (`aiDecisionTraces`, `syncQueue`, `orchestratorLogs`, `followUpDebugLog`, `aiUsageLog`) not in `CORE_HEALTH_DATA_KEYS`.
- **Priority:** P1

## Delete Account

- **Status:** mostly complete
- **Files:** `src/lib/data/dataDeletion.ts`, `src/lib/auth/localAuthAdapter.ts`, `src/screens/Settings.tsx`
- **What works:** separate "delete local account" vs "delete account and health data"; sign-out preserves health data.
- **Incomplete:** adapter-scoped collection keys may remain after legacy key clear.
- **Priority:** P1

## Backup / Restore

- **Status:** mostly complete
- **Files:** `src/lib/data/dataBackup.ts`, `src/lib/data/dataRestore.ts`
- **What works:** backup preview, merge/replace restore, schema version stamp, validation.
- **Incomplete:** restore does not restore auth session by default; adapter collection keys not included.
- **Priority:** P2

## Corrupted Storage Handling

- **Status:** mostly complete
- **Files:** `src/lib/data/dataIntegrity.ts`, `src/lib/data/dataHealthCheck.ts`, `src/utils/healthStorage.ts` (`safeRead`)
- **What works:** safeRead fallback; detectCorruptedKeys + repair; health check UI in Settings.
- **Incomplete:** not all keys scanned in health check (subset only).
- **Priority:** P2

## User-Scoped Data

- **Status:** partial
- **Files:** `src/lib/data/localDataAdapter.ts`, various storage helpers
- **What works:** adapter supports userId buckets; authDemoUserId key exists.
- **Incomplete:** legacy keys are device-global, not user-scoped.
- **Priority:** P1

## Sync Queue Placeholder

- **Status:** partial (expected)
- **Files:** `src/lib/sync/syncQueue.ts`, `syncState.ts`, `syncGuards.ts`, `syncContract.ts`
- **What works:** queue on save/update hooks; simulated processQueue; guards and logging.
- **Incomplete:** no real backend sync.
- **Priority:** P2

## Required Data Checks

1. **Scattered storage key strings:** reduced but still present (`curavon_collection_*`, `curavon_ai_reason_cache` in legacy AI file).
2. **Unsafe JSON.parse:** mitigated via `safeRead` / `safeJsonParse` in most paths; raw parse only in Settings backup file read (try/catch).
3. **Missing fallback on corrupted storage:** mostly handled.
4. **Sign out deleting health data incorrectly:** no — sign-out clears auth session keys only.
5. **Delete health data leaving sensitive records:** partial risk — AI/sync/debug keys may remain.
6. **Export including secrets/prompts/logs:** export excludes AI observability; includes red-flag user text and health notes (expected health export).
7. **Backup/restore validation gaps:** basic validation present; no schema migration on restore beyond version stamp.
8. **Data not scoped by user:** legacy keys are global.
9. **Old keys not in deletion/export:** adapter keys and meta telemetry keys gap.
10. **AI logs storing sensitive raw text:** `aiUsageLog` stores task metadata only; red-flag logs store user text; decision traces store sanitized metadata (input summary truncated in policy, not full prompts).

## Data Audit Summary

Local-first data layer is **functional and mostly safe**, with **dual storage models** (legacy top-level keys vs adapter collections) as the main structural risk. Delete/export coverage should be aligned before real user testing.
