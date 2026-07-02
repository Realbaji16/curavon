import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDraftFormInsight } from '../lib/form-insights/types';
import type { HealthModuleId } from '../lib/health-intelligence/modules/moduleIds';
import { runFormImport } from '../lib/form-insights/import/formImportService';
import {
  isFormImportPersistenceConfigured,
  buildFormImportPublicSummary,
} from '../lib/form-insights/import/formImportExecution';
import { buildFormInsightReportFromImportResult } from '../lib/form-insights/reports/formInsightReportBuilder';
import { runImportAutoPromotion } from '../lib/form-insights/promotion/autoPromotionEngine';

const PHRASE = 'zzcuravon_import_class_a_x1';

function insight(
  overrides: Partial<ReturnType<typeof createDraftFormInsight>> &
    Pick<Parameters<typeof createDraftFormInsight>[0], 'insightId' | 'insightType' | 'summary'>,
) {
  return createDraftFormInsight({
    sourceBatchId: 'batch_import_promo',
    evidence: {
      supportCount: 1,
      sourceRoles: ['patient'],
      rowRefs: ['r1'],
    },
    linkedModules: [],
    status: 'review',
    ...overrides,
  });
}

describe('import auto-promotion pipeline', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('Class A insight auto-activates overlays when validators pass', () => {
    const classA = insight({
      insightId: 'class_a_phrase',
      insightType: 'nigerian_phrase',
      summary: PHRASE,
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

    const result = runImportAutoPromotion([classA]);

    expect(result.promotionSummary.activeOverlayCount).toBe(1);
    expect(result.overlays.active).toHaveLength(1);
    expect(result.overlays.active[0]?.overlayType).toBe('module_trigger');
    expect(result.overlays.active[0]?.lifecycle).toBe('active');
    expect(result.insights[0]?.status).toBe('approved');
  });

  it('Class B insight creates shadow overlays below support threshold', () => {
    const classB = insight({
      insightId: 'class_b_concern',
      insightType: 'common_concern',
      summary: 'Fever or malaria-related concern mentioned',
      evidence: { supportCount: 1, sourceRoles: ['patient'], rowRefs: ['r1'] },
      linkedModules: [
        { moduleId: 'fever_malaria_ng_v1' as HealthModuleId, influenceTypes: ['trigger'] },
      ],
    });

    const result = runImportAutoPromotion([classB]);

    expect(result.promotionSummary.shadowOverlayCount).toBeGreaterThanOrEqual(1);
    expect(result.promotionSummary.activeOverlayCount).toBe(0);
    expect(result.overlays.shadow.length).toBeGreaterThanOrEqual(1);
    expect(result.promotion.decisions[0]?.outcome).toBe('shadow');
  });

  it('Class C insight is quarantined with no active overlays', () => {
    const classC = insight({
      insightId: 'class_c_red_flag',
      insightType: 'red_flag_candidate',
      summary: 'Chest pain language',
      approvedFor: 'safety_review_only',
      linkedModules: [
        { moduleId: 'chest_pain_ng_v1' as HealthModuleId, influenceTypes: ['guardrail'] },
      ],
    });

    const result = runImportAutoPromotion([classC]);

    expect(result.promotionSummary.quarantinedInsightCount).toBe(1);
    expect(result.promotionSummary.activeOverlayCount).toBe(0);
    expect(result.overlays.active).toHaveLength(0);
    expect(result.promotion.decisions[0]?.quarantined).toBe(true);
  });

  it('blocks invalid unsafe payload from live promotion', () => {
    const unsafe = insight({
      insightId: 'unsafe_trust',
      insightType: 'trust_wording',
      summary: 'You should stop your antimalarial medicine now',
      linkedModules: [
        { moduleId: 'medication_question_ng_v1' as HealthModuleId, influenceTypes: ['response_copy'] },
      ],
    });

    const result = runImportAutoPromotion([unsafe]);

    expect(result.promotionSummary.activeOverlayCount).toBe(0);
    expect(result.promotionSummary.blockedInsightCount).toBe(1);
    expect(result.promotion.decisions[0]?.outcome).toBe('blocked');
    expect(result.promotionSummary.blockedReasons.length).toBeGreaterThan(0);
  });

  it('runFormImport includes promotion summary and overlays in result', () => {
    const csv = [
      'Timestamp,Concern,State,I consent',
      `3/21/2026 10:00:00,help with ${PHRASE} for lab results,Lagos,Yes`,
    ].join('\n');

    const result = runFormImport({
      sourceName: 'promo-fixture',
      sourceRole: 'patient',
      filename: 'Patient.csv',
      csvText: csv,
      batchId: 'batch_promo_flow',
    });

    expect(result.promotionSummary).toBeDefined();
    expect(result.overlays).toBeDefined();
    expect(result.promotion.decisions.length).toBe(result.insights.length);

    const report = buildFormInsightReportFromImportResult(result);
    expect(report).toContain('## Auto-Promotion Summary');
    expect(report).toContain('**Active overlays:**');
    expect(report).toContain('**Shadow overlays:**');
    expect(report).toContain('**Quarantined insights:**');
  });

  it('local mode works without Supabase env', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');

    expect(isFormImportPersistenceConfigured()).toBe(false);

    const summary = buildFormImportPublicSummary(
      runFormImport({
        sourceName: 'local-only',
        sourceRole: 'patient',
        filename: 'local.csv',
        csvText: 'Timestamp,Concern\n3/21/2026 10:00:00,queue too long\n',
        batchId: 'batch_local',
      }),
    );

    expect(summary.promotion).toBeDefined();
    expect(summary.insights.length).toBeGreaterThanOrEqual(0);
  });
});
