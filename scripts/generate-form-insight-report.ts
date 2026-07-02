#!/usr/bin/env node
/**
 * Regenerate markdown report from latest normalized form insight artifacts.
 * Usage: npm run forms:report
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFormInsightReportMarkdown } from '../src/lib/form-insights/import/formImportService.ts';
import type { FormImportResult } from '../src/lib/form-insights/import/formImportService.ts';
import type { FormInsight } from '../src/lib/form-insights/types.ts';
import type { MappedFormInsightModules } from '../src/lib/form-insights/mapping/moduleInsightMapper.ts';
import type { NormalizedFormResponse } from '../src/lib/form-insights/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const NORMALIZED_DIR = path.join(REPO_ROOT, 'data/form-imports/normalized');
const REPORTS_DIR = path.join(REPO_ROOT, 'data/form-imports/reports');

const RESPONSES_PATH = path.join(NORMALIZED_DIR, 'latest-normalized-responses.json');
const INSIGHTS_PATH = path.join(NORMALIZED_DIR, 'latest-form-insights.json');
const REPORT_PATH = path.join(REPORTS_DIR, 'latest-form-insight-report.md');

type StoredInsightsFile = {
  meta: Omit<FormImportResult, 'normalizedResponses' | 'insights' | 'moduleMappings'>;
  insights: FormInsight[];
  moduleMappings: MappedFormInsightModules[];
};

function main(): void {
  if (!existsSync(RESPONSES_PATH) || !existsSync(INSIGHTS_PATH)) {
    throw new Error(
      'Missing latest normalized artifacts. Run npm run forms:import first.',
    );
  }

  const normalizedResponses = JSON.parse(
    readFileSync(RESPONSES_PATH, 'utf8'),
  ) as NormalizedFormResponse[];
  const stored = JSON.parse(readFileSync(INSIGHTS_PATH, 'utf8')) as StoredInsightsFile;

  const result: FormImportResult = {
    ...stored.meta,
    normalizedResponses,
    insights: stored.insights,
    moduleMappings: stored.moduleMappings,
  };

  writeFileSync(REPORT_PATH, `${buildFormInsightReportMarkdown(result)}\n`, 'utf8');

  console.log(`Report written: ${path.relative(REPO_ROOT, REPORT_PATH)}`);
  console.log(`  insights=${result.insights.length} rows=${result.rowCount}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Report generation failed: ${message}`);
  process.exit(1);
}
