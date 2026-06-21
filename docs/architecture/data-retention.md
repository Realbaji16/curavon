# Data retention and soft delete

Curavon health data uses **soft delete** via `deleted_at` on Supabase tables. Hard deletes are reserved for explicit admin/cleanup flows.

## Normal app reads

- All standard adapter and data-client reads apply `applyNotDeleted()` (equivalent to `.is('deleted_at', null)`).
- Soft-deleted rows are **hidden** from Home, Ask, flows, doctor summary, follow-ups, guide results, red-flag logs, and activity insights.
- `profiles` does not use soft delete; auth profile rows follow Supabase auth lifecycle.

## Deletion requests vs row soft delete

| Mechanism | Purpose |
| --- | --- |
| `deleted_at` on health tables | User-initiated or app-initiated removal of a record from normal UI |
| `data_deletion_requests` | Audit trail that the user requested account/health data deletion (processed server-side) |
| `data_export_requests` | Audit trail for export requests |

Deletion/export **request** rows may also carry `deleted_at` for admin cleanup, but they are separate from health content. Product copy treats requests as pending audit records, not immediate erasure.

## includeDeleted (internal only)

`ReadQueryOptions.includeDeleted` defaults to **false**. It exists on low-level client helpers for future admin/audit tooling and must not be exposed in normal UI paths.

## Future cleanup

Server-side jobs may hard-purge rows after retention policy windows. Until then, soft-deleted rows remain in Postgres but are invisible to the app.
