import type { SupabaseClient } from '@supabase/supabase-js';
import {
  EMPTY_FORM_INSIGHT_PRODUCT_CONTEXT,
  type FormInsightProductContext,
} from '../formInsightContextTypes';
import { buildProductContextFromActiveOverlays } from '../promotion/productContextOverlayService';
import { validateOverlayPayload } from '../promotion/productContextOverlayTypes';
import {
  loadActiveOverlays,
  logOverlayWarning,
  type ActiveOverlayLoadWarning,
  type LoadActiveOverlaysOptions,
} from './activeOverlayLoader';

export const DEFAULT_PRODUCT_CONTEXT_CACHE_TTL_MS = 60_000;

type ProductContextCacheEntry = {
  context: FormInsightProductContext;
  expiresAt: number;
  source: 'supabase' | 'local_file' | 'none' | 'seed';
  warnings: ActiveOverlayLoadWarning[];
};

let cache: ProductContextCacheEntry | null = null;
let inflightRefresh: Promise<FormInsightProductContext> | null = null;

export type GetActiveProductContextOptions = LoadActiveOverlaysOptions & {
  ttlMs?: number;
  forceRefresh?: boolean;
};

export function resetActiveProductContextCache(): void {
  cache = null;
  inflightRefresh = null;
}

/** Test helper — seed sync cache without filesystem or Supabase. */
export function seedActiveProductContextForTests(context: FormInsightProductContext): void {
  cache = {
    context: sanitizeUserFacingProductContext(context),
    expiresAt: Number.MAX_SAFE_INTEGER,
    source: 'seed',
    warnings: [],
  };
}

export function getCachedActiveProductContext(): FormInsightProductContext {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.context;
  }
  return EMPTY_FORM_INSIGHT_PRODUCT_CONTEXT;
}

export function resolveFormInsightContext(
  explicit?: FormInsightProductContext,
): FormInsightProductContext {
  if (explicit) {
    return sanitizeUserFacingProductContext(explicit);
  }
  return getCachedActiveProductContext();
}

export async function getActiveProductContext(
  options: GetActiveProductContextOptions = {},
): Promise<FormInsightProductContext> {
  const ttlMs = options.ttlMs ?? DEFAULT_PRODUCT_CONTEXT_CACHE_TTL_MS;

  if (!options.forceRefresh && cache && cache.expiresAt > Date.now()) {
    return cache.context;
  }

  if (!options.forceRefresh && inflightRefresh) {
    return inflightRefresh;
  }

  inflightRefresh = refreshActiveProductContext(options, ttlMs).finally(() => {
    inflightRefresh = null;
  });

  return inflightRefresh;
}

export async function warmActiveProductContextCache(
  options: GetActiveProductContextOptions = {},
): Promise<FormInsightProductContext> {
  return getActiveProductContext({ ...options, forceRefresh: true });
}

async function refreshActiveProductContext(
  options: GetActiveProductContextOptions,
  ttlMs: number,
): Promise<FormInsightProductContext> {
  const supabaseClient = await resolveSupabaseClient(options.supabaseClient);
  const loaded = await loadActiveOverlays({
    ...options,
    supabaseClient,
  });

  for (const warning of loaded.warnings) {
    logOverlayWarning('Ignored invalid active overlay.', warning);
  }

  const context = sanitizeUserFacingProductContext(
    buildProductContextFromActiveOverlays(loaded.overlays),
  );

  cache = {
    context,
    expiresAt: Date.now() + ttlMs,
    source: loaded.source,
    warnings: loaded.warnings,
  };

  return context;
}

function sanitizeUserFacingProductContext(
  context: FormInsightProductContext,
): FormInsightProductContext {
  return {
    routingTriggers: context.routingTriggers.filter((trigger) =>
      trigger.terms.every((term) => validateOverlayPayload({ moduleId: trigger.moduleId, terms: [term] }).valid),
    ),
    blockerOptions: context.blockerOptions.filter((blocker) =>
      validateOverlayPayload({
        optionId: blocker.id,
        label: blocker.label,
        moduleId: blocker.moduleId,
      }).valid,
    ),
    summaryFieldCandidates: context.summaryFieldCandidates.filter((field) =>
      validateOverlayPayload({
        fieldId: field.fieldId,
        label: field.label,
        moduleId: field.moduleId,
      }).valid,
    ),
    responseCopyLines: context.responseCopyLines.filter((entry) =>
      validateOverlayPayload({ line: entry.line, moduleId: entry.moduleId }).valid,
    ),
    careRouteCopyLines: context.careRouteCopyLines.filter((entry) =>
      validateOverlayPayload({
        routeId: entry.insightId,
        label: entry.line,
        moduleId: entry.moduleId,
      }).valid,
    ),
    safeQuestionCandidates: context.safeQuestionCandidates.filter((entry) =>
      validateOverlayPayload({
        questionId: entry.questionId,
        prompt: entry.prompt,
        moduleId: entry.moduleId,
      }).valid,
    ),
    featureHints: [],
    appliedInsightIds: context.appliedInsightIds,
  };
}

async function resolveSupabaseClient(
  explicit?: SupabaseClient | null,
): Promise<SupabaseClient | null> {
  if (explicit !== undefined) return explicit;
  if (typeof window !== 'undefined') return null;

  try {
    const { getSupabaseAdminClient } = await import('../../supabase/adminClient');
    return getSupabaseAdminClient();
  } catch {
    return null;
  }
}
