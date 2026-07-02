import type { SupabaseClient } from '@supabase/supabase-js';
import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';
import { isHealthModuleId } from '../../health-intelligence/modules/moduleIds';
import type { FormImportPromotionSummary } from './autoPromotionEngine';
import {
  partitionOverlays,
  retireOverlay,
  type DeriveOverlaysResult,
} from './productContextOverlayService';
import {
  isProductContextOverlayType,
  type ProductContextOverlay,
  type ProductContextOverlayType,
} from './productContextOverlayTypes';

export type OverlayRollbackFilter = {
  overlayId?: string;
  insightId?: string;
  overlayType?: ProductContextOverlayType;
  moduleId?: HealthModuleId;
};

export type OverlayRollbackEvent = {
  insightId: string;
  overlayId: string;
  overlayKey: string;
  eventType: 'rollback';
  actor: 'cli';
  details: Record<string, unknown>;
};

export type OverlayRollbackResult = {
  retiredCount: number;
  retiredOverlays: ProductContextOverlay[];
  events: OverlayRollbackEvent[];
  skippedAlreadyRetired: number;
};

export type LocalOverlayStore = {
  batchId?: string;
  promotionSummary?: FormImportPromotionSummary;
  overlays: DeriveOverlaysResult;
};

type SupabaseOverlayRow = {
  id: string;
  insight_id: string;
  overlay_type: string;
  module_id: string | null;
  payload: ProductContextOverlay['payload'];
  status: string;
  safety_result: { reasons?: string[] } | null;
  created_at: string;
  activated_at: string | null;
  retired_at: string | null;
};

type SupabaseInsightRow = {
  id: string;
  insight_key: string;
};

export function parseOverlayRollbackArgs(argv: readonly string[]): OverlayRollbackFilter {
  const args = [...argv];
  const filter: OverlayRollbackFilter = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--insight') {
      filter.insightId = args[index + 1];
      index += 1;
      continue;
    }
    if (token === '--type') {
      const value = args[index + 1];
      if (!value || !isProductContextOverlayType(value)) {
        throw new Error(`Invalid overlay type: ${value ?? '(missing)'}`);
      }
      filter.overlayType = value;
      index += 1;
      continue;
    }
    if (token === '--module') {
      const value = args[index + 1];
      if (!value || !isHealthModuleId(value)) {
        throw new Error(`Invalid module id: ${value ?? '(missing)'}`);
      }
      filter.moduleId = value;
      index += 1;
      continue;
    }
    if (token.startsWith('--')) {
      throw new Error(`Unknown option: ${token}`);
    }
    if (!filter.overlayId) {
      filter.overlayId = token;
    }
  }

  if (!filter.overlayId && !filter.insightId && !filter.overlayType && !filter.moduleId) {
    throw new Error(
      'Specify a rollback target: <overlay_id> | --insight <id> | --type <type> | --module <module_id>',
    );
  }

  return filter;
}

export function matchesRollbackFilter(
  overlay: ProductContextOverlay,
  filter: OverlayRollbackFilter,
): boolean {
  if (filter.overlayId) {
    const target = filter.overlayId;
    const matchesId =
      overlay.overlayId === target ||
      overlay.overlayKey === target ||
      overlay.overlayKey.endsWith(`:${target}`);
    if (!matchesId) return false;
  }

  if (filter.insightId && overlay.sourceInsightId !== filter.insightId) {
    return false;
  }

  if (filter.overlayType && overlay.overlayType !== filter.overlayType) {
    return false;
  }

  if (filter.moduleId && overlay.moduleId !== filter.moduleId) {
    return false;
  }

  return true;
}

export function selectOverlaysForRollback(
  overlays: readonly ProductContextOverlay[],
  filter: OverlayRollbackFilter,
): { toRetire: ProductContextOverlay[]; skippedAlreadyRetired: number } {
  const toRetire: ProductContextOverlay[] = [];
  let skippedAlreadyRetired = 0;

  for (const overlay of overlays) {
    if (!matchesRollbackFilter(overlay, filter)) continue;
    if (overlay.lifecycle === 'retired') {
      skippedAlreadyRetired += 1;
      continue;
    }
    toRetire.push(overlay);
  }

  return { toRetire, skippedAlreadyRetired };
}

export function rollbackOverlays(
  overlays: readonly ProductContextOverlay[],
  filter: OverlayRollbackFilter,
  retiredAt?: string,
): { overlays: ProductContextOverlay[]; result: OverlayRollbackResult } {
  const { toRetire, skippedAlreadyRetired } = selectOverlaysForRollback(overlays, filter);
  const retireKeys = new Set(toRetire.map((overlay) => overlay.overlayKey));
  const retiredOverlays = toRetire.map((overlay) => retireOverlay(overlay, retiredAt));
  const events = retiredOverlays.map((overlay) => buildRollbackEvent(overlay, filter));

  const updated = overlays.map((overlay) => {
    if (!retireKeys.has(overlay.overlayKey)) return overlay;
    return retiredOverlays.find((entry) => entry.overlayKey === overlay.overlayKey) ?? overlay;
  });

  return {
    overlays: updated,
    result: {
      retiredCount: retiredOverlays.length,
      retiredOverlays,
      events,
      skippedAlreadyRetired,
    },
  };
}

export function rollbackLocalOverlayStore(
  store: LocalOverlayStore,
  filter: OverlayRollbackFilter,
  retiredAt?: string,
): { store: LocalOverlayStore; result: OverlayRollbackResult } {
  const rolled = rollbackOverlays(store.overlays.overlays, filter, retiredAt);
  return {
    store: {
      ...store,
      overlays: partitionOverlays(rolled.overlays),
    },
    result: rolled.result,
  };
}

export function normalizeLocalOverlayStore(parsed: unknown): LocalOverlayStore {
  if (Array.isArray(parsed)) {
    const overlays = parsed as ProductContextOverlay[];
    return { overlays: partitionOverlays(overlays) };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { overlays: partitionOverlays([]) };
  }

  const record = parsed as {
    batchId?: string;
    promotionSummary?: FormImportPromotionSummary;
    overlays?: DeriveOverlaysResult | ProductContextOverlay[];
  };

  if (record.overlays && Array.isArray(record.overlays)) {
    return {
      batchId: record.batchId,
      promotionSummary: record.promotionSummary,
      overlays: partitionOverlays(record.overlays),
    };
  }

  if (record.overlays && typeof record.overlays === 'object') {
    const derived = record.overlays as DeriveOverlaysResult;
    const all = derived.overlays ?? [
      ...(derived.active ?? []),
      ...(derived.shadow ?? []),
      ...(derived.blocked ?? []),
    ];
    return {
      batchId: record.batchId,
      promotionSummary: record.promotionSummary,
      overlays: partitionOverlays(all),
    };
  }

  return {
    batchId: record.batchId,
    promotionSummary: record.promotionSummary,
    overlays: partitionOverlays([]),
  };
}

export function serializeLocalOverlayStore(store: LocalOverlayStore): string {
  return `${JSON.stringify(
    {
      batchId: store.batchId,
      promotionSummary: store.promotionSummary,
      overlays: store.overlays,
    },
    null,
    2,
  )}\n`;
}

export async function rollbackOverlaysInSupabase(
  client: SupabaseClient,
  filter: OverlayRollbackFilter,
): Promise<OverlayRollbackResult> {
  const candidates = await loadSupabaseRollbackCandidates(client, filter);
  const { toRetire, skippedAlreadyRetired } = selectOverlaysForRollback(candidates, filter);

  if (toRetire.length === 0) {
    return {
      retiredCount: 0,
      retiredOverlays: [],
      events: [],
      skippedAlreadyRetired,
    };
  }

  const retiredAt = new Date().toISOString();
  const retiredOverlays: ProductContextOverlay[] = [];
  const events: OverlayRollbackEvent[] = [];

  for (const overlay of toRetire) {
    const { error } = await client
      .from('product_context_overlays')
      .update({
        status: 'retired',
        retired_at: retiredAt,
      })
      .eq('id', overlay.overlayId);

    if (error) {
      throw new Error(`Failed to retire overlay ${overlay.overlayKey}: ${error.message}`);
    }

    const retired = retireOverlay(overlay, retiredAt);
    retiredOverlays.push(retired);
    events.push(buildRollbackEvent(retired, filter));

    await insertRollbackPromotionEvent(client, retired);
  }

  return {
    retiredCount: retiredOverlays.length,
    retiredOverlays,
    events,
    skippedAlreadyRetired,
  };
}

async function loadSupabaseRollbackCandidates(
  client: SupabaseClient,
  filter: OverlayRollbackFilter,
): Promise<ProductContextOverlay[]> {
  let query = client
    .from('product_context_overlays')
    .select('id, insight_id, overlay_type, module_id, payload, status, safety_result, created_at, activated_at, retired_at')
    .neq('status', 'retired')
    .limit(500);

  if (filter.overlayType) {
    query = query.eq('overlay_type', filter.overlayType);
  }
  if (filter.moduleId) {
    query = query.eq('module_id', filter.moduleId);
  }
  if (filter.overlayId) {
    query = query.eq('id', filter.overlayId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`Failed to load overlays for rollback: ${error.message}`);
  }

  let rows = (data ?? []) as SupabaseOverlayRow[];
  if (filter.insightId) {
    const insightIds = await resolveInsightDbIds(client, filter.insightId);
    rows = rows.filter((row) => insightIds.includes(row.insight_id));
  }

  return rows.map(mapSupabaseRowToOverlay).filter((overlay): overlay is ProductContextOverlay => overlay !== null);
}

async function resolveInsightDbIds(
  client: SupabaseClient,
  insightId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from('form_insights')
    .select('id, insight_key')
    .eq('insight_key', insightId);

  if (error) {
    throw new Error(`Failed to resolve insight id ${insightId}: ${error.message}`);
  }

  const rows = (data ?? []) as SupabaseInsightRow[];
  return rows.map((row) => row.id);
}

function mapSupabaseRowToOverlay(row: SupabaseOverlayRow): ProductContextOverlay | null {
  if (!isProductContextOverlayType(row.overlay_type)) return null;

  const overlayKey = `${row.insight_id}:${row.overlay_type}:${row.module_id ?? 'global'}`;

  return {
    overlayId: row.id,
    overlayKey,
    sourceInsightId: row.insight_id,
    sourceBatchId: '',
    overlayType: row.overlay_type,
    lifecycle: row.status as ProductContextOverlay['lifecycle'],
    payload: row.payload,
    moduleId: (row.module_id as HealthModuleId | null) ?? undefined,
    validationReasons: row.safety_result?.reasons ?? [],
    createdAt: row.created_at,
    updatedAt: row.activated_at ?? row.created_at,
    retiredAt: row.retired_at ?? undefined,
  };
}

async function insertRollbackPromotionEvent(
  client: SupabaseClient,
  overlay: ProductContextOverlay,
): Promise<void> {
  const { error } = await client.from('form_insight_promotion_events').insert({
    insight_id: overlay.sourceInsightId,
    overlay_id: overlay.overlayId,
    event_type: 'rollback',
    actor: 'cli',
    details: {
      overlayKey: overlay.overlayKey,
      overlayType: overlay.overlayType,
      moduleId: overlay.moduleId ?? null,
      retiredAt: overlay.retiredAt ?? overlay.updatedAt,
    },
  });

  if (error) {
    throw new Error(`Failed to log rollback promotion event: ${error.message}`);
  }
}

function buildRollbackEvent(
  overlay: ProductContextOverlay,
  filter: OverlayRollbackFilter,
): OverlayRollbackEvent {
  return {
    insightId: overlay.sourceInsightId,
    overlayId: overlay.overlayId,
    overlayKey: overlay.overlayKey,
    eventType: 'rollback',
    actor: 'cli',
    details: {
      overlayType: overlay.overlayType,
      moduleId: overlay.moduleId ?? null,
      retiredAt: overlay.retiredAt ?? overlay.updatedAt,
      filter,
    },
  };
}

export function summarizeRollbackForCli(result: OverlayRollbackResult): string[] {
  const lines = [
    `retired=${result.retiredCount} skippedAlreadyRetired=${result.skippedAlreadyRetired}`,
  ];

  for (const overlay of result.retiredOverlays) {
    lines.push(
      `- ${overlay.overlayKey} type=${overlay.overlayType} module=${overlay.moduleId ?? 'global'} retiredAt=${overlay.retiredAt ?? overlay.updatedAt}`,
    );
  }

  for (const event of result.events) {
    lines.push(`  event=${event.eventType} overlayId=${event.overlayId}`);
  }

  return lines;
}
