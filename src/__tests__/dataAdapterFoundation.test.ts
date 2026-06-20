import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DATA_ADAPTER_METHODS, type DataAdapter } from '../lib/data/dataAdapter';
import { createSupabaseDataAdapter } from '../lib/data/supabaseDataAdapter';
import { getDataAdapter, resetDataAdapterForTests } from '../lib/data/getDataAdapter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const ADAPTER_FILES = [
  'src/lib/data/supabaseDataAdapter.ts',
  'src/lib/data/supabaseDataClient.ts',
  'src/lib/data/getDataAdapter.ts',
  'src/lib/data/dataErrors.ts',
] as const;

const LOCAL_STORAGE_USAGE =
  /\blocalStorage\s*(?:\.(?:getItem|setItem|removeItem|clear|key)|\[|\.\s*length\b)/;

describe('Supabase data adapter foundation (Fix 8)', () => {
  afterEach(() => {
    resetDataAdapterForTests();
  });

  it('getDataAdapter returns Supabase adapter singleton', () => {
    const adapter = getDataAdapter();
    expect(adapter).toBe(getDataAdapter());
    expect(typeof adapter.getHealthProfile).toBe('function');
    expect(typeof adapter.createAiUsageLog).toBe('function');
  });

  it('createSupabaseDataAdapter exposes all required methods', () => {
    const adapter = createSupabaseDataAdapter();
    for (const method of DATA_ADAPTER_METHODS) {
      expect(typeof adapter[method as keyof DataAdapter]).toBe('function');
    }
    expect(DATA_ADAPTER_METHODS).toHaveLength(51);
  });

  it('adapter foundation files do not use localStorage directly', () => {
    const violations: string[] = [];
    for (const relativePath of ADAPTER_FILES) {
      const absolutePath = path.join(REPO_ROOT, relativePath);
      expect(existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
      const contents = readFileSync(absolutePath, 'utf8');
      if (LOCAL_STORAGE_USAGE.test(contents)) {
        violations.push(relativePath);
      }
    }
    expect(violations).toEqual([]);
  });
});
