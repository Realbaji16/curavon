import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createSupabaseDataAdapter } from '../lib/data/supabaseDataAdapter';
import {
  applyNotDeleted,
  SOFT_DELETE_TABLES,
  tableSupportsSoftDelete,
} from '../lib/data/supabaseSoftDelete';
import { runWithSupabaseDataContext } from '../lib/data/supabaseDataClient';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADAPTER_PATH = path.resolve(__dirname, '../lib/data/supabaseDataAdapter.ts');
const CLIENT_PATH = path.resolve(__dirname, '../lib/data/supabaseDataClient.ts');

type ChainMock = {
  select: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  is: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
};

function createQueryChain(terminal: () => Promise<{ data: unknown; error: null }>): ChainMock {
  const chain = {} as ChainMock;
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.is = vi.fn(() => chain);
  chain.order = vi.fn(() => terminal());
  chain.update = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(terminal);
  chain.single = vi.fn(terminal);
  return chain;
}

function createMockSupabase(tableHandlers: Record<string, ChainMock>) {
  return {
    from: vi.fn((table: string) => {
      const handler = tableHandlers[table];
      if (!handler) {
        throw new Error(`Unexpected table: ${table}`);
      }
      return handler;
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  };
}

describe('supabase soft-delete filtering', () => {
  it('applyNotDeleted adds deleted_at filter for soft-delete tables', () => {
    const query = { is: vi.fn().mockReturnThis() };
    applyNotDeleted(query, 'health_flows');
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('applyNotDeleted skips filter when includeDeleted is true', () => {
    const query = { is: vi.fn().mockReturnThis() };
    applyNotDeleted(query, 'health_flows', { includeDeleted: true });
    expect(query.is).not.toHaveBeenCalled();
  });

  it('applyNotDeleted skips profiles table', () => {
    const query = { is: vi.fn().mockReturnThis() };
    applyNotDeleted(query, 'profiles');
    expect(query.is).not.toHaveBeenCalled();
    expect(tableSupportsSoftDelete('profiles')).toBe(false);
  });

  it('documents all app tables with deleted_at except profiles', () => {
    expect(SOFT_DELETE_TABLES.has('health_flows')).toBe(true);
    expect(SOFT_DELETE_TABLES.has('data_deletion_requests')).toBe(true);
    expect(SOFT_DELETE_TABLES.has('profiles')).toBe(false);
  });

  describe('adapter reads exclude deleted rows', () => {
    let healthFlowsChain: ChainMock;
    let flowActionsChain: ChainMock;
    let followUpsPayload: unknown[];

    beforeEach(() => {
      healthFlowsChain = createQueryChain(async () => ({
        data: [{ id: 'flow-active', user_id: 'user-1', status: 'active', stage: 'action_active', risk_level: 'low', privacy_level: 'private', module_version: '1', payload: {}, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', deleted_at: null }],
        error: null,
      }));

      flowActionsChain = createQueryChain(async () => ({
        data: [{ id: 'action-1', user_id: 'user-1', flow_id: 'flow-active', status: 'pending', stage: 'next_action', risk_level: 'low', privacy_level: 'private', module_version: '1', action_order: 0, payload: {}, created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', deleted_at: null }],
        error: null,
      }));

      followUpsPayload = [{ id: 'fup-1', actionId: 'a1', outcome: 'helped', createdAt: '2026-01-01T00:00:00.000Z' }];
    });

    it('listHealthFlows applies not-deleted filter', async () => {
      const client = createMockSupabase({ health_flows: healthFlowsChain });
      const adapter = createSupabaseDataAdapter();

      await runWithSupabaseDataContext(client as never, 'user-1', () => adapter.listHealthFlows());

      expect(healthFlowsChain.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('getHealthFlow returns null when only deleted row exists', async () => {
      const deletedOnlyChain = createQueryChain(async () => ({ data: null, error: null }));
      const client = createMockSupabase({ health_flows: deletedOnlyChain });
      const adapter = createSupabaseDataAdapter();

      const result = await runWithSupabaseDataContext(client as never, 'user-1', () =>
        adapter.getHealthFlow('flow-deleted'),
      );

      expect(deletedOnlyChain.is).toHaveBeenCalledWith('deleted_at', null);
      expect(result).toBeNull();
    });

    it('listFlowActions applies not-deleted filter', async () => {
      const client = createMockSupabase({ flow_actions: flowActionsChain });
      const adapter = createSupabaseDataAdapter();

      await runWithSupabaseDataContext(client as never, 'user-1', () => adapter.listFlowActions('flow-active'));

      expect(flowActionsChain.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('listFollowUps uses payload list helper with not-deleted filter', async () => {
      const followUpsChain = createQueryChain(async () => ({
        data: followUpsPayload.map((payload) => ({ payload })),
        error: null,
      }));
      followUpsChain.order = vi.fn(() =>
        Promise.resolve({
          data: followUpsPayload.map((payload) => ({ payload })),
          error: null,
        }),
      );
      const client = createMockSupabase({ follow_ups: followUpsChain });
      const adapter = createSupabaseDataAdapter();

      const rows = await runWithSupabaseDataContext(client as never, 'user-1', () => adapter.listFollowUps());

      expect(followUpsChain.is).toHaveBeenCalledWith('deleted_at', null);
      expect(rows).toHaveLength(1);
    });

    it('doctor summary item reads apply not-deleted filter', async () => {
      const itemsChain = createQueryChain(async () => ({
        data: [{ payload: { id: 'item-1', title: 'Visit note', included: true, createdAt: '2026-01-01T00:00:00.000Z' } }],
        error: null,
      }));
      const client = createMockSupabase({ doctor_summary_items: itemsChain });
      const adapter = createSupabaseDataAdapter();

      await runWithSupabaseDataContext(client as never, 'user-1', () => adapter.listDoctorSummaryItems());

      expect(itemsChain.is).toHaveBeenCalledWith('deleted_at', null);
    });

    it('red flag log reads apply not-deleted filter', async () => {
      const logsChain = createQueryChain(async () => ({
        data: [{ payload: { id: 'rf-1', source: 'Ask', matchedConcern: 'chest pain', userText: 'x', guidanceShown: 'y', createdAt: '2026-01-01T00:00:00.000Z' } }],
        error: null,
      }));
      const client = createMockSupabase({ red_flag_logs: logsChain });
      const adapter = createSupabaseDataAdapter();

      await runWithSupabaseDataContext(client as never, 'user-1', () => adapter.listRedFlagLogs());

      expect(logsChain.is).toHaveBeenCalledWith('deleted_at', null);
    });
  });

  it('adapter read paths use applyNotDeleted helper', () => {
    const source = readFileSync(ADAPTER_PATH, 'utf8');
    expect(source).toMatch(/applyNotDeleted/);
    expect(source).toMatch(/listHealthFlows[\s\S]*applyNotDeleted[\s\S]*health_flows/);
    expect(source).toMatch(/getHealthFlow[\s\S]*applyNotDeleted[\s\S]*health_flows/);
    expect(source).toMatch(/listFlowActions[\s\S]*applyNotDeleted[\s\S]*flow_actions/);
    expect(source).toMatch(/listFlowBlockers[\s\S]*applyNotDeleted[\s\S]*flow_blockers/);
  });

  it('data client payload reads use applyNotDeleted helper', () => {
    const source = readFileSync(CLIENT_PATH, 'utf8');
    expect(source).toMatch(/applyNotDeleted/);
    expect(source).toMatch(/readSinglePayload[\s\S]*applyNotDeleted/);
    expect(source).toMatch(/readPayloadList[\s\S]*applyNotDeleted/);
  });

  it('deletion/export request creates do not hide audit history incorrectly', () => {
    const source = readFileSync(ADAPTER_PATH, 'utf8');
    expect(source).toMatch(/createDataExportRequest/);
    expect(source).toMatch(/createDataDeletionRequest/);
    expect(source).not.toMatch(/listDataExportRequests/);
    expect(source).not.toMatch(/listDataDeletionRequests/);
  });
});
