import type { SupabaseClient } from '@supabase/supabase-js';
import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';
import type { FormInsight } from '../types';
import {
  deriveOverlaysFromInsights,
  retireOverlay,
  type DeriveOverlaysResult,
} from './productContextOverlayService';
import {
  isProductContextOverlayLifecycle,
  isProductContextOverlayType,
  type ProductContextOverlay,
  type ProductContextOverlayLifecycle,
  type ProductContextOverlayPayload,
  type ProductContextOverlayType,
} from './productContextOverlayTypes';

const INSERT_CHUNK_SIZE = 100;

export type ProductContextOverlayRepositoryErrorCode =
  | 'not_configured'
  | 'validation_failed'
  | 'insert_failed'
  | 'update_failed'
  | 'query_failed'
  | 'not_found';

export type ProductContextOverlayRepositoryError = {
  code: ProductContextOverlayRepositoryErrorCode;
  message: string;
  overlayId?: string;
  overlayKey?: string;
};

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ProductContextOverlayRepositoryError };

export type ListProductContextOverlaysFilter = {
  sourceBatchId?: string;
  sourceInsightId?: string;
  lifecycle?: ProductContextOverlayLifecycle;
  overlayType?: ProductContextOverlayType;
  moduleId?: HealthModuleId;
  limit?: number;
  offset?: number;
};

export type UpsertOverlaysFromInsightsInput = {
  insights: readonly FormInsight[];
};

export type UpsertOverlaysFromInsightsResult = DeriveOverlaysResult & {
  upsertedCount: number;
};

type OverlayRow = {
  id: string;
  overlay_key: string;
  source_insight_id: string;
  source_batch_id: string | null;
  overlay_type: string;
  lifecycle: string;
  payload: ProductContextOverlayPayload;
  module_id: string | null;
  validation_reasons: string[];
  created_at: string;
  updated_at: string;
};

function ok<T>(data: T): RepositoryResult<T> {
  return { ok: true, data };
}

function fail(
  code: ProductContextOverlayRepositoryErrorCode,
  message: string,
  extra: Partial<ProductContextOverlayRepositoryError> = {},
): RepositoryResult<never> {
  return { ok: false, error: { code, message, ...extra } };
}

function mapOverlayRow(row: OverlayRow): ProductContextOverlay {
  if (!isProductContextOverlayType(row.overlay_type)) {
    throw new Error(`Invalid overlay_type in storage: ${row.overlay_type}`);
  }
  if (!isProductContextOverlayLifecycle(row.lifecycle)) {
    throw new Error(`Invalid lifecycle in storage: ${row.lifecycle}`);
  }

  return {
    overlayId: row.id,
    overlayKey: row.overlay_key,
    sourceInsightId: row.source_insight_id,
    sourceBatchId: row.source_batch_id ?? '',
    overlayType: row.overlay_type,
    lifecycle: row.lifecycle,
    payload: row.payload,
    moduleId: (row.module_id as HealthModuleId | null) ?? undefined,
    validationReasons: row.validation_reasons ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapOverlayToRow(overlay: ProductContextOverlay): Omit<OverlayRow, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
} {
  return {
    id: overlay.overlayId,
    overlay_key: overlay.overlayKey,
    source_insight_id: overlay.sourceInsightId,
    source_batch_id: overlay.sourceBatchId || null,
    overlay_type: overlay.overlayType,
    lifecycle: overlay.lifecycle,
    payload: overlay.payload,
    module_id: overlay.moduleId ?? null,
    validation_reasons: [...overlay.validationReasons],
    created_at: overlay.createdAt,
    updated_at: overlay.updatedAt,
  };
}

export function createProductContextOverlayRepository(client: SupabaseClient) {
  return {
    deriveFromInsights: (insights: readonly FormInsight[]) => deriveOverlaysFromInsights(insights),

    async upsertOverlaysFromInsights(
      input: UpsertOverlaysFromInsightsInput,
    ): Promise<RepositoryResult<UpsertOverlaysFromInsightsResult>> {
      const derived = deriveOverlaysFromInsights(input.insights);
      const upsertResult = await upsertOverlays(client, derived.overlays);
      if (!upsertResult.ok) {
        return upsertResult;
      }

      return ok({
        ...derived,
        upsertedCount: upsertResult.data.upsertedCount,
      });
    },

    listOverlays: (filter: ListProductContextOverlaysFilter = {}) => listOverlays(client, filter),

    retireOverlayByKey: (overlayKey: string) => retireOverlayByKey(client, overlayKey),
  };
}

export type ProductContextOverlayRepository = ReturnType<typeof createProductContextOverlayRepository>;

export async function upsertOverlays(
  client: SupabaseClient,
  overlays: readonly ProductContextOverlay[],
): Promise<RepositoryResult<{ upsertedCount: number }>> {
  if (overlays.length === 0) {
    return ok({ upsertedCount: 0 });
  }

  let upsertedCount = 0;

  for (let index = 0; index < overlays.length; index += INSERT_CHUNK_SIZE) {
    const chunk = overlays.slice(index, index + INSERT_CHUNK_SIZE).map((overlay) => mapOverlayToRow(overlay));
    const { error } = await client.from('product_context_overlays').upsert(chunk, {
      onConflict: 'overlay_key',
    });

    if (error) {
      return fail('insert_failed', error.message ?? 'Failed to upsert product context overlays.');
    }

    upsertedCount += chunk.length;
  }

  return ok({ upsertedCount });
}

export async function listOverlays(
  client: SupabaseClient,
  filter: ListProductContextOverlaysFilter = {},
): Promise<RepositoryResult<ProductContextOverlay[]>> {
  let query = client.from('product_context_overlays').select('*');

  if (filter.sourceBatchId) {
    query = query.eq('source_batch_id', filter.sourceBatchId);
  }
  if (filter.sourceInsightId) {
    query = query.eq('source_insight_id', filter.sourceInsightId);
  }
  if (filter.lifecycle) {
    query = query.eq('lifecycle', filter.lifecycle);
  }
  if (filter.overlayType) {
    query = query.eq('overlay_type', filter.overlayType);
  }
  if (filter.moduleId) {
    query = query.eq('module_id', filter.moduleId);
  }

  const limit = filter.limit ?? 200;
  const offset = filter.offset ?? 0;
  const { data, error } = await query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

  if (error) {
    return fail('query_failed', error.message ?? 'Failed to list product context overlays.');
  }

  return ok((data as OverlayRow[]).map(mapOverlayRow));
}

export async function retireOverlayByKey(
  client: SupabaseClient,
  overlayKey: string,
): Promise<RepositoryResult<ProductContextOverlay>> {
  const keyed = await client
    .from('product_context_overlays')
    .select('*')
    .eq('overlay_key', overlayKey)
    .maybeSingle();

  if (keyed.error) {
    return fail('query_failed', keyed.error.message ?? 'Failed to load overlay.');
  }
  if (!keyed.data) {
    return fail('not_found', 'Overlay not found.', { overlayKey });
  }

  const retired = retireOverlay(mapOverlayRow(keyed.data as OverlayRow));
  const { error } = await client
    .from('product_context_overlays')
    .update({
      lifecycle: retired.lifecycle,
      updated_at: retired.updatedAt,
      retired_at: retired.retiredAt ?? retired.updatedAt,
    })
    .eq('overlay_key', overlayKey);

  if (error) {
    return fail('update_failed', error.message ?? 'Failed to retire overlay.', { overlayKey });
  }

  return ok(retired);
}
