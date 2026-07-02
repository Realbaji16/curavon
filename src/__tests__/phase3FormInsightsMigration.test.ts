import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FORM_INSIGHT_TYPES } from '../lib/form-insights';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const MIGRATION_PATH = path.join(
  REPO_ROOT,
  'supabase/migrations/20250623100006_phase3_form_insights.sql',
);

export const PHASE3_FORM_INSIGHT_TABLES = [
  'form_import_batches',
  'form_responses',
  'form_insights',
  'form_insight_module_links',
  'form_insight_review_events',
] as const;

function readPhase3Migration(): string {
  expect(existsSync(MIGRATION_PATH), MIGRATION_PATH).toBe(true);
  return readFileSync(MIGRATION_PATH, 'utf8');
}

describe('Phase 3 form insights migration', () => {
  const sql = readPhase3Migration();

  it('defines all Phase 3 form insight tables with uuid primary keys', () => {
    for (const table of PHASE3_FORM_INSIGHT_TABLES) {
      expect(sql).toContain(`create table if not exists public.${table}`);
      expect(sql).toContain(`id uuid primary key`);
    }
  });

  it('enables RLS on every Phase 3 table', () => {
    for (const table of PHASE3_FORM_INSIGHT_TABLES) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('revokes client role access and defines no authenticated policies', () => {
    expect(sql).toContain('revoke all on table public.form_import_batches from anon, authenticated');
    expect(sql).toContain('revoke all on table public.form_responses from anon, authenticated');
    expect(sql).not.toMatch(/create policy/i);
    expect(sql).not.toMatch(/to authenticated/i);
    expect(sql).not.toMatch(/to anon/i);
  });

  it('stores deidentified_payload jsonb only — no raw CSV columns', () => {
    expect(sql).toContain('deidentified_payload jsonb not null');
    expect(sql).not.toMatch(/\braw_csv\b/i);
    expect(sql).not.toMatch(/\bbytea\b/i);
    expect(sql).not.toMatch(/\bfile_content\b/i);
  });

  it('enforces medical_truth false and approved_for values', () => {
    expect(sql).toContain('medical_truth boolean not null default false');
    expect(sql).toContain('constraint form_insights_medical_truth_false check (medical_truth = false)');
    expect(sql).toContain("'product_context_only', 'safety_review_only', 'none'");
    expect(sql).toContain("confidence in ('low', 'medium', 'high')");
    expect(sql).toContain("status in ('draft', 'review', 'approved', 'rejected')");
  });

  it('includes all application insight types in the check constraint', () => {
    for (const insightType of FORM_INSIGHT_TYPES) {
      expect(sql).toContain(`'${insightType}'`);
    }
  });

  it('creates required indexes', () => {
    expect(sql).toContain('idx_form_insights_status');
    expect(sql).toContain('idx_form_insights_insight_type');
    expect(sql).toContain('idx_form_insight_module_links_module_id');
    expect(sql).toContain('idx_form_responses_batch_id');
  });

  it('uses updated_at triggers on mutable tables', () => {
    expect(sql).toContain('set_form_import_batches_updated_at');
    expect(sql).toContain('set_form_responses_updated_at');
    expect(sql).toContain('set_form_insights_updated_at');
    expect(sql).toContain('set_form_insight_module_links_updated_at');
  });
});
