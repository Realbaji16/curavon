import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { redactTelemetryPayload } from '../lib/data/operationalDataService';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

const MIGRATED_RUNTIME_FILES = [
  'src/lib/ai/governance/aiBudget.ts',
  'src/lib/ai/governance/aiPolicyState.ts',
  'src/lib/ai/governance/aiDecisionTrace.ts',
  'src/lib/ai/governance/aiObservability.ts',
  'src/lib/ai/orchestrator/orchestratorLogger.ts',
  'src/lib/ai/orchestrator/aiOrchestrator.ts',
  'src/lib/doctorSummary/doctorSummaryAI.ts',
  'src/lib/plan/planActionSynthesis.ts',
  'src/lib/plan/planEngineV2.ts',
  'src/lib/plan/planEngineV3.ts',
  'src/lib/activityInsights/aiActivityInsightInterpreter.ts',
  'src/context/HealthContext.tsx',
  'src/screens/Settings.tsx',
  'src/utils/healthSnapshot.ts',
] as const;

const FORBIDDEN_IMPORTS = [
  /from ['"].*\/aiObservabilityStorage['"]/,
  /from ['"].*\/syncQueue['"]/,
  /from ['"].*\/syncState['"]/,
  /from ['"].*\/syncLogger['"]/,
  /from ['"].*\/dataBackup['"]/,
  /from ['"].*\/dataRestore['"]/,
  /from ['"].*\/healthStorage['"]/,
  /from ['"].*\/storageKeys['"]/,
];

describe('operational data migration (Fix 11)', () => {
  it('migrated runtime files do not import local operational storage modules', () => {
    const violations: string[] = [];

    for (const relativePath of MIGRATED_RUNTIME_FILES) {
      const absolutePath = path.join(REPO_ROOT, relativePath);
      expect(existsSync(absolutePath), `${relativePath} should exist`).toBe(true);
      const contents = readFileSync(absolutePath, 'utf8');

      for (const pattern of FORBIDDEN_IMPORTS) {
        if (pattern.test(contents)) {
          violations.push(`${relativePath}: ${pattern}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('operational telemetry paths delegate to operationalDataService or getDataAdapter', () => {
    const delegatePaths = [
      'src/lib/ai/governance/aiDecisionTrace.ts',
      'src/lib/ai/orchestrator/orchestratorLogger.ts',
      'src/lib/doctorSummary/doctorSummaryAI.ts',
      'src/lib/plan/planActionSynthesis.ts',
      'src/lib/plan/planEngineV2.ts',
      'src/lib/plan/planEngineV3.ts',
      'src/context/HealthContext.tsx',
    ];

    for (const relativePath of delegatePaths) {
      const contents = readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
      expect(
        contents.includes('operationalDataService') || contents.includes('getDataAdapter'),
        `${relativePath} should use operationalDataService or getDataAdapter`,
      ).toBe(true);
    }
  });

  it('redacts sensitive health content from telemetry payloads', () => {
    const redacted = redactTelemetryPayload({
      taskName: 'doctor_summary',
      cacheHit: true,
      prompt: 'User has chest pain and takes metoprolol daily',
      symptoms: 'sharp chest pain radiating to arm',
      medications: ['metoprolol', 'aspirin'],
      moduleVersion: 'doctor-summary-v1',
    });

    expect(redacted.taskName).toBe('doctor_summary');
    expect(redacted.cacheHit).toBe(true);
    expect(redacted.moduleVersion).toBe('doctor-summary-v1');
    expect(redacted.prompt).toBeUndefined();
    expect(redacted.symptoms).toBeUndefined();
    expect(redacted.medications).toBeUndefined();
  });

  it('truncates long string values in telemetry payloads', () => {
    const longText = 'a'.repeat(300);
    const redacted = redactTelemetryPayload({ reason: longText });
    expect(String(redacted.reason)).toMatch(/\[redacted:300chars\]/);
  });
});
