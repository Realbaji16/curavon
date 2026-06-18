// Backend adapter placeholders only.
// Do not use these until a backend provider is selected.

// SupabaseAdapter (NOT IMPLEMENTED)
// Expected methods:
// - connect(userId)
// - disconnect()
// - pushLocalChanges(operations)
// - pullRemoteChanges(lastSyncTime)
// - resolveConflict(local, remote)
// Expected auth flow:
// - use future authenticated user session token
// - map userId to row-level data ownership
// Expected sync mapping:
// - SyncEntityType -> backend tables/collections
// - SyncOperationType -> insert/update/delete/upsert semantics

// FirebaseAdapter (NOT IMPLEMENTED)
// Expected methods:
// - connect(userId)
// - disconnect()
// - pushLocalChanges(operations)
// - pullRemoteChanges(lastSyncTime)
// - resolveConflict(local, remote)
// Expected auth flow:
// - use future authenticated user context
// Expected sync mapping:
// - SyncEntityType -> document collections
// - SyncOperationType -> create/update/delete/batch writes

export {};
