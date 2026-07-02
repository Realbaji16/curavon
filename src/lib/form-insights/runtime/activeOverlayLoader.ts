import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HealthModuleId } from '../../health-intelligence/modules/moduleIds';
import { isFormImportPersistenceConfigured } from '../import/formImportExecution';
import type { DeriveOverlaysResult } from '../promotion/productContextOverlayService';
import {
  isProductContextOverlayLifecycle,
  isProductContextOverlayType,
  validateOverlayPayload,
  type ProductContextOverlay,
  type ProductContextOverlayLifecycle,
  type ProductContextOverlayPayload,
} from '../promotion/productContextOverlayTypes';

export const DEFAULT_LOCAL_OVERLAY_FILE = path.join(
  process.cwd(),
  'data/form-imports/normalized/latest-product-context-overlays.json',
);

export type ActiveOverlayLoadWarning = {
  overlayKey: string;
  reason: string;
};

export type LoadActiveOverlaysResult = {
  overlays: ProductContextOverlay[];
  source: 'supabase' | 'local_file' | 'none';
  warnings: ActiveOverlayLoadWarning[];
};

export type LoadActiveOverlaysOptions = {
  supabaseClient?: SupabaseClient | null;
  localOverlayFilePath?: string;
};

type LocalOverlayFile = {
  overlays?: Partial<DeriveOverlaysResult> & {
    active?: ProductContextOverlay[];
    overlays?: ProductContextOverlay[];
  };
};

type SupabaseOverlayRow = {
  id: string;
  insight_id: string;
  overlay_type: string;
  module_id: string | null;
  payload: ProductContextOverlayPayload;
  status: string;
  source: string;
  validation_hash: string | null;
  safety_result: { valid?: boolean; reasons?: string[] } | null;
  created_at: string;
  activated_at: string | null;
  retired_at: string | null;
};

export function isSupabaseOverlayLoaderConfigured(): boolean {
  return isFormImportPersistenceConfigured();
}

export async function loadActiveOverlays(
  options: LoadActiveOverlaysOptions = {},
): Promise<LoadActiveOverlaysResult> {
  if (options.supabaseClient) {
    const fromDb = await loadActiveOverlaysFromSupabase(options.supabaseClient);
    if (fromDb.overlays.length > 0) {
      return fromDb;
    }
  }

  const local = loadActiveOverlaysFromLocalFile(options.localOverlayFilePath);
  if (local.overlays.length > 0) {
    return local;
  }

  return { overlays: [], source: 'none', warnings: [] };
}

export async function loadActiveOverlaysFromSupabase(
  client: SupabaseClient,
): Promise<LoadActiveOverlaysResult> {
  const warnings: ActiveOverlayLoadWarning[] = [];

  const { data, error } = await client
    .from('product_context_overlays')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(500);

  if (error) {
    logOverlayWarning('Failed to load active overlays from Supabase.', { message: error.message });
    return { overlays: [], source: 'supabase', warnings };
  }

  const overlays: ProductContextOverlay[] = [];

  for (const row of (data ?? []) as SupabaseOverlayRow[]) {
    const mapped = mapSupabaseRowToOverlay(row);
    if (!mapped) {
      warnings.push({ overlayKey: row.id, reason: 'invalid_overlay_row' });
      continue;
    }

    const validated = validateRuntimeOverlay(mapped);
    if (!validated.overlay) {
      warnings.push({
        overlayKey: mapped.overlayKey,
        reason: validated.reason ?? 'validation_failed',
      });
      continue;
    }

    overlays.push(validated.overlay);
  }

  return { overlays, source: 'supabase', warnings };
}

export function loadActiveOverlaysFromLocalFile(
  filePath: string = DEFAULT_LOCAL_OVERLAY_FILE,
): LoadActiveOverlaysResult {
  const warnings: ActiveOverlayLoadWarning[] = [];

  if (typeof window !== 'undefined' || !existsSync(filePath)) {
    return { overlays: [], source: 'local_file', warnings };
  }

  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as LocalOverlayFile;
    const candidates = [
      ...(parsed.overlays?.active ?? []),
      ...((parsed.overlays?.overlays ?? []).filter((overlay) => overlay.lifecycle === 'active')),
    ];

    const overlays: ProductContextOverlay[] = [];
    const seen = new Set<string>();

    for (const overlay of candidates) {
      if (!overlay || seen.has(overlay.overlayKey)) continue;
      seen.add(overlay.overlayKey);

      if (overlay.lifecycle !== 'active') continue;

      const validated = validateRuntimeOverlay(overlay);
      if (!validated.overlay) {
        warnings.push({
          overlayKey: overlay.overlayKey,
          reason: validated.reason ?? 'validation_failed',
        });
        continue;
      }

      overlays.push(validated.overlay);
    }

    return { overlays, source: 'local_file', warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logOverlayWarning('Failed to read local overlay file.', { filePath, message });
    return { overlays: [], source: 'local_file', warnings };
  }
}

export function mapSupabaseRowToOverlay(row: SupabaseOverlayRow): ProductContextOverlay | null {
  if (!isProductContextOverlayType(row.overlay_type)) return null;
  if (!isActiveOverlayStatus(row.status)) return null;

  const lifecycle = mapOverlayStatusToLifecycle(row.status);
  if (!lifecycle) return null;

  const overlayKey = `${row.insight_id}:${row.overlay_type}:${row.module_id ?? 'global'}`;

  return {
    overlayId: row.id,
    overlayKey,
    sourceInsightId: row.insight_id,
    sourceBatchId: '',
    overlayType: row.overlay_type,
    lifecycle,
    payload: row.payload,
    moduleId: (row.module_id as HealthModuleId | null) ?? undefined,
    validationReasons: row.safety_result?.reasons ?? [],
    createdAt: row.created_at,
    updatedAt: row.activated_at ?? row.created_at,
  };
}

export function validateRuntimeOverlay(overlay: ProductContextOverlay): {
  overlay: ProductContextOverlay | null;
  reason?: string;
} {
  if (overlay.lifecycle !== 'active') {
    return { overlay: null, reason: 'not_active' };
  }

  const validation = validateOverlayPayload(overlay.payload);
  if (!validation.valid) {
    return { overlay: null, reason: validation.reasons.join('; ') || 'payload_invalid' };
  }

  return { overlay };
}

function isActiveOverlayStatus(status: string): boolean {
  return status === 'active';
}

function mapOverlayStatusToLifecycle(status: string): ProductContextOverlayLifecycle | null {
  if (!isProductContextOverlayLifecycle(status)) return null;
  return status;
}

export function logOverlayWarning(message: string, meta?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === 'test') return;
  if (meta) {
    console.warn(`[product-context] ${message}`, meta);
    return;
  }
  console.warn(`[product-context] ${message}`);
}
