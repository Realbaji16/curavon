import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');

const LOCAL_STORAGE_USAGE_PATTERN =
  /\blocalStorage\s*(?:\.(?:getItem|setItem|removeItem|clear|key)|\[|\.\s*length\b)/;
const SESSION_STORAGE_USAGE_PATTERN =
  /\bsessionStorage\s*(?:\.(?:getItem|setItem|removeItem|clear|key)|\[|\.\s*length\b)/;

const BANNED_MODULE_IMPORTS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'storageKeys', pattern: /from ['"].*\/storageKeys['"]/ },
  { label: 'healthStorage', pattern: /from ['"].*\/healthStorage['"]/ },
  { label: 'localDataAdapter', pattern: /from ['"].*\/localDataAdapter['"]/ },
  { label: 'syncQueue', pattern: /from ['"].*\/syncQueue['"]/ },
  { label: 'syncState', pattern: /from ['"].*\/syncState['"]/ },
  { label: 'syncLogger', pattern: /from ['"].*\/syncLogger['"]/ },
  { label: 'aiObservabilityStorage', pattern: /from ['"].*\/aiObservabilityStorage['"]/ },
  { label: 'dataBackup', pattern: /from ['"].*\/dataBackup['"]/ },
  { label: 'dataRestore', pattern: /from ['"].*\/dataRestore['"]/ },
  { label: 'dataExport', pattern: /from ['"].*\/dataExport['"]/ },
  { label: 'dataDeletion', pattern: /from ['"].*\/dataDeletion['"]/ },
  { label: 'localToSupabaseMigration', pattern: /from ['"].*\/localToSupabaseMigration['"]/ },
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function isTestPath(relativePath: string): boolean {
  return relativePath.includes('/__tests__/') || relativePath.endsWith('.test.ts') || relativePath.endsWith('.test.tsx');
}

function collectSourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function scanRuntimeViolations(): { storage: string[]; imports: string[] } {
  const storage: string[] = [];
  const imports: string[] = [];

  for (const absolutePath of collectSourceFiles(SRC_ROOT)) {
    const relativePath = normalizePath(path.relative(REPO_ROOT, absolutePath));
    if (isTestPath(relativePath)) continue;

    const content = readFileSync(absolutePath, 'utf8');

    if (LOCAL_STORAGE_USAGE_PATTERN.test(content) || SESSION_STORAGE_USAGE_PATTERN.test(content)) {
      storage.push(relativePath);
    }

    for (const banned of BANNED_MODULE_IMPORTS) {
      if (banned.pattern.test(content)) {
        imports.push(`${relativePath}: ${banned.label}`);
      }
    }
  }

  return {
    storage: storage.sort(),
    imports: imports.sort(),
  };
}

describe('no localStorage persistence in runtime (Fix 12)', () => {
  it('runtime source files do not call localStorage or sessionStorage directly', () => {
    const { storage } = scanRuntimeViolations();
    expect(storage).toEqual([]);
  });

  it('runtime source files do not import banned local persistence modules', () => {
    const { imports } = scanRuntimeViolations();
    expect(imports).toEqual([]);
  });

  it('documents ADR 0002 no-localstorage decision', () => {
    const adrPath = path.join(REPO_ROOT, 'docs/decisions/0002-no-localstorage-persistence.md');
    expect(existsSync(adrPath)).toBe(true);
    const contents = readFileSync(adrPath, 'utf8');
    expect(contents).toMatch(/Supabase is the only persistence layer/i);
    expect(contents).toMatch(/localStorage/i);
  });
});
