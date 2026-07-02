import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import type { FormInsightType } from '../extraction/insightTaxonomy';
import type { FormImportResult } from '../import/formImportService';
import {
  buildInsightPromotionRecord,
  evaluateInsightPromotion,
  runImportAutoPromotion,
  type InsightPromotionDecision,
} from '../promotion/autoPromotionEngine';
import type { ProductContextOverlay } from '../promotion/productContextOverlayTypes';
import type { ModuleInfluenceType } from '../mapping/moduleInfluenceTypes';
import type { MappedFormInsightModules } from '../mapping/moduleInsightMapper';
import type {
  FormInsight,
  FormInsightApprovedFor,
  FormInsightConfidence,
  FormInsightEvidence,
  FormInsightLinkedModule,
  FormInsightStatus,
  FormSourceRole,
  NormalizedFormResponse,
} from '../types';

const INSERT_CHUNK_SIZE = 100;
const FORBIDDEN_PAYLOAD_KEYS = /\b(raw_csv|csv_text|raw_row|full_name|email|phone)\b/i;

export type FormInsightRepositoryErrorCode =
  | 'not_configured'
  | 'not_found'
  | 'validation_failed'
  | 'insert_failed'
  | 'update_failed'
  | 'query_failed'
  | 'partial_import_failed';

export type FormInsightRepositoryError = {
  code: FormInsightRepositoryErrorCode;
  message: string;
  stage?: string;
  batchId?: string;
  insightId?: string;
  insertedCount?: number;
};

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FormInsightRepositoryError };

export type ImportBatchRecord = {
  id: string;
  sourceFilename: string | null;
  sourceRole: FormSourceRole;
  importStatus: 'pending' | 'processing' | 'completed' | 'failed';
  rowCount: number;
  responseCount: number;
  insightCount: number;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CreateImportBatchInput = {
  sourceFilename?: string;
  sourceRole: FormSourceRole;
  rowCount?: number;
  metadata?: Record<string, unknown>;
  batchId?: string;
};

export type InsertNormalizedResponsesInput = {
  batchId: string;
  responses: readonly NormalizedFormResponse[];
};

export type InsertNormalizedResponsesResult = {
  batchId: string;
  insertedCount: number;
};

export type InsertFormInsightsInput = {
  batchId: string;
  insights: readonly FormInsight[];
  promotionDecisions?: readonly InsightPromotionDecision[];
};

export type InsertFormInsightsResult = {
  batchId: string;
  insertedCount: number;
  insightKeyToId: Record<string, string>;
};

export type LinkInsightsToModulesInput = {
  batchId: string;
  mappings: readonly MappedFormInsightModules[];
  insightKeyToId?: Readonly<Record<string, string>>;
};

export type LinkInsightsToModulesResult = {
  batchId: string;
  linkedCount: number;
};

export type ListInsightsFilter = {
  batchId?: string;
  status?: FormInsightStatus;
  insightType?: FormInsightType;
  limit?: number;
  offset?: number;
};

export type FormInsightReviewEventType =
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'note'
  | 'status_change';

export type RecordReviewEventInput = {
  insightId: string;
  eventType: FormInsightReviewEventType;
  reviewerNote?: string;
  previousStatus?: FormInsightStatus | null;
  newStatus?: FormInsightStatus | null;
  payload?: Record<string, unknown>;
};

export type RecordReviewEventResult = {
  eventId: string;
  insightId: string;
};

export type PersistFormImportInput = {
  result: FormImportResult;
  batchId?: string;
};

export type PersistFormImportResult = {
  batchId: string;
  responseCount: number;
  insightCount: number;
  moduleLinkCount: number;
  overlayCount: number;
  promotionEventCount: number;
};

export type FormInsightRepository = {
  createImportBatch: (input: CreateImportBatchInput) => Promise<RepositoryResult<ImportBatchRecord>>;
  insertNormalizedResponses: (
    input: InsertNormalizedResponsesInput,
  ) => Promise<RepositoryResult<InsertNormalizedResponsesResult>>;
  insertFormInsights: (
    input: InsertFormInsightsInput,
  ) => Promise<RepositoryResult<InsertFormInsightsResult>>;
  linkInsightsToModules: (
    input: LinkInsightsToModulesInput,
  ) => Promise<RepositoryResult<LinkInsightsToModulesResult>>;
  listInsights: (filter?: ListInsightsFilter) => Promise<RepositoryResult<FormInsight[]>>;
  getInsightById: (insightId: string) => Promise<RepositoryResult<FormInsight>>;
  updateInsightStatus: (
    insightId: string,
    status: FormInsightStatus,
  ) => Promise<RepositoryResult<FormInsight>>;
  recordReviewEvent: (
    input: RecordReviewEventInput,
  ) => Promise<RepositoryResult<RecordReviewEventResult>>;
  persistFormImportResult: (
    input: PersistFormImportInput,
  ) => Promise<RepositoryResult<PersistFormImportResult>>;
};

type FormInsightRow = {
  id: string;
  batch_id: string;
  insight_key: string;
  insight_type: FormInsightType;
  summary: string;
  evidence: FormInsightEvidence;
  confidence: FormInsightConfidence;
  medical_truth: false;
  approved_for: FormInsightApprovedFor;
  status: FormInsightStatus;
  product_use: string;
  created_at: string;
  updated_at: string;
};

export function createFormInsightRepository(client: SupabaseClient): FormInsightRepository {
  return {
    createImportBatch: (input) => createImportBatch(client, input),
    insertNormalizedResponses: (input) => insertNormalizedResponses(client, input),
    insertFormInsights: (input) => insertFormInsights(client, input),
    linkInsightsToModules: (input) => linkInsightsToModules(client, input),
    listInsights: (filter) => listInsights(client, filter),
    getInsightById: (insightId) => getInsightById(client, insightId),
    updateInsightStatus: (insightId, status) => updateInsightStatus(client, insightId, status),
    recordReviewEvent: (input) => recordReviewEvent(client, input),
    persistFormImportResult: (input) => persistFormImportResult(client, input),
  };
}

export async function createImportBatch(
  client: SupabaseClient,
  input: CreateImportBatchInput,
): Promise<RepositoryResult<ImportBatchRecord>> {
  const row = {
    id: input.batchId,
    source_filename: input.sourceFilename ?? null,
    source_role: input.sourceRole,
    import_status: 'processing' as const,
    row_count: input.rowCount ?? 0,
    response_count: 0,
    insight_count: 0,
    error_message: null,
    metadata: input.metadata ?? {},
  };

  const { data, error } = await client.from('form_import_batches').insert(row).select('*').single();

  if (error || !data) {
    return fail('insert_failed', 'Failed to create import batch.', {
      stage: 'create_import_batch',
      batchId: input.batchId,
    });
  }

  return ok(mapBatchRow(data));
}

export async function insertNormalizedResponses(
  client: SupabaseClient,
  input: InsertNormalizedResponsesInput,
): Promise<RepositoryResult<InsertNormalizedResponsesResult>> {
  const validation = validateNormalizedResponses(input.responses);
  if (!validation.ok) {
    await markBatchFailed(client, input.batchId, validation.error.message, 'insert_normalized_responses');
    return validation;
  }

  let insertedCount = 0;

  for (const chunk of chunkArray(input.responses, INSERT_CHUNK_SIZE)) {
    const rows = chunk.map((response) => toResponseInsertRow(input.batchId, response));
    const { error } = await client.from('form_responses').insert(rows);

    if (error) {
      await markBatchFailed(
        client,
        input.batchId,
        `Normalized response insert failed after ${insertedCount} row(s).`,
        'insert_normalized_responses',
      );
      return fail('partial_import_failed', 'Failed while inserting normalized responses.', {
        stage: 'insert_normalized_responses',
        batchId: input.batchId,
        insertedCount,
      });
    }

    insertedCount += chunk.length;
  }

  await updateBatchCounts(client, input.batchId, { responseCount: insertedCount });

  return ok({
    batchId: input.batchId,
    insertedCount,
  });
}

export async function insertFormInsights(
  client: SupabaseClient,
  input: InsertFormInsightsInput,
): Promise<RepositoryResult<InsertFormInsightsResult>> {
  const validation = validateFormInsights(input.insights);
  if (!validation.ok) {
    await markBatchFailed(client, input.batchId, validation.error.message, 'insert_form_insights');
    return validation;
  }

  const decisionByInsightId = new Map(
    (input.promotionDecisions ?? []).map((decision) => [decision.insightId, decision]),
  );

  const insightKeyToId: Record<string, string> = {};
  let insertedCount = 0;

  for (const chunk of chunkArray(input.insights, INSERT_CHUNK_SIZE)) {
    const rows = chunk.map((insight) => {
      const decision = decisionByInsightId.get(insight.insightId) ?? evaluateInsightPromotion(insight);
      const promotionRecord = buildInsightPromotionRecord(insight, decision);
      return toInsightInsertRow(input.batchId, insight, promotionRecord);
    });
    const { data, error } = await client.from('form_insights').insert(rows).select('id, insight_key');

    if (error || !data) {
      await markBatchFailed(
        client,
        input.batchId,
        `Insight insert failed after ${insertedCount} insight(s).`,
        'insert_form_insights',
      );
      return fail('partial_import_failed', 'Failed while inserting form insights.', {
        stage: 'insert_form_insights',
        batchId: input.batchId,
        insertedCount,
      });
    }

    for (const row of data) {
      insightKeyToId[row.insight_key] = row.id;
    }
    insertedCount += data.length;
  }

  await updateBatchCounts(client, input.batchId, { insightCount: insertedCount });

  return ok({
    batchId: input.batchId,
    insertedCount,
    insightKeyToId,
  });
}

export async function linkInsightsToModules(
  client: SupabaseClient,
  input: LinkInsightsToModulesInput,
): Promise<RepositoryResult<LinkInsightsToModulesResult>> {
  const resolvedMap = input.insightKeyToId
    ? { ok: true as const, data: input.insightKeyToId }
    : await resolveInsightKeyMap(client, input.batchId);

  if (!resolvedMap.ok) {
    return resolvedMap;
  }

  const insightKeyToId = resolvedMap.data;

  const rows = buildModuleLinkRows(input.mappings, insightKeyToId);
  if (rows.length === 0) {
    return ok({ batchId: input.batchId, linkedCount: 0 });
  }

  let linkedCount = 0;

  for (const chunk of chunkArray(rows, INSERT_CHUNK_SIZE)) {
    const { error } = await client.from('form_insight_module_links').upsert(chunk, {
      onConflict: 'insight_id,module_id',
    });

    if (error) {
      await markBatchFailed(
        client,
        input.batchId,
        `Module link insert failed after ${linkedCount} link(s).`,
        'link_insights_to_modules',
      );
      return fail('partial_import_failed', 'Failed while linking insights to modules.', {
        stage: 'link_insights_to_modules',
        batchId: input.batchId,
        insertedCount: linkedCount,
      });
    }

    linkedCount += chunk.length;
  }

  return ok({ batchId: input.batchId, linkedCount });
}

export async function listInsights(
  client: SupabaseClient,
  filter: ListInsightsFilter = {},
): Promise<RepositoryResult<FormInsight[]>> {
  let query = client.from('form_insights').select('*');

  if (filter.batchId) {
    query = query.eq('batch_id', filter.batchId);
  }
  if (filter.status) {
    query = query.eq('status', filter.status);
  }
  if (filter.insightType) {
    query = query.eq('insight_type', filter.insightType);
  }

  const limit = filter.limit ?? 100;
  const offset = filter.offset ?? 0;
  query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    return fail('query_failed', 'Failed to list form insights.');
  }

  return ok((data ?? []).map((row) => mapInsightRow(row as FormInsightRow, [])));
}

export async function getInsightById(
  client: SupabaseClient,
  insightId: string,
): Promise<RepositoryResult<FormInsight>> {
  const { data: insightRow, error: insightError } = await client
    .from('form_insights')
    .select('*')
    .eq('id', insightId)
    .maybeSingle();

  if (insightError) {
    return fail('query_failed', 'Failed to load form insight.');
  }

  if (!insightRow) {
    return fail('not_found', 'Form insight not found.', { insightId });
  }

  const { data: linkRows, error: linkError } = await client
    .from('form_insight_module_links')
    .select('module_id, influence_types')
    .eq('insight_id', insightId);

  if (linkError) {
    return fail('query_failed', 'Failed to load module links for insight.', { insightId });
  }

  const linkedModules = (linkRows ?? []).map((row) => ({
    moduleId: row.module_id,
    influenceTypes: row.influence_types as ModuleInfluenceType[],
  })) satisfies FormInsightLinkedModule[];

  return ok(mapInsightRow(insightRow as FormInsightRow, linkedModules));
}

export async function updateInsightStatus(
  client: SupabaseClient,
  insightId: string,
  status: FormInsightStatus,
): Promise<RepositoryResult<FormInsight>> {
  const existing = await getInsightById(client, insightId);
  if (!existing.ok) {
    return existing;
  }

  const { data, error } = await client
    .from('form_insights')
    .update({ status })
    .eq('id', insightId)
    .select('*')
    .single();

  if (error || !data) {
    return fail('update_failed', 'Failed to update insight status.', { insightId });
  }

  const reviewResult = await recordReviewEvent(client, {
    insightId,
    eventType: 'status_change',
    previousStatus: existing.data.status,
    newStatus: status,
  });

  if (!reviewResult.ok) {
    return fail(reviewResult.error.code, reviewResult.error.message, {
      insightId,
      stage: reviewResult.error.stage,
    });
  }

  return getInsightById(client, insightId);
}

export async function recordReviewEvent(
  client: SupabaseClient,
  input: RecordReviewEventInput,
): Promise<RepositoryResult<RecordReviewEventResult>> {
  const { data, error } = await client
    .from('form_insight_review_events')
    .insert({
      insight_id: input.insightId,
      event_type: input.eventType,
      reviewer_note: input.reviewerNote ?? null,
      previous_status: input.previousStatus ?? null,
      new_status: input.newStatus ?? null,
      payload: input.payload ?? {},
    })
    .select('id, insight_id')
    .single();

  if (error || !data) {
    return fail('insert_failed', 'Failed to record review event.', {
      insightId: input.insightId,
      stage: 'record_review_event',
    });
  }

  return ok({
    eventId: data.id,
    insightId: data.insight_id,
  });
}

export async function persistFormImportResult(
  client: SupabaseClient,
  input: PersistFormImportInput,
): Promise<RepositoryResult<PersistFormImportResult>> {
  const batchId = input.batchId ?? crypto.randomUUID();
  const { result } = input;
  const promotionBundle =
    result.promotion && result.overlays
      ? { promotion: result.promotion, overlays: result.overlays }
      : runImportAutoPromotion(result.insights);

  const batchResult = await createImportBatch(client, {
    batchId,
    sourceFilename: result.filename,
    sourceRole: result.sourceRole,
    rowCount: result.rowCount,
    metadata: {
      sourceName: result.sourceName,
      importBatchKey: result.batchId,
      importedAt: result.importedAt,
    },
  });

  if (!batchResult.ok) {
    return batchResult;
  }

  const responsesResult = await insertNormalizedResponses(client, {
    batchId,
    responses: result.normalizedResponses,
  });
  if (!responsesResult.ok) {
    return responsesResult;
  }

  const insightsResult = await insertFormInsights(client, {
    batchId,
    insights: result.insights,
    promotionDecisions: promotionBundle.promotion.decisions,
  });
  if (!insightsResult.ok) {
    return insightsResult;
  }

  const linksResult = await linkInsightsToModules(client, {
    batchId,
    mappings: result.moduleMappings,
    insightKeyToId: insightsResult.data.insightKeyToId,
  });
  if (!linksResult.ok) {
    return linksResult;
  }

  const overlaysResult = await insertProductContextOverlays(client, {
    batchId,
    overlays: promotionBundle.overlays.overlays,
    insightKeyToId: insightsResult.data.insightKeyToId,
  });
  if (!overlaysResult.ok) {
    return overlaysResult;
  }

  const eventsResult = await insertFormInsightPromotionEvents(client, {
    promotionDecisions: promotionBundle.promotion.decisions,
    overlays: promotionBundle.overlays.overlays,
    insightKeyToId: insightsResult.data.insightKeyToId,
    overlayIdByKey: overlaysResult.data.overlayIdByKey,
  });
  if (!eventsResult.ok) {
    return eventsResult;
  }

  const { error: completeError } = await client
    .from('form_import_batches')
    .update({
      import_status: 'completed',
      row_count: result.rowCount,
      response_count: responsesResult.data.insertedCount,
      insight_count: insightsResult.data.insertedCount,
      error_message: null,
    })
    .eq('id', batchId);

  if (completeError) {
    await markBatchFailed(client, batchId, 'Import completed but batch status update failed.', 'finalize_batch');
    return fail('update_failed', 'Failed to finalize import batch.', {
      stage: 'finalize_batch',
      batchId,
    });
  }

  return ok({
    batchId,
    responseCount: responsesResult.data.insertedCount,
    insightCount: insightsResult.data.insertedCount,
    moduleLinkCount: linksResult.data.linkedCount,
    overlayCount: overlaysResult.data.insertedCount,
    promotionEventCount: eventsResult.data.insertedCount,
  });
}

function validateNormalizedResponses(
  responses: readonly NormalizedFormResponse[],
): RepositoryResult<InsertNormalizedResponsesResult> {
  for (const response of responses) {
    if (!response.responseId || !response.rawPayloadHash) {
      return fail('validation_failed', 'Normalized response is missing required identifiers.');
    }

    const payloadJson = JSON.stringify(response.deidentifiedAnswers);
    if (FORBIDDEN_PAYLOAD_KEYS.test(payloadJson)) {
      return fail(
        'validation_failed',
        'De-identified payload contains forbidden raw or direct identifier fields.',
      );
    }
  }

  return ok({ batchId: '', insertedCount: 0 });
}

function validateFormInsights(insights: readonly FormInsight[]): RepositoryResult<InsertFormInsightsResult> {
  for (const insight of insights) {
    if (insight.medicalTruth !== false) {
      return fail('validation_failed', 'Form insights must have medicalTruth set to false.');
    }

    const evidenceJson = JSON.stringify(insight.evidence);
    if (FORBIDDEN_PAYLOAD_KEYS.test(evidenceJson) || FORBIDDEN_PAYLOAD_KEYS.test(insight.summary)) {
      return fail('validation_failed', 'Insight payload contains forbidden raw or identifier content.');
    }
  }

  return ok({ batchId: '', insertedCount: 0, insightKeyToId: {} });
}

function toResponseInsertRow(batchId: string, response: NormalizedFormResponse) {
  return {
    batch_id: batchId,
    external_response_id: response.responseId,
    source_role: response.sourceRole,
    consent_granted: response.consentGranted,
    coarse_region: response.coarseRegion,
    deidentified_payload: { ...response.deidentifiedAnswers },
    raw_payload_hash: response.rawPayloadHash,
    created_at: response.createdAt,
  };
}

function toInsightInsertRow(
  batchId: string,
  insight: FormInsight,
  promotionRecord?: ReturnType<typeof buildInsightPromotionRecord>,
) {
  return {
    batch_id: batchId,
    insight_key: insight.insightId,
    insight_type: insight.insightType,
    summary: insight.summary,
    evidence: insight.evidence,
    confidence: insight.confidence,
    medical_truth: false as const,
    approved_for: insight.approvedFor,
    status: insight.status,
    product_use: insight.productUse,
    risk_class: promotionRecord?.riskClass ?? null,
    auto_eligible: promotionRecord?.autoEligible ?? false,
    auto_promotion_status: promotionRecord?.autoPromotionStatus ?? 'pending',
    promotion_score: promotionRecord?.promotionScore ?? 0,
    promotion_reason: promotionRecord?.promotionReason ?? null,
    blocked_reason: promotionRecord?.blockedReason ?? null,
    applied_at: promotionRecord?.appliedAt ?? null,
    retired_at: promotionRecord?.retiredAt ?? null,
    promotion_version: promotionRecord?.promotionVersion ?? 'phase3_v1',
  };
}

function buildModuleLinkRows(
  mappings: readonly MappedFormInsightModules[],
  insightKeyToId: Readonly<Record<string, string>>,
) {
  const rows: Array<{
    insight_id: string;
    module_id: string;
    influence_types: ModuleInfluenceType[];
  }> = [];

  for (const mapping of mappings) {
    const insightId = insightKeyToId[mapping.insightId];
    if (!insightId) continue;

    for (const link of mapping.linkedModules) {
      rows.push({
        insight_id: insightId,
        module_id: link.moduleId,
        influence_types: [...link.influenceTypes],
      });
    }
  }

  return rows;
}

export type InsertProductContextOverlaysInput = {
  batchId: string;
  overlays: readonly ProductContextOverlay[];
  insightKeyToId: Readonly<Record<string, string>>;
};

export type InsertProductContextOverlaysResult = {
  insertedCount: number;
  overlayIdByKey: Record<string, string>;
};

export type InsertFormInsightPromotionEventsInput = {
  promotionDecisions: readonly InsightPromotionDecision[];
  overlays?: readonly ProductContextOverlay[];
  insightKeyToId: Readonly<Record<string, string>>;
  overlayIdByKey: Readonly<Record<string, string>>;
};

export type InsertFormInsightPromotionEventsResult = {
  insertedCount: number;
};

export async function insertProductContextOverlays(
  client: SupabaseClient,
  input: InsertProductContextOverlaysInput,
): Promise<RepositoryResult<InsertProductContextOverlaysResult>> {
  if (input.overlays.length === 0) {
    return ok({ insertedCount: 0, overlayIdByKey: {} });
  }

  const overlayIdByKey: Record<string, string> = {};
  let insertedCount = 0;

  for (const chunk of chunkArray([...input.overlays], INSERT_CHUNK_SIZE)) {
    const rows = chunk
      .map((overlay) => {
        const dbInsightId = input.insightKeyToId[overlay.sourceInsightId];
        if (!dbInsightId) return null;
        const row = toProductContextOverlayInsertRow(overlay, dbInsightId);
        overlayIdByKey[overlay.overlayKey] = row.id;
        return row;
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    if (rows.length === 0) continue;

    const { error } = await client.from('product_context_overlays').insert(rows);

    if (error) {
      return fail('insert_failed', error.message ?? 'Failed to insert product context overlays.', {
        batchId: input.batchId,
        stage: 'insert_product_context_overlays',
      });
    }

    insertedCount += rows.length;
  }

  return ok({ insertedCount, overlayIdByKey });
}

export async function insertFormInsightPromotionEvents(
  client: SupabaseClient,
  input: InsertFormInsightPromotionEventsInput,
): Promise<RepositoryResult<InsertFormInsightPromotionEventsResult>> {
  const rows = buildPromotionEventRows(input);
  if (rows.length === 0) {
    return ok({ insertedCount: 0 });
  }

  let insertedCount = 0;

  for (const chunk of chunkArray(rows, INSERT_CHUNK_SIZE)) {
    const { error } = await client.from('form_insight_promotion_events').insert(chunk);
    if (error) {
      return fail('insert_failed', error.message ?? 'Failed to insert promotion events.', {
        stage: 'insert_form_insight_promotion_events',
      });
    }
    insertedCount += chunk.length;
  }

  return ok({ insertedCount });
}

function toProductContextOverlayInsertRow(overlay: ProductContextOverlay, dbInsightId: string) {
  const status = overlay.lifecycle;
  const validationHash = createHash('sha256').update(JSON.stringify(overlay.payload)).digest('hex');
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    insight_id: dbInsightId,
    overlay_type: overlay.overlayType,
    module_id: overlay.moduleId ?? null,
    payload: overlay.payload,
    status,
    source: 'form_import',
    validation_hash: validationHash,
    safety_result: {
      valid: overlay.validationReasons.length === 0,
      reasons: overlay.validationReasons,
    },
    created_at: overlay.createdAt,
    activated_at: status === 'active' ? now : null,
    retired_at: status === 'retired' ? now : null,
  };
}

function buildPromotionEventRows(input: InsertFormInsightPromotionEventsInput) {
  const rows: Array<{
    insight_id: string;
    overlay_id: string | null;
    event_type: string;
    actor: string;
    details: Record<string, unknown>;
  }> = [];

  for (const decision of input.promotionDecisions) {
    const insightId = input.insightKeyToId[decision.insightId];
    if (!insightId) continue;

    rows.push({
      insight_id: insightId,
      overlay_id: null,
      event_type: 'derived',
      actor: 'policy_engine',
      details: {
        policy: decision.policy,
        outcome: decision.outcome,
        insightType: decision.insightType,
      },
    });

    const eventType = resolvePromotionEventType(decision);
    if (eventType) {
      rows.push({
        insight_id: insightId,
        overlay_id: null,
        event_type: eventType,
        actor: 'policy_engine',
        details: {
          policy: decision.policy,
          outcome: decision.outcome,
          validationReasons: decision.validationReasons,
        },
      });
    }
  }

  for (const overlay of input.overlays ?? []) {
    const insightId = input.insightKeyToId[overlay.sourceInsightId];
    const overlayId = input.overlayIdByKey[overlay.overlayKey];
    if (!insightId || !overlayId) continue;

    const eventType =
      overlay.lifecycle === 'active'
        ? 'activated'
        : overlay.lifecycle === 'shadow'
          ? 'shadowed'
          : overlay.lifecycle === 'retired'
            ? 'retired'
            : 'blocked';

    rows.push({
      insight_id: insightId,
      overlay_id: overlayId,
      event_type: eventType,
      actor: 'policy_engine',
      details: {
        overlayKey: overlay.overlayKey,
        overlayType: overlay.overlayType,
        validationReasons: overlay.validationReasons,
      },
    });
  }

  return rows;
}

function resolvePromotionEventType(decision: InsightPromotionDecision): string | null {
  if (decision.quarantined) return 'quarantined';
  if (decision.outcome === 'blocked') return 'validation_failed';
  if (decision.outcome === 'shadow') return 'shadowed';
  if (decision.outcome === 'live') return 'promoted';
  return null;
}

async function resolveInsightKeyMap(
  client: SupabaseClient,
  batchId: string,
): Promise<RepositoryResult<Record<string, string>>> {
  const { data, error } = await client
    .from('form_insights')
    .select('id, insight_key')
    .eq('batch_id', batchId);

  if (error) {
    return fail('query_failed', 'Failed to resolve insight keys for batch.', { batchId });
  }

  const map: Record<string, string> = {};
  for (const row of data ?? []) {
    map[row.insight_key] = row.id;
  }

  return ok(map);
}

async function markBatchFailed(
  client: SupabaseClient,
  batchId: string,
  message: string,
  stage: string,
): Promise<void> {
  await client
    .from('form_import_batches')
    .update({
      import_status: 'failed',
      error_message: `${stage}: ${message}`,
    })
    .eq('id', batchId);
}

async function updateBatchCounts(
  client: SupabaseClient,
  batchId: string,
  counts: { responseCount?: number; insightCount?: number },
): Promise<void> {
  const patch: Record<string, number> = {};
  if (counts.responseCount !== undefined) patch.response_count = counts.responseCount;
  if (counts.insightCount !== undefined) patch.insight_count = counts.insightCount;

  if (Object.keys(patch).length === 0) return;

  await client.from('form_import_batches').update(patch).eq('id', batchId);
}

function mapBatchRow(row: Record<string, unknown>): ImportBatchRecord {
  return {
    id: String(row.id),
    sourceFilename: row.source_filename ? String(row.source_filename) : null,
    sourceRole: row.source_role as FormSourceRole,
    importStatus: row.import_status as ImportBatchRecord['importStatus'],
    rowCount: Number(row.row_count ?? 0),
    responseCount: Number(row.response_count ?? 0),
    insightCount: Number(row.insight_count ?? 0),
    errorMessage: row.error_message ? String(row.error_message) : null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapInsightRow(row: FormInsightRow, linkedModules: FormInsightLinkedModule[]): FormInsight {
  return {
    insightId: row.insight_key,
    sourceBatchId: row.batch_id,
    insightType: row.insight_type,
    summary: row.summary,
    evidence: row.evidence,
    confidence: row.confidence,
    medicalTruth: false,
    approvedFor: row.approved_for,
    linkedModules,
    productUse: row.product_use,
    status: row.status,
  };
}

function chunkArray<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function ok<T>(data: T): RepositoryResult<T> {
  return { ok: true, data };
}

function fail<T>(
  code: FormInsightRepositoryErrorCode,
  message: string,
  details: Partial<FormInsightRepositoryError> = {},
): RepositoryResult<T> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...details,
    },
  };
}
