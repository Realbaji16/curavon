import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  handleDeleteFlowPost,
  handleDeleteHealthProfilePost,
  handleDeleteAccountPost,
  handleDeleteSummaryPost,
  handleDeletionRequestPost,
  handleExportRequestPost,
} from '../lib/server/dataPrivacyHandlers';

vi.mock('../lib/supabase/serverClient', () => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock('../lib/data/getDataAdapter', () => ({
  getDataAdapter: vi.fn(),
}));

vi.mock('../lib/server/serverDataContext', () => ({
  withServerDataAccess: (_userId: string, _client: unknown, fn: () => Promise<unknown>) => fn(),
}));

vi.mock('../lib/supabase/adminClient', () => ({
  getSupabaseAdminClient: vi.fn(),
}));

vi.mock('../lib/data/accountDataPurge', () => ({
  purgeSupabaseAccountDataForUser: vi.fn(),
}));

import { createSupabaseServerClient } from '../lib/supabase/serverClient';
import { getDataAdapter } from '../lib/data/getDataAdapter';
import { getSupabaseAdminClient } from '../lib/supabase/adminClient';
import { purgeSupabaseAccountDataForUser } from '../lib/data/accountDataPurge';

const mockAdapter = {
  createDataExportRequest: vi.fn(),
  createDataDeletionRequest: vi.fn(),
  deleteHealthFlow: vi.fn(),
  deleteDoctorSummary: vi.fn(),
  deleteHealthProfile: vi.fn(),
  deleteAccountAndUserData: vi.fn(),
};

function configureSupabaseEnv() {
  process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';
}

function mockAuthenticatedUser(userId = 'user-test-123') {
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: userId } } },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as never);
}

describe('data privacy routes', () => {
  beforeEach(() => {
    configureSupabaseEnv();
    vi.mocked(getDataAdapter).mockReturnValue(mockAdapter as never);
    vi.clearAllMocks();

    mockAdapter.createDataExportRequest.mockResolvedValue({
      id: 'export-req-1',
      userId: 'user-test-123',
      requestStatus: 'pending',
      requestedAt: '2026-01-01T00:00:00.000Z',
      payload: { request_type: 'account_export' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockAdapter.createDataDeletionRequest.mockResolvedValue({
      id: 'delete-req-1',
      userId: 'user-test-123',
      requestStatus: 'pending',
      deletionScope: 'health_data',
      requestedAt: '2026-01-01T00:00:00.000Z',
      payload: { request_type: 'health_data_deletion', account_deleted: false },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
    mockAdapter.deleteHealthFlow.mockResolvedValue({ flowId: 'flow-1', status: 'deleted' });
    mockAdapter.deleteDoctorSummary.mockResolvedValue({ summaryId: 'summary-1', deletedKind: 'item' });
    mockAdapter.deleteHealthProfile.mockResolvedValue({ status: 'deleted' });
    mockAdapter.deleteAccountAndUserData.mockResolvedValue({
      status: 'deleted',
      profileDeleted: true,
      authUserDeleted: false,
      failedTables: [],
    });
    vi.mocked(getSupabaseAdminClient).mockReturnValue({
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    } as never);
    vi.mocked(purgeSupabaseAccountDataForUser).mockResolvedValue({
      profileDeleted: true,
      tablesPurged: 12,
      failedTables: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects unauthenticated export requests with 401', async () => {
    configureSupabaseEnv();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never);

    const { status, body } = await handleExportRequestPost(
      new Request('http://localhost/api/data/export-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'account_export' }),
      }),
    );

    expect(status).toBe(401);
    expect(body.ok).toBe(false);
  });

  it('creates pending export request without returning export data', async () => {
    mockAuthenticatedUser();

    const { status, body } = await handleExportRequestPost(
      new Request('http://localhost/api/data/export-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'account_export' }),
      }),
    );
    const serialized = JSON.stringify(body);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.request?.status).toBe('pending');
    expect(body.request?.id).toBe('export-req-1');
    expect(mockAdapter.createDataExportRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestStatus: 'pending' }),
    );
    expect(serialized).not.toContain('symptoms');
    expect(serialized).not.toContain('medication');
  });

  it('creates pending deletion request without claiming account deleted', async () => {
    mockAuthenticatedUser();

    const { status, body } = await handleDeletionRequestPost(
      new Request('http://localhost/api/data/deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestType: 'health_data_deletion' }),
      }),
    );

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.request?.status).toBe('pending');
    expect(body.message).toContain('Processing may take time');
    expect(JSON.stringify(body)).not.toContain('"account_deleted":true');
    expect(mockAdapter.createDataDeletionRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        requestStatus: 'pending',
        deletionScope: 'health_data',
      }),
    );
  });

  it('delete-flow requires owned flow id and returns status only', async () => {
    mockAuthenticatedUser();

    const { status, body } = await handleDeleteFlowPost(
      new Request('http://localhost/api/data/delete-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ healthFlowId: 'flow-1' }),
      }),
    );
    const serialized = JSON.stringify(body);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe('deleted');
    expect(body.flowId).toBe('flow-1');
    expect(serialized).not.toContain('title');
    expect(mockAdapter.deleteHealthFlow).toHaveBeenCalledWith('flow-1');
  });

  it('delete-flow returns 404 for missing owned flow', async () => {
    mockAuthenticatedUser();
    mockAdapter.deleteHealthFlow.mockRejectedValue(new Error('missing'));

    const { status, body } = await handleDeleteFlowPost(
      new Request('http://localhost/api/data/delete-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ healthFlowId: 'missing-flow' }),
      }),
    );

    expect(status).toBe(404);
    expect(body.error?.code).toBe('flow_not_found');
  });

  it('delete-summary does not return summary content', async () => {
    mockAuthenticatedUser();
    mockAdapter.deleteDoctorSummary.mockResolvedValue({
      summaryId: 'summary-sensitive-1',
      deletedKind: 'draft',
    });

    const { status, body } = await handleDeleteSummaryPost(
      new Request('http://localhost/api/data/delete-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summaryId: 'summary-sensitive-1' }),
      }),
    );
    const serialized = JSON.stringify(body);

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.summaryId).toBe('summary-sensitive-1');
    expect(body.status).toBe('deleted');
    expect(serialized).not.toContain('CURAVON DOCTOR SUMMARY');
    expect(serialized).not.toContain('content');
  });

  it('delete-health-profile clears profile without deleting auth user', async () => {
    mockAuthenticatedUser();

    const { status, body } = await handleDeleteHealthProfilePost(
      new Request('http://localhost/api/data/delete-health-profile', { method: 'POST' }),
    );

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.status).toBe('deleted');
    expect(mockAdapter.deleteHealthProfile).toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain('auth');
  });

  it('delete-account purges account data and deletes auth user', async () => {
    mockAuthenticatedUser();

    const { status, body } = await handleDeleteAccountPost(
      new Request('http://localhost/api/data/delete-account', { method: 'POST' }),
    );

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.profileDeleted).toBe(true);
    expect(body.authUserDeleted).toBe(true);
    expect(purgeSupabaseAccountDataForUser).toHaveBeenCalled();
    expect(JSON.stringify(body)).not.toContain('symptoms');
  });

  it('delete-account uses self-delete RPC when admin client is not configured', async () => {
    mockAuthenticatedUser();
    vi.mocked(getSupabaseAdminClient).mockReturnValue(null);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-test-123' } } },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-test-123' } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({ error: null }),
    } as never);

    const { status, body } = await handleDeleteAccountPost(
      new Request('http://localhost/api/data/delete-account', { method: 'POST' }),
    );

    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.authUserDeleted).toBe(true);
    expect(purgeSupabaseAccountDataForUser).not.toHaveBeenCalled();
  });

  it('delete-account reports missing RPC when Supabase function was not applied', async () => {
    mockAuthenticatedUser();
    vi.mocked(getSupabaseAdminClient).mockReturnValue(null);
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'user-test-123' } } },
          error: null,
        }),
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-test-123' } },
          error: null,
        }),
      },
      rpc: vi.fn().mockResolvedValue({
        error: { code: 'PGRST202', message: 'Could not find function public.delete_own_account' },
      }),
    } as never);

    const { status, body } = await handleDeleteAccountPost(
      new Request('http://localhost/api/data/delete-account', { method: 'POST' }),
    );

    expect(status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.error?.code).toBe('delete_rpc_missing');
  });

  it('privacy route handlers do not import localStorage modules', () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const handlerPath = path.resolve(__dirname, '../lib/server/dataPrivacyHandlers.ts');
    const pattern = /\blocalStorage\b|healthStorage|storageKeys|service_role/;
    expect(pattern.test(readFileSync(handlerPath, 'utf8'))).toBe(false);
  });
});
