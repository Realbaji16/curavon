import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const MIGRATED_RUNTIME_FILES = [
  'src/context/DoctorSummaryContext.tsx',
  'src/context/HealthContext.tsx',
  'src/utils/doctorSummaryStorage.ts',
  'src/lib/followUp/followUpStorage.ts',
  'src/utils/guideResultStorage.ts',
  'src/utils/askIntakeSessionStorage.ts',
  'src/lib/activityInsights/activityInsightStorage.ts',
  'src/lib/data/productDataService.ts',
  'src/screens/AskCuravon.tsx',
  'src/screens/Home.tsx',
  'src/components/ActivityInsightsSection.tsx',
] as const;

const FORBIDDEN_IMPORTS = [
  /from ['"].*\/doctorSummaryStorage['"]/,
  /from ['"].*\/followUpStorage['"]/,
  /from ['"].*\/askIntakeStorage['"]/,
  /from ['"].*\/guideResultStorage['"]/,
  /from ['"].*\/localDataAdapter['"]/,
  /from ['"].*\/storageKeys['"]/,
  /from ['"].*\/healthStorage['"]/,
];

const ALLOWLISTED_IMPORTS: Record<string, RegExp[]> = {
  'src/context/HealthContext.tsx': [
    /from ['"].*\/doctorSummaryStorage['"]/,
    /from ['"].*\/followUpStorage['"]/,
    /from ['"].*\/guideResultStorage['"]/,
  ],
  'src/context/DoctorSummaryContext.tsx': [/from ['"].*\/doctorSummaryStorage['"]/],
  'src/screens/AskCuravon.tsx': [/from ['"].*\/askIntakeStorage['"]/],
};

describe('product data migration (Fix 10)', () => {
  it('migrated runtime files do not import legacy storage modules directly', () => {
    const violations: string[] = [];

    for (const relativePath of MIGRATED_RUNTIME_FILES) {
      const absolutePath = path.join(REPO_ROOT, relativePath);
      expect(existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
      const contents = readFileSync(absolutePath, 'utf8');
      const allowlist = ALLOWLISTED_IMPORTS[relativePath] ?? [];

      for (const pattern of FORBIDDEN_IMPORTS) {
        if (!pattern.test(contents)) continue;
        const allowed = allowlist.some((allowedPattern) => allowedPattern.source === pattern.source);
        if (!allowed) {
          violations.push(`${relativePath}: ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('legacy storage facades delegate to productDataService or getDataAdapter', () => {
    const facadePaths = [
      'src/utils/doctorSummaryStorage.ts',
      'src/lib/followUp/followUpStorage.ts',
      'src/utils/guideResultStorage.ts',
      'src/lib/activityInsights/activityInsightStorage.ts',
      'src/utils/askIntakeSessionStorage.ts',
    ];

    for (const relativePath of facadePaths) {
      const contents = readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      expect(
        contents.includes('productDataService') || contents.includes('getDataAdapter'),
        `${relativePath} should use adapter path`,
      ).toBe(true);
      expect(contents.includes('safeRead('), `${relativePath} should not call safeRead`).toBe(false);
      expect(contents.includes('safeWrite('), `${relativePath} should not call safeWrite`).toBe(false);
    }
  });
});
