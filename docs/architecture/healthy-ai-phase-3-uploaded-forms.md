# Healthy.Ai Phase 3 — Uploaded Forms Insight Layer

Phase 3 turns **de-identified Google Form exports** into a reviewer-controlled product research layer. Form insights inform routing copy, summary fields, and friction themes — they are **not clinical evidence** and never authorize diagnosis or treatment advice.

## 1. What Phase 3 adds

| Area | Capability |
| --- | --- |
| **Import pipeline** | Parse CSV/ZIP → redact → extract insights → map modules → local artifacts (+ optional Supabase persist) |
| **Insight taxonomy** | 16 deterministic insight types (`common_concern`, `care_blocker`, `red_flag_candidate`, etc.) |
| **Module mapping** | Keyword rules link insights to `*_ng_v1` modules with influence types (`trigger`, `blocker`, `guardrail`, …) |
| **Reviewer reports** | Markdown report with executive summary, signal sections, limitations, and “do not promote” backlog |
| **Persistence** | `form_import_batches`, `form_responses`, `form_insights`, `form_insight_module_links`, `form_insight_review_events` (admin/service only) |
| **Live integration** | **Approved** insights only, via `FormInsightProductContext`, affect routing hints, blocker questions, summary fields, and trust copy |
| **CLI** | `npm run forms:import`, `npm run forms:report` |

Key paths:

```
src/lib/form-insights/
  import/          # CSV parser, redactor, import service, execution
  extraction/      # Deterministic extractors (no AI)
  mapping/         # Module keyword mapper
  reports/         # Markdown report builder
  review/          # Approval rules + product-text safety policy
  storage/         # Supabase repository
  formInsightContextService.ts  # Approved → live product context
data/form-imports/ # raw / normalized / reports (gitignored except README)
```

## 2. What Phase 3 does not add

- **No medical library / RAG** — PDFs, textbooks, and clinical guidelines are out of scope (see Phase 4).
- **No live AI extraction** — insights are keyword/regex only.
- **No public admin HTTP API** — deferred until application admin roles exist.
- **No automatic guardrail or red-flag engine changes** — safety-tagged insights stay in review backlog.
- **No diagnosis, prescription, dosage, or treatment advice** from form data.
- **No storage of raw CSV text** in the database or public API responses.
- **No end-user surfacing** of unreviewed form quotes as medical guidance.

## 3. Uploaded forms supported

| Format | Notes |
| --- | --- |
| **Google Form CSV** | Primary format; header row + one row per response |
| **ZIP containing `.csv`** | First CSV entry used (CLI) |

**Source roles** (from filename or column context): `doctor`, `pharmacy`, `medical_student`, `nurse`, `patient`, `caregiver`, `unknown`.

Pilot fixtures cover doctor, pharmacy, and medical-student exports. Max upload size: **5 MiB**.

## 4. Import flow

```
raw CSV/ZIP (data/form-imports/raw/)
    → parseGoogleFormCsv
    → redactFormRows (strip PII, coarse region only)
    → extractFormInsights (deterministic)
    → applyModuleMappingsToInsights
    → artifacts + optional persistFormImportResult (Supabase)
```

**CLI:**

```bash
npm run forms:import -- --file data/form-imports/raw/your-export.csv
npm run forms:import -- --file data/form-imports/raw/your-export.csv --persist
npm run forms:report
```

## 5. De-identification policy

- **Removed:** full name, email, phone, and other direct identifier columns.
- **Stored:** `deidentified_payload` jsonb (column-keyed coarse answers), `raw_payload_hash` (dedupe only), `coarse_region`, `consent_granted`, `source_role`.
- **Never stored:** raw CSV bytes, raw row text in insights evidence, or full free-text answers in reports.
- **Logs:** CLI prints counts only — not raw answers.

## 6. Insight taxonomy

All insights default to `medicalTruth: false`, `status: review`, `confidence: low`.

| Type | Typical use |
| --- | --- |
| `common_concern` | Frequent concern themes |
| `nigerian_phrase` | Pidgin/local phrasing for routing dictionaries |
| `care_blocker` | Cost, queue, transport friction |
| `care_route` | Pharmacy-first / clinic paths (descriptive) |
| `red_flag_candidate` | Safety screening backlog |
| `unsafe_medication_pattern` | Unsupervised medicine use signals |
| `summary_field_candidate` | Professional-summary field ideas |
| `safe_question_candidate` | Guided-question phrasing |
| `trust_wording` / `distrust_wording` | Copy research |
| `privacy_requirement` | Data-handling expectations |
| `feature_request` | Product backlog |
| `module_trigger_candidate` | Router trigger hypotheses |
| `guardrail_candidate` | Blocked-output candidates |
| `professional_opinion_conflict` | Non-verified “stop/start drug” opinions in forms |
| `lifestyle_context` | Sleep/stress context |

Full definitions: `src/lib/form-insights/extraction/insightTaxonomy.ts`.

## 7. Module mapping

`moduleInsightMapper.ts` applies ordered keyword rules → `HealthModuleId` + influence types.

Examples:

| Signal | Modules | Influence |
| --- | --- | --- |
| Widal / lab confusion | `lab_result_confusion_ng_v1`, `fever_malaria_ng_v1` | `trigger` |
| Antibiotics without prescription | `medication_question_ng_v1` | `guardrail` |
| Cost / queue blockers | `clinic_pharmacy_prep_ng_v1` | `blocker` |
| Fever / malaria phrasing | `fever_malaria_ng_v1` | `trigger` |

Mappings are **heuristic** — human review required before seed or copy changes.

## 8. Auto-promotion policy

Import applies `applyAutoPromotionAuditStatus()` after extraction — manual approval is **not** required for low-risk product-context insights.

| Policy | Insight types | Live behavior |
| --- | --- | --- |
| `auto_promote_product_context` | `nigerian_phrase`, `care_blocker`, `care_route`, `summary_field_candidate`, `trust_wording`, `feature_request`, `lifestyle_context` | Live when promotion validators pass |
| `shadow_then_promote` | `common_concern`, `module_trigger_candidate`, `safe_question_candidate`, `privacy_requirement` | Report-only until `supportCount >= 2`, then live |
| `quarantine_always` | `red_flag_candidate`, `unsafe_medication_pattern`, `guardrail_candidate`, `professional_opinion_conflict`, `distrust_wording` | Stored and reported; **never** live-applied |

`buildFormInsightProductContext()` uses `autoPromotionEngine` + `overlayBuilder` — only live-eligible insights shape runtime behavior. Review fields (`status`, review events) remain for audit and back-office.

Promotion validators block diagnosis, prescription, dosage, and medication start/stop/change advice in live overlays.

## 9. How live-eligible insights safely affect the app

| Influence type | Live effect (live-eligible insights only) |
| --- | --- |
| `trigger` | Extra module routing hints when user text matches approved phrase |
| `blocker` | Additional care-blocker guided questions |
| `summary_field` | Extra professional-summary field labels |
| `response_copy` | Trust-supporting intake copy lines |
| `feature` | Product backlog hints (no user-facing feature flags yet) |

**Not auto-applied:** `guardrail`, `question`, `care_route` — and all review-only insight types.

Integration points (optional `formInsightContext`):

- `normalizeNigerianHealthLanguage`
- `routeHealthModules` (via `getFormInsightModuleHintsForText`)
- `generateGuidedQuestions`
- `buildProfessionalSummaryPreview`
- `composeModuleAwareIntakeMessage`

Policy gates: `autoPromotionPolicy.ts`, `autoPromotionEngine.ts`, `promotionValidators.ts`, `insightApprovalRules.ts`, `insightReviewPolicy.ts`.

## 10. How to run import

```bash
# Place CSV or ZIP in data/form-imports/raw/
npm run forms:import

# Specific file
npm run forms:import -- --file data/form-imports/raw/Doctor-Pilot.csv

# Persist de-identified rows + insights to Supabase
npm run forms:import -- --file data/form-imports/raw/Doctor-Pilot.csv --persist
```

Requires Node ≥ 20. For `--persist`: `SUPABASE_SERVICE_ROLE_KEY` and `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`.

## 11. How to run report

```bash
# Regenerate markdown from latest normalized JSON
npm run forms:report
```

Default output: `data/form-imports/reports/latest-form-insight-report.md`

Import also writes this file on every `forms:import` run.

## 12. Known limitations

- **Low sample sizes** — patterns are directional until replicated across more responses and roles.
- **Deterministic extraction** — misses nuance; no LLM summarization in Phase 3.
- **No admin HTTP API** — CLI + DB service role only.
- **Admin role system not implemented** — `checkAdminFormImportAccess()` always defers HTTP import.
- **Guardrail/red-flag insights do not change** `detectRedFlags` or blocked-output lists automatically.
- **Phase 2 modules** remain `status: review` in seeds; form insights do not replace module seed authority.
- **Grants** on form tables rely on service-role bypass + REVOKE for anon/authenticated.

## 13. Next phase: medical library

**Phase 4 (planned):** curated **medical library** for retrieval — guidelines, facility lists, and reference documents — separate from uploaded forms.

| Phase 3 (forms) | Phase 4 (library) |
| --- | --- |
| Product research from user/staff surveys | Curated reference corpus |
| De-identified row payloads | Document chunks + citations |
| Insights → module seeds/copy | RAG → bounded context for server AI |
| `medicalTruth: false` always | Explicit source attribution + clinical ops review |

Do not place PDFs or clinical textbooks in `data/form-imports/`.

## Acceptance

Run:

```bash
npm run test -- src/__tests__/formInsightsPhase3Acceptance.test.ts
```

See also: `src/__tests__/formInsightContextIntegration.test.ts`, `src/__tests__/phase3FormInsightsMigration.test.ts`.
