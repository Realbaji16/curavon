import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase/migrations');

import { REQUIRED_CURAVON_TABLES } from '../lib/supabase/curavonSchemaTables';

function readMigrationSql(): string {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  expect(files.length).toBeGreaterThan(0);

  return files.map((name) => readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8')).join('\n');
}

describe('Supabase migrations (schema + RLS foundation)', () => {
  it('includes ordered migration files', () => {
    expect(existsSync(MIGRATIONS_DIR)).toBe(true);
    const files = readdirSync(MIGRATIONS_DIR).filter((name) => name.endsWith('.sql')).sort();
    expect(files).toEqual([
      '20250618100000_curavon_extensions_and_helpers.sql',
      '20250618100001_curavon_app_schema.sql',
      '20250618100002_curavon_rls_policies.sql',
      '20250618100003_curavon_auth_profile_trigger.sql',
    ]);
  });

  it('defines all required application tables', () => {
    const sql = readMigrationSql();
    for (const table of REQUIRED_CURAVON_TABLES) {
      expect(sql).toContain(`public.${table}`);
    }
  });

  it('enables RLS on every required table', () => {
    const rlsSql = readFileSync(
      path.join(MIGRATIONS_DIR, '20250618100002_curavon_rls_policies.sql'),
      'utf8',
    );

    for (const table of REQUIRED_CURAVON_TABLES) {
      expect(rlsSql).toContain(`alter table public.${table} enable row level security`);
    }
  });

  it('uses own-row policies for user-owned health data', () => {
    const rlsSql = readFileSync(
      path.join(MIGRATIONS_DIR, '20250618100002_curavon_rls_policies.sql'),
      'utf8',
    );

    expect(rlsSql).toContain('auth.uid() = user_id');
    expect(rlsSql).toContain('auth.uid() = id');
    expect(rlsSql).not.toMatch(/to anon/i);
    expect(rlsSql).not.toMatch(/using\s*\(\s*true\s*\)/i);
  });

  it('includes flow entity columns and care circle permission fields', () => {
    const schemaSql = readFileSync(
      path.join(MIGRATIONS_DIR, '20250618100001_curavon_app_schema.sql'),
      'utf8',
    );

    expect(schemaSql).toContain('risk_level');
    expect(schemaSql).toContain('privacy_level');
    expect(schemaSql).toContain('module_version');
    expect(schemaSql).toContain('permission_level');
    expect(schemaSql).toContain('sharing_rules');
    expect(schemaSql).toContain('set_updated_at');
  });

  it('includes migrations runbook', () => {
    const runbook = path.join(REPO_ROOT, 'docs/runbooks/supabase-migrations.md');
    expect(existsSync(runbook)).toBe(true);
    const contents = readFileSync(runbook, 'utf8');
    expect(contents).toContain('Two-user isolation');
    expect(contents).toContain('supabase db push');
  });

  it('does not reference service_role in migrations', () => {
    const sql = readMigrationSql();
    expect(sql).not.toMatch(/service_role/i);
  });
});
