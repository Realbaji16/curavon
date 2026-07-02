# Form imports (Phase 3)

Local workspace for **Uploaded Forms Insight Layer** imports. This folder is for de-identified product research — not clinical records and not a document store.

## Layout

| Path | Purpose |
| --- | --- |
| `raw/` | Google Form CSV exports (or other structured form exports) before processing |
| `normalized/` | De-identified row outputs from the import pipeline (generated) |
| `reports/` | Aggregate insight reports for product/safety review (generated) |

## Workflow

1. **Raw Google Form CSV exports** go in `data/form-imports/raw/`.
2. **Raw files may contain sensitive or free-text health data** (names, phone numbers, detailed symptoms). Treat them like confidential pilot data.
3. **Do not commit raw CSVs** to git. `.gitignore` ignores contents of `raw/`, `normalized/`, and `reports/` except `.gitkeep` files.
4. **Run the import script** to parse raw exports and generate de-identified normalized rows and insight reports:

   ```bash
   npm run forms:import -- --file data/form-imports/raw/your-export.csv
   npm run forms:import -- --file data/form-imports/raw/your-export.csv --persist
   ```

   `--persist` writes de-identified rows and insights to Supabase (requires `SUPABASE_SERVICE_ROLE_KEY`). Admin HTTP import API is **deferred** until application admin roles exist — see `docs/architecture/phase3-form-import-execution.md`.

5. **Form insights guide product behavior, not clinical advice.** Extracted themes may inform module triggers, safe questions, guardrails, and copy review — they must never be shown to users as diagnosis, treatment, or medication guidance.
6. **Phase 3 does not import medical textbooks or RAG documents.** Only structured form/CSV exports belong here. No PDFs, clinical guidelines, or retrieval corpora.

## Safety

- Keep raw exports on your machine or in secure ops storage only.
- Delete raw files when no longer needed for import.
- Review generated insights in `reports/` before any seed or copy changes.
- Default insight posture: `medicalTruth: false`, `approvedFor: product_context_only` or `safety_review_only`.
