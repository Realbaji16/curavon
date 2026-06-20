import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const REQUIRED_RELEASE_DOCS = [
  'docs/release/private-pilot-launch-gate.md',
  'docs/release/private-pilot-runbook.md',
  'docs/release/rollback-plan.md',
  'docs/release/known-limitations.md',
  'docs/release/medical-safety-review-checklist.md',
  'docs/release/privacy-security-checklist.md',
  'docs/release/pilot-approval-template.md',
];

const REQUIRED_API_ROUTES = [
  'app/api/health/route.ts',
  'app/api/auth/session/route.ts',
  'app/api/ai/intake/route.ts',
  'app/api/ai/flow-proposal/route.ts',
  'app/api/ai/summary/route.ts',
  'app/api/data/export-request/route.ts',
  'app/api/data/deletion-request/route.ts',
  'app/api/data/delete-flow/route.ts',
  'app/api/data/delete-summary/route.ts',
  'app/api/data/delete-health-profile/route.ts',
];

const REQUIRED_SAFETY_TESTS = [
  'src/__tests__/redFlags.test.ts',
  'src/__tests__/healthSafety.test.ts',
  'src/__tests__/healthFlowLifecycle.test.ts',
  'src/__tests__/aiIntakeRoute.test.ts',
  'src/__tests__/aiFlowProposalRoute.test.ts',
  'src/__tests__/planGuards.test.ts',
];

const REQUIRED_PRIVACY_TESTS = [
  'src/__tests__/privacyEnforcement.test.ts',
  'src/__tests__/dataPrivacyRoutes.test.ts',
  'src/__tests__/safeAnalytics.test.ts',
  'src/__tests__/noDirectLocalStorage.test.ts',
];

const OBSERVABILITY_FILES = [
  'src/lib/observability/safeAnalytics.ts',
  'src/lib/observability/redactTelemetry.ts',
  'src/lib/observability/errorReporter.ts',
];

const SECRET_SCAN_PATHS = [
  '.env.example',
  'package.json',
  'src/lib/ai/aiConfig.ts',
  'src/lib/server/aiConfig.ts',
  'src/lib/observability/safeAnalytics.ts',
];

function readRepoFile(relativePath: string): string {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, 'utf8');
}

describe('private pilot launch gate (automated)', () => {
  it('required release docs exist', () => {
    for (const docPath of REQUIRED_RELEASE_DOCS) {
      expect(existsSync(path.join(REPO_ROOT, docPath))).toBe(true);
    }
  });

  it('required API routes exist', () => {
    for (const routePath of REQUIRED_API_ROUTES) {
      expect(existsSync(path.join(REPO_ROOT, routePath))).toBe(true);
    }
  });

  it('required safety test files exist', () => {
    for (const testPath of REQUIRED_SAFETY_TESTS) {
      expect(existsSync(path.join(REPO_ROOT, testPath))).toBe(true);
    }
  });

  it('required privacy test files exist', () => {
    for (const testPath of REQUIRED_PRIVACY_TESTS) {
      expect(existsSync(path.join(REPO_ROOT, testPath))).toBe(true);
    }
  });

  it('observability layer files exist', () => {
    for (const filePath of OBSERVABILITY_FILES) {
      expect(existsSync(path.join(REPO_ROOT, filePath))).toBe(true);
    }
  });

  it('env example does not expose public OpenAI key', () => {
    const envExample = readRepoFile('.env.example');
    expect(envExample).not.toMatch(/NEXT_PUBLIC_OPENAI/i);
    expect(envExample).toMatch(/OPENAI_API_KEY=/);
    expect(envExample).toMatch(/AI_ENABLED=/);
    expect(envExample).toMatch(/NEXT_PUBLIC_AUTH_MODE/);
  });

  it('source scan finds no NEXT_PUBLIC_OPENAI_API_KEY pattern', () => {
    for (const relativePath of SECRET_SCAN_PATHS) {
      const content = readRepoFile(relativePath);
      expect(content).not.toMatch(/NEXT_PUBLIC_OPENAI_API_KEY/);
    }
  });

  it('safe analytics does not use localStorage', () => {
    const source = readRepoFile('src/lib/observability/safeAnalytics.ts');
    expect(source).not.toMatch(/\blocalStorage\b/);
  });

  it('launch gate doc references all required check sections', () => {
    const gate = readRepoFile('docs/release/private-pilot-launch-gate.md');
    const sections = [
      'Build / CI',
      'Auth / access',
      'Secrets',
      'Data / Supabase',
      'Safety',
      'HealthFlow lifecycle',
      'Privacy',
      'AI',
      'Monitoring',
      'Legal / user-facing language',
      'Medical review',
      'Pilot operations',
    ];
    for (const section of sections) {
      expect(gate).toContain(section);
    }
  });

  it('CI workflow runs lint, test, and build', () => {
    const ci = readRepoFile('.github/workflows/ci.yml');
    expect(ci).toMatch(/npm ci/);
    expect(ci).toMatch(/npm run lint/);
    expect(ci).toMatch(/npm test/);
    expect(ci).toMatch(/npm run build/);
  });

  it('package.json defines pilot gate scripts', () => {
    const pkg = JSON.parse(readRepoFile('package.json')) as { scripts: Record<string, string> };
    expect(pkg.scripts['test:pilot-gate']).toBeTruthy();
    expect(pkg.scripts['test:safety']).toBeTruthy();
    expect(pkg.scripts['test:privacy']).toBeTruthy();
  });

  it('rollback plan covers disable AI and pause pilot', () => {
    const rollback = readRepoFile('docs/release/rollback-plan.md');
    expect(rollback).toMatch(/AI_ENABLED=false/i);
    expect(rollback).toMatch(/revoke|rotate/i);
    expect(rollback).toMatch(/pause/i);
  });

  it('known limitations state non-diagnosis and non-emergency scope', () => {
    const limitations = readRepoFile('docs/release/known-limitations.md');
    expect(limitations).toMatch(/not a diagnosis/i);
    expect(limitations).toMatch(/not for emergencies/i);
    expect(limitations).toMatch(/not medication management/i);
    expect(limitations).toMatch(/Care Circle/i);
  });
});
