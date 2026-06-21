import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCuravonNextAction, generateCuravonNextActionSync } from '../lib/plan/nextActionAdapter';
import { shouldRegenerateNextAction } from '../lib/plan/nextActionRegenerationPolicy';
import { validatePlanSynthesisResult } from '../lib/plan/planSynthesisGuards';
import { createDefaultHealthProfile } from '../utils/healthUtils';
import type { NextActionState } from '../types/health';

const mockGenerateV3 = vi.fn();
const mockGenerateV3Sync = vi.fn();
const mockV2Sync = vi.fn();

vi.mock('../lib/plan/planEngineV3', () => ({
  generateNextBestActionV3: (...args: unknown[]) => mockGenerateV3(...args),
  generateNextBestActionV3Sync: (...args: unknown[]) => mockGenerateV3Sync(...args),
}));

vi.mock('../lib/plan/planEngineV2', () => ({
  generateNextBestPlanAction: vi.fn(() => {
    throw new Error('planEngineV2 async must not run at runtime');
  }),
  generateNextBestPlanActionSync: (...args: unknown[]) => mockV2Sync(...args),
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SRC_ROOT = path.join(REPO_ROOT, 'src');
const baseProfile = createDefaultHealthProfile();

const urgentState: NextActionState = {
  currentAction: 'Open your doctor-ready summary and review urgent notes.',
  title: 'Review urgent-support notes',
  reason: 'Safety path active.',
  source: "Today's Check-In",
  status: 'pending',
  category: 'escalate',
  safetyLevel: 'urgent',
  actionId: 'plan-urgent-existing',
  updatedAt: new Date().toISOString(),
};

function isTestPath(relativePath: string): boolean {
  return relativePath.includes('/__tests__/') || relativePath.endsWith('.test.ts') || relativePath.endsWith('.test.tsx');
}

function collectRuntimeTsFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRuntimeTsFiles(fullPath));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('plan engine v3 canonical', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockV2Sync.mockImplementation(() => {
      throw new Error('planEngineV2 sync must not run at runtime');
    });
  });

  it('uses v3 through nextActionAdapter for sync generation', () => {
    mockGenerateV3Sync.mockReturnValue({
      action: {
        id: 'cand-stabilize-hydrate',
        title: 'Hydrate gently',
        actionText: 'Drink a glass of water and pause for one minute.',
        reason: 'Low-risk stabilizing step.',
        category: 'stabilize',
        safetyLevel: 'normal',
        followUpPrompt: 'How did this go?',
        watchFor: 'Energy shifts.',
        sourceSignals: [],
        selectedBy: 'rules',
        aiReasoned: false,
        fallbackUsed: true,
        aiSynthesized: false,
        boundaryValidated: true,
      },
      reasoningResult: {
        selectedCandidateId: 'cand-stabilize-hydrate',
        reasoning: 'Deterministic.',
        whyNotOthers: '',
        followUpPrompt: 'How did this go?',
        watchFor: 'Energy shifts.',
        confidence: 'medium',
        fallbackUsed: true,
        aiUsed: false,
      },
      candidates: [],
      safetyOverride: false,
    });

    const result = generateCuravonNextActionSync({
      source: 'today',
      snapshot: null,
      profile: baseProfile,
    });

    expect(mockGenerateV3Sync).toHaveBeenCalledTimes(1);
    expect(mockV2Sync).not.toHaveBeenCalled();
    expect(result.planEngineReason).toBe('canonical_v3');
    expect(result.actionId).toMatch(/^plan-v3-/);
  });

  it('does not call v2 when v3 async fails — returns conservative fallback', async () => {
    mockGenerateV3.mockRejectedValue(new Error('v3 unavailable'));

    const result = await generateCuravonNextAction({
      source: 'today',
      snapshot: null,
      profile: baseProfile,
    });

    expect(mockGenerateV3).toHaveBeenCalledTimes(1);
    expect(mockV2Sync).not.toHaveBeenCalled();
    expect(result.planEngineReason).toBe('plan_engine_unavailable');
    expect(result.actionText.toLowerCase()).not.toMatch(/diagnos|prescri|treatment plan/);
  });

  it('preserves urgent existing action when v3 fails', async () => {
    mockGenerateV3.mockRejectedValue(new Error('v3 unavailable'));

    const result = await generateCuravonNextAction({
      source: 'today',
      snapshot: null,
      profile: baseProfile,
      nextActionState: urgentState,
    });

    expect(result.planEngineReason).toBe('plan_engine_unavailable');
    expect(result.actionText).toBe(urgentState.currentAction);
    expect(result.safetyLevel).toBe('urgent');
    expect(result.category).toBe('escalate');
    expect(mockV2Sync).not.toHaveBeenCalled();
  });

  it('blocks automatic regeneration of urgent actions except manual refresh', () => {
    const blocked = shouldRegenerateNextAction({
      currentAction: urgentState,
      trigger: 'checkin_completed',
    });
    expect(blocked.allow).toBe(false);
    expect(blocked.reason).toBe('urgent_action_protected');

    const manual = shouldRegenerateNextAction({
      currentAction: urgentState,
      trigger: 'manual_refresh',
    });
    expect(manual.allow).toBe(true);
    expect(manual.reason).toBe('manual_refresh_allowed');
  });

  it('rejects synthesis that invents disallowed medication action text', () => {
    const result = validatePlanSynthesisResult({
      payload: {
        selectedMode: 'synthesize_custom_action',
        synthesizedAction: {
          title: 'Change meds',
          actionText: 'Stop taking medication today.',
          reason: 'Try this instead.',
          category: 'prepare',
          safetyLevel: 'normal',
          primitiveUsed: 'write clinician question',
        },
        reasoning: 'Unsafe.',
        confidence: 'low',
      },
      baselineCandidates: [],
      inputSafetyLevel: 'normal',
      medicationConcern: false,
      allowedCategories: ['prepare'],
      allowedPrimitives: ['write clinician question'],
      sourceSignals: [],
      fallbackUsed: true,
      aiUsed: true,
    });

    expect(result.valid).toBe(false);
    expect(result.boundaryValidated).toBe(false);
    expect(mockV2Sync).not.toHaveBeenCalled();
  });

  it('runtime source does not import planEngineV2 directly', () => {
    const v2Import = /from ['"].*\/planEngineV2['"]/;
    const violations: string[] = [];

    for (const absolutePath of collectRuntimeTsFiles(SRC_ROOT)) {
      const relativePath = path.relative(REPO_ROOT, absolutePath).replace(/\\/g, '/');
      if (isTestPath(relativePath)) continue;
      if (relativePath === 'src/lib/plan/planEngineV3.ts') continue;
      if (relativePath === 'src/lib/plan/planEngineV2.ts') continue;

      const content = readFileSync(absolutePath, 'utf8');
      if (v2Import.test(content)) {
        violations.push(relativePath);
      }
    }

    expect(violations).toEqual([]);
  });

  it('planEngineV3 source documents canonical status', () => {
    const source = readFileSync(path.join(SRC_ROOT, 'lib/plan/planEngineV3.ts'), 'utf8');
    expect(source).toMatch(/canonical runtime engine/i);
    expect(source).not.toMatch(/from ['"].*\/planEngineV2['"]/);
  });
});
