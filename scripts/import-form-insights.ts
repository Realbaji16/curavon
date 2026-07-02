#!/usr/bin/env node

/**

 * Import de-identified form insights from CSV/ZIP in data/form-imports/raw/.

 *

 * Usage:

 *   npm run forms:import

 *   npm run forms:import -- --file data/form-imports/raw/export.csv

 *   npm run forms:import -- --file export.csv --persist

 *

 * When Supabase env vars are configured, insights + overlays + promotion events

 * are persisted automatically (use --persist to require persistence and fail if unavailable).

 *

 * Admin HTTP API is deferred until application admin roles exist.

 * See docs/architecture/phase3-form-import-execution.md

 */



import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';

import path from 'node:path';

import { fileURLToPath } from 'node:url';

import {

  buildFormImportPublicSummary,

  executeFormImportFromCsv,

  isFormImportPersistenceConfigured,

} from '../src/lib/form-insights/import/formImportExecution.ts';

import { readCsvTextFromUploadBuffer } from '../src/lib/form-insights/import/formImportFileIo.ts';

import { validateFormImportUpload } from '../src/lib/form-insights/import/formImportUpload.ts';

import { buildFormInsightReportMarkdown, toFormImportArtifact } from '../src/lib/form-insights/import/formImportService.ts';

import { persistFormImportResult } from '../src/lib/server/formInsightPersistence.ts';
import { writeLatestFormPromotionReport } from './generate-form-promotion-report.ts';



const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = path.resolve(__dirname, '..');

const RAW_DIR = path.join(REPO_ROOT, 'data/form-imports/raw');

const NORMALIZED_DIR = path.join(REPO_ROOT, 'data/form-imports/normalized');

const REPORTS_DIR = path.join(REPO_ROOT, 'data/form-imports/reports');

const ENV_LOCAL = path.join(REPO_ROOT, '.env.local');



function loadEnvLocal(): void {

  if (!existsSync(ENV_LOCAL)) return;

  for (const line of readFileSync(ENV_LOCAL, 'utf8').split('\n')) {

    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) continue;

    const eq = trimmed.indexOf('=');

    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();

    const value = trimmed.slice(eq + 1).trim();

    if (!process.env[key]) process.env[key] = value;

  }

}



function parseArgs(argv: string[]): { filePath?: string; persist: boolean } {

  const fileIndex = argv.indexOf('--file');

  const filePath =

    fileIndex !== -1 && argv[fileIndex + 1]

      ? path.resolve(process.cwd(), argv[fileIndex + 1]!)

      : undefined;



  return {

    filePath,

    persist: argv.includes('--persist'),

  };

}



function findImportFile(explicitPath?: string): string {

  if (explicitPath) {

    const validation = validateFormImportUpload({

      filename: path.basename(explicitPath),

      byteLength: statSync(explicitPath).size,

    });

    if (!validation.ok) {

      throw new Error(validation.message);

    }

    return explicitPath;

  }



  const candidates = readdirSync(RAW_DIR)

    .filter((name) => /\.(csv|zip)$/i.test(name))

    .map((name) => path.join(RAW_DIR, name))

    .sort((left, right) => statSync(right).mtimeMs - statSync(left).mtimeMs);



  if (candidates.length === 0) {

    throw new Error(`No .csv or .zip files found in ${RAW_DIR}`);

  }



  return candidates[0]!;

}



function safeLogSummary(

  summary: ReturnType<typeof buildFormImportPublicSummary>,

  persisted: boolean,

): void {

  console.log(`Import complete: batch=${summary.batchId}`);

  console.log(`  source=${summary.sourceName} role=${summary.sourceRole}`);

  console.log(`  rows=${summary.rowsImported} insights=${summary.insightsGenerated}`);

  console.log(`  reviewStatus=${summary.reviewStatus} persisted=${persisted}`);

  console.log(

    `  promotion: activeOverlays=${summary.promotion.activeOverlayCount} shadowOverlays=${summary.promotion.shadowOverlayCount} quarantined=${summary.promotion.quarantinedInsightCount} blocked=${summary.promotion.blockedInsightCount}`,

  );

  console.log('  (raw answers were not logged)');

}



async function main(): Promise<void> {

  loadEnvLocal();



  const { filePath, persist } = parseArgs(process.argv.slice(2));

  const importPath = findImportFile(filePath);

  const filename = path.basename(importPath);

  const fileBuffer = readFileSync(importPath);

  const validation = validateFormImportUpload({

    filename,

    byteLength: fileBuffer.byteLength,

  });



  if (!validation.ok) {

    throw new Error(validation.message);

  }



  const csvRead = await readCsvTextFromUploadBuffer(filename, fileBuffer);

  if (!csvRead.ok) {

    throw new Error(csvRead.message);

  }



  const result = executeFormImportFromCsv(csvRead.filename, csvRead.csvText);

  const summary = buildFormImportPublicSummary(result);



  mkdirSync(NORMALIZED_DIR, { recursive: true });

  mkdirSync(REPORTS_DIR, { recursive: true });



  const artifact = toFormImportArtifact(result);



  writeFileSync(

    path.join(NORMALIZED_DIR, 'latest-normalized-responses.json'),

    `${JSON.stringify(artifact.normalizedResponses, null, 2)}\n`,

    'utf8',

  );

  writeFileSync(

    path.join(NORMALIZED_DIR, 'latest-form-insights.json'),

    `${JSON.stringify(

      {

        meta: artifact.meta,

        insights: artifact.insights,

        moduleMappings: artifact.moduleMappings,

        promotionSummary: artifact.promotionSummary,

      },

      null,

      2,

    )}\n`,

    'utf8',

  );

  writeFileSync(

    path.join(NORMALIZED_DIR, 'latest-product-context-overlays.json'),

    `${JSON.stringify(

      {

        batchId: result.batchId,

        promotionSummary: result.promotionSummary,

        overlays: result.overlays,

      },

      null,

      2,

    )}\n`,

    'utf8',

  );

  writeFileSync(

    path.join(REPORTS_DIR, 'latest-form-insight-report.md'),

    `${buildFormInsightReportMarkdown(result)}\n`,

    'utf8',

  );

  // Generate promotion-focused report as part of the normal import flow.
  writeLatestFormPromotionReport();

  writeFileSync(

    path.join(NORMALIZED_DIR, 'latest-import-summary.json'),

    `${JSON.stringify(summary, null, 2)}\n`,

    'utf8',

  );



  const shouldPersist = persist || isFormImportPersistenceConfigured();

  let persisted = false;



  if (shouldPersist) {

    const persistResult = await persistFormImportResult({ result });

    if (!persistResult.ok) {

      if (persist) {

        throw new Error(`Database persist failed: ${persistResult.error.message}`);

      }

      console.warn(`  Supabase persist skipped: ${persistResult.error.message}`);

    } else {

      persisted = true;

      console.log(`  databaseBatchId=${persistResult.data.batchId}`);

      console.log(

        `  overlays=${persistResult.data.overlayCount} promotionEvents=${persistResult.data.promotionEventCount}`,

      );

    }

  }



  safeLogSummary(summary, persisted);

  console.log('Wrote normalized JSON, overlays, summary, and report under data/form-imports/');

}



main().catch((error: unknown) => {

  const message = error instanceof Error ? error.message : String(error);

  console.error(`Form import failed: ${message}`);

  process.exit(1);

});


