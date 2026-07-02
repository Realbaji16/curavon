#!/usr/bin/env node
/**
 * Generate a promotion-focused markdown report from latest normalized form insight artifacts.
 *
 * Usage:
 *   npm run forms:promotion-report
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DeriveOverlaysResult } from '../src/lib/form-insights/promotion/productContextOverlayService.ts';
import type { ProductContextOverlay } from '../src/lib/form-insights/promotion/productContextOverlayTypes.ts';
import type { FormImportPromotionSummary } from '../src/lib/form-insights/promotion/autoPromotionEngine.ts';
import { runImportAutoPromotion } from '../src/lib/form-insights/promotion/autoPromotionEngine.ts';
import type { FormInsight, FormInsightType } from '../src/lib/form-insights/types.ts';
import type { MappedFormInsightModules } from '../src/lib/form-insights/mapping/moduleInsightMapper.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const NORMALIZED_DIR = path.join(REPO_ROOT, 'data/form-imports/normalized');
const REPORTS_DIR = path.join(REPO_ROOT, 'data/form-imports/reports');

const INSIGHTS_PATH = path.join(NORMALIZED_DIR, 'latest-form-insights.json');
const OVERLAYS_PATH = path.join(NORMALIZED_DIR, 'latest-product-context-overlays.json');
const REPORT_PATH = path.join(REPORTS_DIR, 'latest-form-promotion-report.md');

type StoredInsightsFile = {
  meta?: {
    sourceName?: string;
    filename?: string;
    sourceRole?: string;
    batchId?: string;
    importedAt?: string;
    rowCount?: number;
  };
  insights: FormInsight[];
  moduleMappings?: MappedFormInsightModules[];
  promotionSummary?: FormImportPromotionSummary;
};

type StoredOverlaysFile = {
  batchId?: string;
  promotionSummary?: FormImportPromotionSummary;
  overlays?: DeriveOverlaysResult;
};

const PRODUCT_CONTEXT_OVERLAY_TYPES = [
  'module_trigger',
  'blocker_option',
  'care_route',
  'summary_field',
  'safe_question',
  'response_copy',
  'feature_backlog_item',
  'lifestyle_context',
] as const satisfies readonly string[];

function mandatoryDisclaimers(): string {
  return [
    '### Mandatory Disclaimers',
    '',
    '- Uploaded forms influence **product context only** (routing hints, safe questions, copy, and UX improvements).',
    '- Uploaded forms **do not define medical guidance** and must not be treated as diagnoses, prescriptions, or treatment plans.',
    '- **Quarantined insights never affect live behavior automatically.** They are recorded for safety review only.',
    '- This report is generated from **de-identified extracted insights and overlays** only. It must not print raw form answers.',
  ].join('\n');
}

function safeText(value: unknown, maxLen = 140): string {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxLen ? `${text.slice(0, maxLen - 1)}…` : text;
}

function countBy<T>(items: readonly T[], predicate: (item: T) => boolean): number {
  let count = 0;
  for (const item of items) if (predicate(item)) count += 1;
  return count;
}

function renderOverlayBullet(overlay: ProductContextOverlay): string {
  const base = `- \`${overlay.overlayKey}\` (${overlay.overlayType}) lifecycle=${overlay.lifecycle}`;
  const modulePart = overlay.moduleId ? ` module=${overlay.moduleId}` : '';

  const payloadPreview = (() => {
    // Avoid dumping payloads; show only short, safe excerpts.
    if (overlay.overlayType === 'safe_question') {
      const prompt = safeText((overlay.payload as any)?.prompt, 120);
      return prompt ? ` prompt=\"${prompt}\"` : '';
    }
    if (overlay.overlayType === 'response_copy') {
      const line = safeText((overlay.payload as any)?.line, 120);
      return line ? ` line=\"${line}\"` : '';
    }
    if (overlay.overlayType === 'module_trigger') {
      const terms = (overlay.payload as any)?.terms;
      const first = Array.isArray(terms) ? safeText(terms[0], 80) : '';
      return first ? ` term=\"${first}\"` : '';
    }
    if (overlay.overlayType === 'care_route') {
      const label = safeText((overlay.payload as any)?.label, 120);
      return label ? ` label=\"${label}\"` : '';
    }
    if (overlay.overlayType === 'blocker_option') {
      const label = safeText((overlay.payload as any)?.label, 120);
      return label ? ` label=\"${label}\"` : '';
    }
    if (overlay.overlayType === 'summary_field') {
      const label = safeText((overlay.payload as any)?.label, 120);
      return label ? ` label=\"${label}\"` : '';
    }
    if (overlay.overlayType === 'feature_backlog_item') {
      const description = safeText((overlay.payload as any)?.description, 120);
      return description ? ` item=\"${description}\"` : '';
    }
    if (overlay.overlayType === 'lifestyle_context') {
      const label = safeText((overlay.payload as any)?.label, 120);
      return label ? ` label=\"${label}\"` : '';
    }
    return '';
  })();

  return `${base}${modulePart}${payloadPreview}`;
}

function renderInsightBullet(insight: FormInsight): string {
  const summary = safeText(insight.summary, 140);
  const modules = insight.linkedModules?.map((m) => m.moduleId).filter(Boolean) ?? [];
  const moduleNote = modules.length > 0 ? ` modules=${modules.slice(0, 3).join(',')}` : '';
  return `- \`${insight.insightId}\` (${insight.insightType}) support=${insight.evidence.supportCount}${moduleNote}: ${summary}`;
}

function renderSection(title: string, bodyLines: string[]): string {
  return [`## ${title}`, '', ...bodyLines].join('\n');
}

function loadArtifacts(): {
  meta: StoredInsightsFile['meta'];
  insights: FormInsight[];
  promotionSummary: FormImportPromotionSummary | null;
  overlays: DeriveOverlaysResult | null;
} {
  if (!existsSync(INSIGHTS_PATH)) {
    throw new Error('Missing latest normalized artifacts. Run npm run forms:import first.');
  }

  const stored = JSON.parse(readFileSync(INSIGHTS_PATH, 'utf8')) as StoredInsightsFile;
  const overlaysStored = existsSync(OVERLAYS_PATH)
    ? (JSON.parse(readFileSync(OVERLAYS_PATH, 'utf8')) as StoredOverlaysFile)
    : null;

  let overlays = overlaysStored?.overlays ?? null;
  let promotionSummary = stored.promotionSummary ?? overlaysStored?.promotionSummary ?? null;

  // Fallback: if normalized overlay artifacts weren't written, recompute from insights only.
  // This still respects the pipeline rule of not printing raw form answers.
  if ((!overlays || !promotionSummary) && stored.insights?.length) {
    const recomputed = runImportAutoPromotion(stored.insights);
    overlays = overlays ?? recomputed.overlays;
    promotionSummary = promotionSummary ?? recomputed.promotionSummary;
  }

  return {
    meta: stored.meta,
    insights: stored.insights ?? [],
    promotionSummary,
    overlays,
  };
}

function classifyInsights(insights: readonly FormInsight[]) {
  const quarantined = insights.filter(
    (i) => i.approvedFor === 'safety_review_only' || i.insightType === 'unsafe_medication_pattern' || i.insightType === 'red_flag_candidate' || i.insightType === 'guardrail_candidate' || i.insightType === 'professional_opinion_conflict' || i.insightType === 'distrust_wording',
  );
  const professionalConflicts = insights.filter((i) => i.insightType === 'professional_opinion_conflict');
  const blocked = insights.filter((i) => i.status === 'rejected');
  return { quarantined, professionalConflicts, blocked };
}

function renderReport(): string {
  const { meta, insights, promotionSummary, overlays } = loadArtifacts();
  const recomputed = insights.length > 0 ? runImportAutoPromotion(insights) : null;
  const promotionDecisions = recomputed?.promotion.decisions ?? [];
  const blockedDecisions = promotionDecisions.filter(
    (d) => d.outcome === 'blocked' && !d.quarantined,
  );
  const { quarantined, professionalConflicts, blocked } = classifyInsights(insights);

  const allOverlays = overlays?.overlays ?? [];
  const activeOverlays = overlays?.active ?? [];
  const shadowOverlays = overlays?.shadow ?? [];
  const blockedOverlays = overlays?.blocked ?? [];

  const header = [
    '# Form promotion report',
    '',
    `**Batch ID:** ${meta?.batchId ?? 'unknown'}`,
    `**Source:** ${meta?.sourceName ?? 'unknown'}`,
    `**Filename:** ${meta?.filename ?? 'unknown'}`,
    `**Imported at:** ${meta?.importedAt ?? 'unknown'}`,
    '',
    mandatoryDisclaimers(),
  ].join('\n');

  const sections: string[] = [];

  sections.push(
    renderSection('1. Total insights', [
      `- **Total extracted insights:** ${insights.length}`,
      `- **Rows analyzed:** ${meta?.rowCount ?? 'unknown'}`,
      promotionSummary
        ? `- **Promotion summary:** activeOverlays=${promotionSummary.activeOverlayCount} shadowOverlays=${promotionSummary.shadowOverlayCount} quarantinedInsights=${promotionSummary.quarantinedInsightCount} blockedInsights=${promotionSummary.blockedInsightCount}`
        : '- **Promotion summary:** unavailable (missing artifacts)',
    ]),
  );

  sections.push(
    renderSection('2. Auto-active overlays', [
      `- **Active overlays:** ${activeOverlays.length}`,
      ...(activeOverlays.length > 0 ? activeOverlays.slice(0, 50).map(renderOverlayBullet) : ['- None']),
    ]),
  );

  sections.push(
    renderSection('3. Shadow overlays', [
      `- **Shadow overlays:** ${shadowOverlays.length}`,
      ...(shadowOverlays.length > 0 ? shadowOverlays.slice(0, 50).map(renderOverlayBullet) : ['- None']),
    ]),
  );

  sections.push(
    renderSection('4. Quarantined insights', [
      `- **Quarantined insights (safety review only):** ${quarantined.length}`,
      ...(quarantined.length > 0 ? quarantined.slice(0, 50).map(renderInsightBullet) : ['- None']),
    ]),
  );

  const blockedByPromotion = promotionSummary?.blockedReasons ?? [];
  sections.push(
    renderSection('5. Blocked insights', [
      `- **Blocked insights (policy/validators):** ${blockedDecisions.length}`,
      ...(blockedDecisions.length > 0
        ? blockedDecisions.slice(0, 50).map((b) => {
            const reasons =
              b.validationReasons.length > 0
                ? b.validationReasons.join(', ')
                : 'policy_or_validation_blocked';
            return `- \`${b.insightId}\` (${b.insightType}): ${safeText(reasons, 220)}`;
          })
        : ['- None']),
      blocked.length > 0 ? '' : '',
    ].filter(Boolean)),
  );

  sections.push(
    renderSection('6. Product changes now active', [
      `- **Active product-context changes:** ${activeOverlays.length}`,
      '- These are the only form-derived changes that can influence live behavior right now.',
      ...(activeOverlays.length > 0
        ? summarizeOverlayTypes(activeOverlays)
        : ['- None']),
    ]),
  );

  sections.push(
    renderSection('7. Product changes in shadow', [
      `- **Shadow product-context changes:** ${shadowOverlays.length}`,
      '- These are pending validation / support / review and must not affect live behavior.',
      ...(shadowOverlays.length > 0
        ? summarizeOverlayTypes(shadowOverlays)
        : ['- None']),
    ]),
  );

  sections.push(
    renderSection('8. Safety-review-only findings', [
      '- These findings are recorded for safety review and never auto-apply to product behavior.',
      `- **Count:** ${quarantined.length}`,
      ...(quarantined.length > 0 ? quarantined.slice(0, 30).map(renderInsightBullet) : ['- None']),
    ]),
  );

  sections.push(
    renderSection('9. Professional conflicts', [
      `- **Professional conflicts:** ${professionalConflicts.length}`,
      ...(professionalConflicts.length > 0
        ? professionalConflicts.slice(0, 30).map(renderInsightBullet)
        : ['- None']),
    ]),
  );

  sections.push(
    renderSection('10. Rollback instructions', [
      '- **Local (file-based) rollback:**',
      `  - Run \`npm run forms:rollback-overlay -- <overlay_id>\` or filter with \`--insight\`, \`--type\`, \`--module\`.`,
      `  - Or revert \`${path.relative(REPO_ROOT, path.join(NORMALIZED_DIR, 'latest-product-context-overlays.json'))}\` to a prior known-good version.`,
      '  - Restart the app/server so the runtime overlay cache reloads.',
      '',
      '- **Database (Supabase) rollback:**',
      '  - Set `product_context_overlays.status` to `retired` for the overlay keys you want to disable.',
      '  - Verify runtime is loading only `status=active` overlays.',
      '',
      '- **Safety note:** Do not attempt to roll back by changing medical guidance — forms never define medical guidance. Only product-context overlays should be toggled.',
      '',
      `- **Sanity check:** overlayRecords=${allOverlays.length} (active ${activeOverlays.length}, shadow ${shadowOverlays.length}, blocked ${blockedOverlays.length})`,
    ]),
  );

  return [header, ...sections].join('\n\n');
}

function summarizeOverlayTypes(overlays: readonly ProductContextOverlay[]): string[] {
  const counts: Record<string, number> = {};
  for (const overlay of overlays) {
    const key = overlay.overlayType;
    counts[key] = (counts[key] ?? 0) + 1;
  }

  const lines: string[] = [];
  for (const type of PRODUCT_CONTEXT_OVERLAY_TYPES) {
    const count = counts[type] ?? 0;
    if (count > 0) lines.push(`- **${type}:** ${count}`);
  }

  // Include any unexpected overlay types without breaking the report.
  for (const [type, count] of Object.entries(counts)) {
    if (!PRODUCT_CONTEXT_OVERLAY_TYPES.includes(type)) {
      lines.push(`- **${type}:** ${count}`);
    }
  }

  return lines.length > 0 ? lines : ['- None'];
}

function main(): void {
  const markdown = renderReport();
  writeFileSync(REPORT_PATH, `${markdown}\n`, 'utf8');
  console.log(`Promotion report written: ${path.relative(REPO_ROOT, REPORT_PATH)}`);
}

export function buildFormPromotionReportMarkdown(): string {
  return renderReport();
}

export function writeLatestFormPromotionReport(): { reportPath: string } {
  const markdown = renderReport();
  writeFileSync(REPORT_PATH, `${markdown}\n`, 'utf8');
  return { reportPath: REPORT_PATH };
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  const selfPath = fileURLToPath(import.meta.url);
  return path.resolve(entry) === path.resolve(selfPath);
}

if (isExecutedDirectly()) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Promotion report generation failed: ${message}`);
    process.exit(1);
  }
}

