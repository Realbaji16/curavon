import { createHash } from 'node:crypto';

import {

  runImportAutoPromotion,

  type BatchPromotionResult,

  type FormImportPromotionSummary,

  type ImportAutoPromotionResult,

} from '../promotion/autoPromotionEngine';

import { buildFormInsightOverlay } from '../promotion/overlayBuilder';

import type { DeriveOverlaysResult } from '../promotion/productContextOverlayService';

import { extractFormInsights } from '../extraction/insightExtractor';

import {

  applyModuleMappingsToInsights,

  mapInsightsToModules,

  type MappedFormInsightModules,

} from '../mapping/moduleInsightMapper';

import { parseGoogleFormCsv } from './csvFormParser';

import { detectSourceRoleFromFilename, redactFormRows } from './formRedactor';

import type { FormInsight, FormSourceRole, NormalizedFormResponse } from '../types';



export type FormImportInput = {

  sourceName: string;

  sourceRole: FormSourceRole;

  filename: string;

  csvText: string;

  batchId?: string;

};



export type FormImportResult = {

  batchId: string;

  sourceName: string;

  sourceRole: FormSourceRole;

  filename: string;

  importedAt: string;

  headers: readonly string[];

  rowCount: number;

  normalizedResponses: NormalizedFormResponse[];

  insights: FormInsight[];

  moduleMappings: MappedFormInsightModules[];

  promotion: BatchPromotionResult;

  overlays: DeriveOverlaysResult;

  promotionSummary: FormImportPromotionSummary;

};



export type FormImportArtifact = {

  normalizedResponses: NormalizedFormResponse[];

  insights: FormInsight[];

  moduleMappings: MappedFormInsightModules[];

  promotion: BatchPromotionResult;

  overlays: DeriveOverlaysResult;

  promotionSummary: FormImportPromotionSummary;

  meta: Omit<

    FormImportResult,

    'normalizedResponses' | 'insights' | 'moduleMappings' | 'promotion' | 'overlays' | 'promotionSummary'

  >;

};



/**

 * Deterministic form import pipeline:

 * parse → redact → extract → map modules → auto-promote → overlays → report inputs.

 * No Supabase or filesystem I/O — safe for unit tests.

 */

export function runFormImport(input: FormImportInput): FormImportResult {

  const batchId = input.batchId ?? buildBatchId(input);

  const sourceRole = resolveSourceRole(input);

  const parsed = parseGoogleFormCsv(input.csvText);

  const normalizedResponses = redactFormRows({

    headers: parsed.headers,

    rows: parsed.rows,

    sourceRole,

    batchId,

  });



  const extracted = extractFormInsights({

    sourceBatchId: batchId,

    responses: normalizedResponses,

  });



  const mappedInsights = applyModuleMappingsToInsights(extracted.insights);

  const autoPromotion = runImportAutoPromotion(mappedInsights);

  const moduleMappings = mapInsightsToModules(autoPromotion.insights);



  return {

    batchId,

    sourceName: input.sourceName,

    sourceRole,

    filename: input.filename,

    importedAt: new Date().toISOString(),

    headers: parsed.headers,

    rowCount: normalizedResponses.length,

    normalizedResponses,

    insights: autoPromotion.insights,

    moduleMappings,

    promotion: autoPromotion.promotion,

    overlays: autoPromotion.overlays,

    promotionSummary: autoPromotion.promotionSummary,

  };

}



/** Build live product overlay view from a completed import result. */

export function buildFormImportProductOverlay(result: FormImportResult) {

  return buildFormInsightOverlay({ insights: result.insights });

}



export function toFormImportArtifact(result: FormImportResult): FormImportArtifact {

  const {

    normalizedResponses,

    insights,

    moduleMappings,

    promotion,

    overlays,

    promotionSummary,

    ...meta

  } = result;

  return {

    normalizedResponses,

    insights,

    moduleMappings,

    promotion,

    overlays,

    promotionSummary,

    meta,

  };

}



export { buildFormInsightReportFromImportResult as buildFormInsightReportMarkdown } from '../reports/formInsightReportBuilder';



export type { ImportAutoPromotionResult };



function resolveSourceRole(input: FormImportInput): FormSourceRole {

  if (input.sourceRole !== 'unknown') {

    return input.sourceRole;

  }

  return detectSourceRoleFromFilename(input.filename);

}



function buildBatchId(input: FormImportInput): string {

  const seed = `${input.sourceName}::${input.filename}::${input.csvText.length}`;

  return `batch_${createHash('sha256').update(seed).digest('hex').slice(0, 16)}`;

}


