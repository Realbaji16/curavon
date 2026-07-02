#!/usr/bin/env node

/**
 * Run Class B shadow-to-active promotion tests on imported form insights.
 *
 * Usage:
 *   npm run forms:promote-shadow
 *   npm run forms:promote-shadow -- --file data/form-imports/normalized/latest-form-insights.json
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FormInsight } from '../src/lib/form-insights/types.ts';
import { runShadowPromotionBatch } from '../src/lib/form-insights/promotion/shadowPromotionRunner.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const NORMALIZED_DIR = path.join(REPO_ROOT, 'data/form-imports/normalized');
const DEFAULT_INSIGHTS_PATH = path.join(NORMALIZED_DIR, 'latest-form-insights.json');
const DEFAULT_OVERLAYS_PATH = path.join(NORMALIZED_DIR, 'latest-product-context-overlays.json');

function parseArgs(): { insightsPath: string } {
  const args = process.argv.slice(2);
  const fileIndex = args.indexOf('--file');
  const insightsPath =
    fileIndex >= 0 && args[fileIndex + 1]
      ? path.resolve(REPO_ROOT, args[fileIndex + 1]!)
      : DEFAULT_INSIGHTS_PATH;

  return { insightsPath };
}

function loadInsights(filePath: string): FormInsight[] {
  if (!existsSync(filePath)) {
    throw new Error(`Insights file not found: ${filePath}`);
  }

  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected an array of insights in ${filePath}`);
  }

  return parsed as FormInsight[];
}

function main(): void {
  const { insightsPath } = parseArgs();
  const insights = loadInsights(insightsPath);
  const result = runShadowPromotionBatch(insights);

  mkdirSync(NORMALIZED_DIR, { recursive: true });
  writeFileSync(insightsPath, `${JSON.stringify(result.insights, null, 2)}\n`, 'utf8');
  writeFileSync(
    DEFAULT_OVERLAYS_PATH,
    `${JSON.stringify(result.overlays.overlays, null, 2)}\n`,
    'utf8',
  );

  console.log('Shadow promotion complete');
  console.log(`  source=${insightsPath}`);
  console.log(`  activated=${result.activatedCount} blocked=${result.blockedCount} skipped=${result.skippedCount}`);
  console.log(`  activeOverlays=${result.overlays.active.length} shadowOverlays=${result.overlays.shadow.length} blockedOverlays=${result.overlays.blocked.length}`);
  console.log(`  wroteOverlays=${DEFAULT_OVERLAYS_PATH}`);

  for (const entry of result.results) {
    if (entry.outcome === 'skipped') continue;
    console.log(
      `  - ${entry.insightId} (${entry.insightType}): ${entry.outcome}${entry.reasons.length > 0 ? ` — ${entry.reasons.join(', ')}` : ''}`,
    );
  }
}

main();
