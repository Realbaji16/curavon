# Phase 3 form import execution

## Current posture: CLI-first

Phase 3 form imports run **offline on an operator machine** via the CLI. Curavon does **not** yet define application admin roles (no `is_admin` flag, no admin membership table, no admin-only RLS policies for form insight tables).

Because of that:

- **Do not expose** `app/api/admin/forms/*` routes publicly.
- **Do not fake** admin authorization in HTTP handlers.
- **Use** `npm run forms:import` for imports today.

## CLI workflow

```bash
# Local artifacts only (normalized JSON + markdown report)
npm run forms:import -- --file data/form-imports/raw/your-export.csv

# Also persist de-identified rows + insights to Supabase (service role required)
npm run forms:import -- --file data/form-imports/raw/your-export.csv --persist
```

`--persist` requires `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`. Only **de-identified** payloads and derived insights are stored — never raw CSV text.

### Outputs

| Path | Contents |
| --- | --- |
| `data/form-imports/normalized/latest-normalized-responses.json` | De-identified rows (gitignored) |
| `data/form-imports/normalized/latest-form-insights.json` | Extracted insights (gitignored) |
| `data/form-imports/normalized/latest-import-summary.json` | Public-safe summary — no raw answers |
| `data/form-imports/reports/latest-form-insight-report.md` | Reviewer report |

### Upload limits (CLI + future API)

- Accepted types: `.csv`, `.zip` (ZIP must contain at least one `.csv`)
- Max size: **5 MiB** (`FORM_IMPORT_MAX_BYTES`)

## Deferred: admin HTTP API

Handlers are scaffolded in `src/lib/server/formInsightImportHandler.ts` but **not mounted** as routes until admin roles exist:

| Planned route | Purpose |
| --- | --- |
| `POST /api/admin/forms/import` | CSV/ZIP upload → import + optional persist |
| `GET /api/admin/forms/insights` | List insights for review |
| `GET/PATCH /api/admin/forms/insights/[id]` | Read / update review status |

All handlers call `checkAdminFormImportAccess()` which currently returns `403 admin_roles_not_configured` for authenticated users.

### Before enabling routes

1. Add a real admin role model (e.g. profiles flag or separate admin allowlist).
2. Update `checkAdminFormImportAccess()` to verify that role.
3. Mount routes under `app/api/admin/forms/…` and protect with the same guard.
4. Keep returning `buildFormImportPublicSummary()` — never raw row answers.
5. Enforce `validateFormImportUpload()` on every upload.

## Safety

- Form insights are **product research signals** (`medicalTruth: false`).
- Raw Google Form exports stay in `data/form-imports/raw/` and are gitignored.
- Public/import summaries must not include `deidentifiedAnswers` or raw CSV content.
