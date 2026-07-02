import { detectSourceRoleFromFilename } from './formRedactor';
import { runFormImport, type FormImportInput, type FormImportResult } from './formImportService';
import type { FormInsightStatus, FormSourceRole } from '../types';
import type { FormImportPromotionSummary } from '../promotion/autoPromotionEngine';

export type FormImportPublicInsightSummary = {
  insightId: string;
  insightType: string;
  summary: string;
  status: FormInsightStatus;
  supportCount: number;
};

export type FormImportPublicSummary = {
  batchId: string;
  sourceName: string;
  sourceRole: FormSourceRole;
  filename: string;
  rowsImported: number;
  insightsGenerated: number;
  moduleLinks: number;
  reviewStatus: FormInsightStatus;
  promotion: FormImportPromotionSummary;
  insights: FormImportPublicInsightSummary[];
};

export type ExecuteFormImportOptions = {
  sourceName?: string;
  sourceRole?: FormSourceRole;
  batchId?: string;
};

export function isFormImportPersistenceConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  return Boolean(url && serviceRoleKey);
}

/**
 * Run the offline import pipeline (parse → redact → extract → map → auto-promote → overlays).
 * Does not persist to Supabase.
 */
export function executeFormImportFromCsv(
  filename: string,
  csvText: string,
  options: ExecuteFormImportOptions = {},
): FormImportResult {
  const sourceRole =
    options.sourceRole && options.sourceRole !== 'unknown'
      ? options.sourceRole
      : detectSourceRoleFromFilename(filename);

  const input: FormImportInput = {
    sourceName: options.sourceName ?? stripExtension(filename),
    sourceRole,
    filename,
    csvText,
    batchId: options.batchId,
  };

  return runFormImport(input);
}

/** Public-safe import summary — no raw answers or de-identified payloads. */
export function buildFormImportPublicSummary(result: FormImportResult): FormImportPublicSummary {
  const reviewStatus = resolveAggregateReviewStatus(result.insights);

  return {
    batchId: result.batchId,
    sourceName: result.sourceName,
    sourceRole: result.sourceRole,
    filename: result.filename,
    rowsImported: result.rowCount,
    insightsGenerated: result.insights.length,
    moduleLinks: result.moduleMappings.reduce(
      (total, mapping) => total + mapping.linkedModules.length,
      0,
    ),
    reviewStatus,
    promotion: result.promotionSummary,
    insights: result.insights.map((insight) => ({
      insightId: insight.insightId,
      insightType: insight.insightType,
      summary: insight.summary,
      status: insight.status,
      supportCount: insight.evidence.supportCount,
    })),
  };
}

function resolveAggregateReviewStatus(
  insights: FormImportResult['insights'],
): FormInsightStatus {
  if (insights.length === 0) {
    return 'review';
  }

  if (insights.every((insight) => insight.status === 'approved')) {
    return 'approved';
  }

  if (insights.every((insight) => insight.status === 'rejected')) {
    return 'rejected';
  }

  return 'review';
}

function stripExtension(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index === -1 ? filename : filename.slice(0, index);
}
