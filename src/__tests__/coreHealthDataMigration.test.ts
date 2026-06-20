import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DataAuthError } from '../lib/data/dataErrors';
import {
  CORE_HEALTH_DATA_MESSAGES,
  loadCoreHealthData,
  toDataErrorMessage,
} from '../lib/data/coreHealthDataService';
import * as getDataAdapterModule from '../lib/data/getDataAdapter';
import { resetDataAdapterForTests } from '../lib/data/getDataAdapter';
import type { DataAdapter } from '../lib/data/dataAdapter';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const MIGRATED_RUNTIME_FILES = [
  'src/context/HealthContext.tsx',
  'src/context/AppContext.tsx',
  'src/utils/askIntakeStorage.ts',
  'src/lib/data/coreHealthDataService.ts',
  'src/screens/AskCuravon.tsx',
  'src/screens/Home.tsx',
] as const;

const FORBIDDEN_PATTERNS = [
  /from ['"].*\/localDataAdapter['"]/,
  /safeRead\s*<[^>]*>\s*\(\s*HEALTH_STORAGE_KEYS\.(healthProfile|dailyCheckins|nextActionState)/,
  /safeRead\s*\(\s*HEALTH_STORAGE_KEYS\.(healthProfile|dailyCheckins|nextActionState)/,
  /safeWrite\s*\(\s*HEALTH_STORAGE_KEYS\.(healthProfile|dailyCheckins|nextActionState)/,
  /safeWrite\s*\(\s*APP_STORAGE_KEYS\.healthProfile/,
  /safeRemove\s*\(\s*HEALTH_STORAGE_KEYS\.nextActionState/,
  /safeRead\s*<[^>]*>\s*\(\s*ASK_HISTORY_KEY/,
  /safeWrite\s*\(\s*ASK_HISTORY_KEY/,
  /safeRemove\s*\(\s*ASK_HISTORY_KEY/,
];

describe('core health data migration (Fix 9)', () => {
  afterEach(() => {
    resetDataAdapterForTests();
  });

  it('migrated runtime files do not read/write core keys via localStorage helpers', () => {
    const violations: string[] = [];

    for (const relativePath of MIGRATED_RUNTIME_FILES) {
      const absolutePath = path.join(REPO_ROOT, relativePath);
      expect(existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
      const contents = readFileSync(absolutePath, 'utf8');

      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(contents)) {
          violations.push(`${relativePath}: ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('coreHealthDataService maps auth errors to safe copy', async () => {
    const adapter = {
      getHealthProfile: vi.fn(async () => {
        throw new DataAuthError('not signed in');
      }),
      listDailyCheckins: vi.fn(async () => []),
      getNextActionState: vi.fn(async () => null),
      listAskHistory: vi.fn(async () => []),
    } as unknown as DataAdapter;

    vi.spyOn(getDataAdapterModule, 'getDataAdapter').mockReturnValue(adapter);

    const result = await loadCoreHealthData();
    expect(result.error).toBe(CORE_HEALTH_DATA_MESSAGES.auth);
    expect(result.dailyCheckins).toEqual([]);
    expect(toDataErrorMessage(new DataAuthError('x'))).toBe(CORE_HEALTH_DATA_MESSAGES.auth);
  });
});
