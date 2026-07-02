/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDraftFormInsight } from '../lib/form-insights/types';
import {
  createFormInsightRepository,
  persistFormImportResult,
  type FormInsightRepository,
} from '../lib/form-insights/storage/formInsightRepository';
import type { NormalizedFormResponse } from '../lib/form-insights/types';

type TableState = {
  form_import_batches: Record<string, unknown>[];
  form_responses: Record<string, unknown>[];
  form_insights: Record<string, unknown>[];
  form_insight_module_links: Record<string, unknown>[];
  form_insight_review_events: Record<string, unknown>[];
  product_context_overlays: Record<string, unknown>[];
  form_insight_promotion_events: Record<string, unknown>[];
};

function createInMemorySupabase(initial: Partial<TableState> = {}) {
  const state: TableState = {
    form_import_batches: [],
    form_responses: [],
    form_insights: [],
    form_insight_module_links: [],
    form_insight_review_events: [],
    product_context_overlays: [],
    form_insight_promotion_events: [],
    ...initial,
  };

  const from = vi.fn((table: keyof TableState) => {
    if (!(table in state)) {
      throw new Error(`Unexpected table ${table}`);
    }
    const api = {
      insert: vi.fn((rows: Record<string, unknown> | Record<string, unknown>[]) => {
        const list = Array.isArray(rows) ? rows : [rows];
        const inserted = list.map((row) => ({
          id: row.id ?? crypto.randomUUID(),
          created_at: row.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...row,
        }));
        state[table].push(...inserted);

        const insertResult = { data: inserted, error: null as null };
        const select = vi.fn(() => {
          const selected = inserted.map((row) => ({
            id: row.id,
            insight_key: row.insight_key,
            insight_id: row.insight_id,
          }));

          return {
            single: vi.fn(async () => ({
              data: inserted.length === 1 ? inserted[0] : null,
              error: null,
            })),
            maybeSingle: vi.fn(async () => ({
              data: inserted[0] ?? null,
              error: null,
            })),
            then(
              onFulfilled?: (value: typeof insertResult) => unknown,
              onRejected?: (reason: unknown) => unknown,
            ) {
              return Promise.resolve({ data: selected, error: null }).then(onFulfilled, onRejected);
            },
          };
        });

        return {
          select,
          then(
            onFulfilled?: (value: { error: null }) => unknown,
            onRejected?: (reason: unknown) => unknown,
          ) {
            return Promise.resolve({ error: null }).then(onFulfilled, onRejected);
          },
        };
      }),
      upsert: vi.fn(async (rows: Record<string, unknown> | Record<string, unknown>[]) => {
        const list = Array.isArray(rows) ? rows : [rows];
        for (const row of list) {
          const key =
            table === 'form_insight_module_links'
              ? `${row.insight_id}:${row.module_id}`
              : String(row.id ?? crypto.randomUUID());
          const existingIndex = state[table].findIndex((item) => {
            if (table === 'form_insight_module_links') {
              return (
                item.insight_id === row.insight_id && item.module_id === row.module_id
              );
            }
            return String(item.id) === key;
          });
          const record = {
            id: row.id ?? crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...row,
          };
          if (existingIndex >= 0) {
            state[table][existingIndex] = record;
          } else {
            state[table].push(record);
          }
        }
        return { error: null };
      }),
      update: vi.fn((patch: Record<string, unknown>) => ({
        eq: vi.fn(async (column: string, value: unknown) => {
          for (const row of state[table]) {
            if (row[column] === value) {
              Object.assign(row, patch, { updated_at: new Date().toISOString() });
            }
          }
          return { error: null };
        }),
      })),
      select: vi.fn((columns?: string) => {
        void columns;
        const builder = {
          eq: vi.fn(function eq(column: string, value: unknown) {
            const filtered = state[table].filter((row) => row[column] === value);
            return {
              ...builder,
              eq,
              maybeSingle: vi.fn(async () => ({
                data: filtered[0] ?? null,
                error: null,
              })),
              single: vi.fn(async () => ({
                data: filtered[0] ?? null,
                error: null,
              })),
              order: vi.fn(() => ({
                range: vi.fn(async () => ({ data: filtered, error: null })),
              })),
            };
          }),
          order: vi.fn(() => ({
            range: vi.fn(async () => ({ data: state[table], error: null })),
          })),
        };
        return builder;
      }),
    };

    return api;
  });

  return {
    client: { from } as unknown as Parameters<typeof createFormInsightRepository>[0],
    state,
  };
}

const SAFE_RESPONSE: NormalizedFormResponse = {
  responseId: 'resp_safe_1',
  sourceRole: 'patient',
  consentGranted: true,
  coarseRegion: 'Lagos',
  deidentifiedAnswers: {
    concern: 'fever and malaria concern',
  },
  rawPayloadHash: 'hash_safe_1',
  createdAt: '2026-03-21T10:00:00.000Z',
};

describe('formInsightRepository', () => {
  let repository: FormInsightRepository;
  let state: TableState;

  beforeEach(() => {
    const memory = createInMemorySupabase();
    repository = createFormInsightRepository(memory.client);
    state = memory.state;
  });

  it('creates import batch and inserts de-identified responses only', async () => {
    const batch = await repository.createImportBatch({
      batchId: 'batch-uuid-1',
      sourceFilename: 'Patient Pilot.csv',
      sourceRole: 'patient',
      rowCount: 1,
    });

    expect(batch.ok).toBe(true);
    if (!batch.ok) return;

    const inserted = await repository.insertNormalizedResponses({
      batchId: batch.data.id,
      responses: [SAFE_RESPONSE],
    });

    expect(inserted.ok).toBe(true);
    expect(state.form_responses).toHaveLength(1);
    expect(state.form_responses[0]).toMatchObject({
      external_response_id: 'resp_safe_1',
      deidentified_payload: { concern: 'fever and malaria concern' },
    });
    expect(JSON.stringify(state.form_responses[0])).not.toContain('ada@example.com');
  });

  it('rejects payloads with forbidden identifier fields', async () => {
    const batch = await repository.createImportBatch({
      batchId: 'batch-uuid-2',
      sourceRole: 'patient',
    });
    expect(batch.ok).toBe(true);
    if (!batch.ok) return;

    const result = await repository.insertNormalizedResponses({
      batchId: batch.data.id,
      responses: [
        {
          ...SAFE_RESPONSE,
          responseId: 'resp_bad',
          deidentifiedAnswers: { email: 'hidden-but-forbidden-key' },
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('validation_failed');
    expect(result.error.message).not.toContain('hidden-but-forbidden-key');
    expect(state.form_import_batches[0]?.import_status).toBe('failed');
  });

  it('returns structured partial import errors without raw row data', async () => {
    const failingClient = {
      from: vi.fn((table: string) => {
        if (table === 'form_import_batches') {
          return {
            insert: vi.fn(() => ({
              select: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: 'batch-partial',
                    source_filename: 'x.csv',
                    source_role: 'patient',
                    import_status: 'processing',
                    row_count: 1,
                    response_count: 0,
                    insight_count: 0,
                    error_message: null,
                    metadata: {},
                    created_at: '2026-01-01T00:00:00.000Z',
                    updated_at: '2026-01-01T00:00:00.000Z',
                  },
                  error: null,
                })),
              })),
            })),
            update: vi.fn(() => ({
              eq: vi.fn(async () => ({ error: null })),
            })),
          };
        }

        if (table === 'form_responses') {
          return {
            insert: vi.fn(async () => ({
              error: { message: 'duplicate key value violates unique constraint' },
            })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    };

    const repo = createFormInsightRepository(failingClient as never);
    const batch = await repo.createImportBatch({ batchId: 'batch-partial', sourceRole: 'patient' });
    expect(batch.ok).toBe(true);
    if (!batch.ok) return;

    const result = await repo.insertNormalizedResponses({
      batchId: 'batch-partial',
      responses: [SAFE_RESPONSE],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('partial_import_failed');
    expect(result.error.stage).toBe('insert_normalized_responses');
    expect(result.error.insertedCount).toBe(0);
    expect(JSON.stringify(result.error)).not.toContain('fever and malaria');
  });

  it('persists insights and module links for a full import result', async () => {
    const insight = createDraftFormInsight({
      insightId: 'insight_fever_1',
      sourceBatchId: 'ignored-here',
      insightType: 'common_concern',
      summary: 'Fever concern mentioned',
      evidence: {
        supportCount: 2,
        sourceRoles: ['patient'],
        rowRefs: ['resp_safe_1'],
      },
      linkedModules: [{ moduleId: 'fever_malaria_ng_v1', influenceTypes: ['trigger'] }],
    });

    const memory = createInMemorySupabase();
    const persist = await persistFormImportResult(memory.client, {
        batchId: 'batch-full-1',
        result: {
          batchId: 'batch_key_hash',
          sourceName: 'pilot',
          sourceRole: 'patient',
          filename: 'Patient.csv',
          importedAt: '2026-03-21T12:00:00.000Z',
          headers: ['Timestamp', 'Concern'],
          rowCount: 1,
          normalizedResponses: [SAFE_RESPONSE],
          insights: [{ ...insight, linkedModules: insight.linkedModules ?? [] }],
          moduleMappings: [
            {
              insightId: 'insight_fever_1',
              linkedModules: [{ moduleId: 'fever_malaria_ng_v1', influenceTypes: ['trigger'] }],
              influenceTypes: ['trigger'],
            },
          ],
        },
      },
    );

    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    expect(persist.data.responseCount).toBe(1);
    expect(persist.data.insightCount).toBe(1);
    expect(persist.data.moduleLinkCount).toBe(1);
    expect(persist.data.overlayCount).toBeGreaterThanOrEqual(0);
    expect(persist.data.promotionEventCount).toBeGreaterThan(0);
    expect(memory.state.form_import_batches[0]?.import_status).toBe('completed');
  });
});
