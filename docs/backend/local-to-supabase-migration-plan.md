# Local → Supabase migration plan

Step 18 adds a **scaffold only**. Curavon does **not** auto-migrate local data.

## Principles

- User must explicitly start migration in a future step
- Preview local collections before migration
- Never delete local data automatically
- Never migrate raw AI prompts, raw model responses, or hidden reasoning
- Require authenticated Supabase session before migration

## Scaffold API

`src/lib/data/localToSupabaseMigration.ts`:

| Function | Purpose |
|----------|---------|
| `previewLocalDataForMigration()` | Count local collections; returns `ready: false` if not signed in |
| `migrateLocalDataToSupabase()` | Manual migration entry point (explicit call only) |
| `getLocalToSupabaseMigrationStatus()` | Read migration status from local status key |
| `markLocalToSupabaseMigrationComplete()` | Mark migration complete after successful run |

## Migrated in scaffold (when explicitly invoked)

- Health profile
- Daily check-ins
- Next action state
- Doctor summary items
- Red flag logs
- Activity insights store
- Consent/setup snapshot (consent_records event)

## Excluded

- Demo password registry (`authDemoUsers`)
- Orchestrator logs
- AI decision traces
- Sync queue/logs
- Raw prompts/responses (not stored locally by design)

## Future UI (not Step 18)

Settings may later add:

1. Preview counts
2. Confirm migration
3. Status / error display
4. Optional “keep local copy” note

## Rollback

Local data remains on device after migration until user clears it via existing export/delete controls.
