import { afterEach, describe, expect, it } from 'vitest';
import {
  buildProductContextFromActiveOverlays,
  deriveOverlaysFromInsight,
} from '../lib/form-insights/promotion/productContextOverlayService';
import {
  matchesRollbackFilter,
  parseOverlayRollbackArgs,
  rollbackLocalOverlayStore,
  rollbackOverlays,
  selectOverlaysForRollback,
} from '../lib/form-insights/promotion/overlayRollbackService';
import {
  resetActiveProductContextCache,
  seedActiveProductContextForTests,
} from '../lib/form-insights/runtime/productContextProvider';
import { createDraftFormInsight } from '../lib/form-insights/types';
import type { HealthModuleId } from '../lib/health-intelligence/modules/moduleIds';
import { routeHealthModules } from '../lib/health-intelligence/services/moduleRouter';
import { getActiveOverlays } from '../lib/form-insights/promotion/productContextOverlayService';

const PHRASE = 'zzcuravon_rollback_route_x1';

function activePhraseInsight(insightId = 'rollback_phrase') {
  return createDraftFormInsight({
    insightId,
    sourceBatchId: 'batch_rollback',
    insightType: 'nigerian_phrase',
    summary: PHRASE,
    status: 'approved',
    evidence: {
      supportCount: 1,
      sourceRoles: ['patient'],
      rowRefs: ['r1'],
      matchedPatterns: [PHRASE],
    },
    linkedModules: [
      { moduleId: 'lab_result_confusion_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
    ],
  });
}

function buildStoreFromInsights(insights: ReturnType<typeof createDraftFormInsight>[]) {
  const overlays = insights.flatMap((insight) => deriveOverlaysFromInsight(insight));
  return {
    batchId: 'batch_rollback',
    overlays: {
      overlays,
      active: overlays.filter((overlay) => overlay.lifecycle === 'active'),
      shadow: overlays.filter((overlay) => overlay.lifecycle === 'shadow'),
      blocked: overlays.filter((overlay) => overlay.lifecycle === 'blocked'),
    },
  };
}

describe('overlayRollbackService', () => {
  afterEach(() => {
    resetActiveProductContextCache();
  });

  it('rollback one overlay by overlay id', () => {
    const insight = activePhraseInsight();
    const overlays = deriveOverlaysFromInsight(insight);
    const target = overlays[0]!;

    const rolled = rollbackOverlays(overlays, { overlayId: target.overlayId });

    expect(rolled.result.retiredCount).toBe(1);
    expect(rolled.result.events[0]?.eventType).toBe('rollback');
    expect(rolled.overlays[0]?.lifecycle).toBe('retired');
    expect(rolled.overlays[0]?.retiredAt).toBeTruthy();
  });

  it('rollback by insight id', () => {
    const store = buildStoreFromInsights([
      activePhraseInsight('insight_a'),
      createDraftFormInsight({
        ...activePhraseInsight('insight_b'),
        linkedModules: [
          { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
        ],
      }),
    ]);
    const rolled = rollbackLocalOverlayStore(store, { insightId: 'insight_a' });

    expect(rolled.result.retiredCount).toBe(1);
    expect(rolled.result.retiredOverlays[0]?.sourceInsightId).toBe('insight_a');
    expect(rolled.store.overlays.active).toHaveLength(1);
    expect(rolled.store.overlays.active[0]?.sourceInsightId).toBe('insight_b');
  });

  it('rollback by module and type', () => {
    const store = buildStoreFromInsights([
      activePhraseInsight('lab_phrase'),
      createDraftFormInsight({
        ...activePhraseInsight('fever_phrase'),
        linkedModules: [
          { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
        ],
      }),
    ]);
    const rolled = rollbackLocalOverlayStore(store, {
      overlayType: 'module_trigger',
      moduleId: 'fever_malaria_ng_v1',
    });

    expect(rolled.result.retiredCount).toBe(1);
    expect(rolled.result.retiredOverlays[0]?.overlayType).toBe('module_trigger');
    expect(rolled.result.retiredOverlays[0]?.moduleId).toBe('fever_malaria_ng_v1');
    expect(
      rolled.store.overlays.active.some(
        (overlay) =>
          overlay.overlayType === 'module_trigger' && overlay.moduleId === 'fever_malaria_ng_v1',
      ),
    ).toBe(false);
    expect(
      rolled.store.overlays.active.some(
        (overlay) =>
          overlay.overlayType === 'module_trigger' &&
          overlay.moduleId === 'lab_result_confusion_ng_v1',
      ),
    ).toBe(true);
  });

  it('retired overlays do not influence runtime context', () => {
    const insight = activePhraseInsight();
    const overlays = deriveOverlaysFromInsight(insight);
    const active = getActiveOverlays(overlays);
    expect(active).toHaveLength(1);

    seedActiveProductContextForTests(buildProductContextFromActiveOverlays(active));
    const rawText = `Need help with ${PHRASE} today`;
    expect(routeHealthModules({ rawText }).selectedModules.map((module) => module.moduleId)).toContain(
      'lab_result_confusion_ng_v1',
    );

    const rolled = rollbackOverlays(overlays, { overlayId: active[0]!.overlayId });
    const stillActive = getActiveOverlays(rolled.overlays);
    expect(stillActive).toHaveLength(0);

    resetActiveProductContextCache();
    seedActiveProductContextForTests(buildProductContextFromActiveOverlays(stillActive));
    expect(routeHealthModules({ rawText }).selectedModules.map((module) => module.moduleId)).not.toContain(
      'lab_result_confusion_ng_v1',
    );
  });

  it('parses CLI rollback arguments', () => {
    expect(parseOverlayRollbackArgs(['overlay_123'])).toEqual({ overlayId: 'overlay_123' });
    expect(parseOverlayRollbackArgs(['--insight', 'fi_abc'])).toEqual({ insightId: 'fi_abc' });
    expect(parseOverlayRollbackArgs(['--type', 'module_trigger'])).toEqual({
      overlayType: 'module_trigger',
    });
    expect(parseOverlayRollbackArgs(['--module', 'fever_malaria_ng_v1'])).toEqual({
      moduleId: 'fever_malaria_ng_v1',
    });
  });

  it('skips overlays that are already retired', () => {
    const insight = activePhraseInsight();
    const overlays = deriveOverlaysFromInsight(insight);
    const firstPass = rollbackOverlays(overlays, { overlayId: overlays[0]!.overlayId });
    const secondPass = rollbackOverlays(firstPass.overlays, { overlayId: overlays[0]!.overlayId });

    expect(secondPass.result.retiredCount).toBe(0);
    expect(secondPass.result.skippedAlreadyRetired).toBe(1);
  });

  it('matches overlay key and overlay id', () => {
    const overlay = deriveOverlaysFromInsight(activePhraseInsight())[0]!;
    expect(matchesRollbackFilter(overlay, { overlayId: overlay.overlayId })).toBe(true);
    expect(matchesRollbackFilter(overlay, { overlayId: overlay.overlayKey })).toBe(true);
    expect(selectOverlaysForRollback([overlay], { overlayId: overlay.overlayKey }).toRetire).toHaveLength(1);
  });
});
