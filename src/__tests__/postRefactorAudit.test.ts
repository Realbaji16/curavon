import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');

function read(relativePath: string): string {
  const absolutePath = path.join(REPO_ROOT, relativePath);
  expect(existsSync(absolutePath)).toBe(true);
  return readFileSync(absolutePath, 'utf8');
}

describe('post-refactor audit gates', () => {
  describe('A — Ask Curavon server routing', () => {
    it('AskCuravon uses server flow-proposal without client orchestrator fallback', () => {
      const source = read('src/screens/AskCuravon.tsx');
      expect(source).toMatch(/postFlowProposal/);
      expect(source).toMatch(/buildAskFlowProposalFromIntake/);
      expect(source).not.toMatch(/runAIOrchestrator/);
      expect(source).not.toMatch(/generateCuravonNextAction/);
      expect(source).not.toMatch(/createAskDraftHealthFlow/);
    });

    it('server failure paths return early without activating health flows', () => {
      const source = read('src/screens/AskCuravon.tsx');
      expect(source).toMatch(/if \(!proposalResult\.ok\)/);
      expect(source).toMatch(/Planning is temporarily unavailable/);
      expect(source).toMatch(/activateHealthFlowWithAction/);
      const failureBlock = source.slice(
        source.indexOf('if (!proposalResult.ok)'),
        source.indexOf('const { proposedAction, flowId, flowStatus }'),
      );
      expect(failureBlock).not.toMatch(/activateHealthFlowWithAction/);
    });
  });

  describe('B — Supabase soft-delete filtering', () => {
    it('soft-delete helper covers product tables and defaults includeDeleted off', () => {
      const source = read('src/lib/data/supabaseSoftDelete.ts');
      for (const table of [
        'health_flows',
        'flow_actions',
        'flow_blockers',
        'follow_ups',
        'doctor_summary_items',
        'guide_results',
        'ask_history',
        'red_flag_logs',
        'activity_insights',
      ]) {
        expect(source).toMatch(new RegExp(`'${table}'`));
      }
      expect(source).toMatch(/includeDeleted\?: boolean/);
      expect(source).toMatch(/if \(options\?\.includeDeleted\) return query/);
    });

    it('deletion/export requests are create-only in adapter (no accidental list hiding)', () => {
      const source = read('src/lib/data/supabaseDataAdapter.ts');
      expect(source).toMatch(/createDataExportRequest/);
      expect(source).toMatch(/createDataDeletionRequest/);
      expect(source).not.toMatch(/listDataExportRequests/);
      expect(source).not.toMatch(/listDataDeletionRequests/);
    });
  });

  describe('C — CareCircle refactor', () => {
    it('controller is slim and view components own rendering', () => {
      const controller = read('src/screens/guides/CareCircleScreen.tsx');
      const reexport = read('src/screens/CareCircle.tsx');
      expect(controller.split('\n').length).toBeLessThan(400);
      expect(reexport).toMatch(/CareCircleScreen/);
      expect(controller).toMatch(/GuidesBrowseView/);
      expect(controller).toMatch(/FlowDetailView/);
      expect(controller).toMatch(/FlowRunnerView/);
      expect(controller).toMatch(/FlowResultView/);
      expect(controller).toMatch(/FlowSafetyTerminalView/);
      expect(controller).toMatch(/GuideDetailView/);
      expect(controller).toMatch(/useFlowCompletion/);
      expect(controller).not.toMatch(/generateCuravonNextAction/);
    });

    it('completion pipeline blocks urgent paths centrally', () => {
      const source = read('src/lib/guides/flowCompletion.ts');
      expect(source).toMatch(/shouldBlockRunnerCompletion/);
      expect(source).toMatch(/acceptanceSource: input\.acceptanceSource/);
      expect(source).toMatch(/status: 'blocked'/);
      expect(source).toMatch(/privacyLevel === 'sensitive'/);
    });
  });

  describe('D — Plan v3 cache safety', () => {
    it('cache module defines TTL, pruning, and urgent guardrails', () => {
      const source = read('src/lib/plan/planEngineV3Cache.ts');
      expect(source).toMatch(/PLAN_V3_CACHE_TTL_MS/);
      expect(source).toMatch(/PLAN_V3_CACHE_SAFETY_TTL_MS/);
      expect(source).toMatch(/hasUrgentCurrentAction/);
      expect(source).toMatch(/containsDisallowedActionText/);
      expect(source).toMatch(/prunePlanV3Cache/);
    });

    it('nextActionAdapter remains v3 canonical without v2 runtime fallback', () => {
      const source = read('src/lib/plan/nextActionAdapter.ts');
      expect(source).toMatch(/planEngineV3/);
      expect(source).not.toMatch(/from ['"].*\/planEngineV2['"]/);
    });
  });

  describe('E — release gates', () => {
    it('audit report documents post-refactor verification', () => {
      const report = read('docs/release/post-refactor-audit.md');
      expect(report).toMatch(/post-refactor audit/i);
      expect(report).toMatch(/Ask server routing/i);
      expect(report).toMatch(/soft-delete filtering/i);
      expect(report).toMatch(/CareCircle refactor/i);
      expect(report).toMatch(/Plan v3 cache/i);
    });

    it('browser AI client blocks direct OpenAI calls', () => {
      const source = read('src/lib/ai/aiClient.ts');
      expect(source).toMatch(/server-only/i);
    });
  });
});
