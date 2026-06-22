import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resetSupabaseDataContextForTests,
  runWithSupabaseDataContext,
  upsertSinglePayload,
} from '../lib/data/supabaseDataClient';

const userId = '11111111-1111-1111-1111-111111111111';
const existingRowId = '22222222-2222-2222-2222-222222222222';

function createMockClient(existingSingletonId: string | null) {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const maybeSingle = vi.fn().mockResolvedValue({
    data: existingSingletonId ? { id: existingRowId } : null,
    error: null,
  });
  const limit = vi.fn().mockReturnValue({ maybeSingle });
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn(() => ({
    select,
    eq,
    order,
    limit,
    maybeSingle,
    upsert,
  }));

  return {
    client: { from } as never,
    upsert,
    eq,
  };
}

describe('upsertSinglePayload user singleton tables', () => {
  afterEach(() => {
    resetSupabaseDataContextForTests();
    vi.restoreAllMocks();
  });

  it('reuses existing health_profiles row id instead of inserting a duplicate user_id', async () => {
    const mock = createMockClient(existingRowId);

    await runWithSupabaseDataContext(mock.client, userId, async () => {
      await upsertSinglePayload('health_profiles', { preferredName: 'Alex' });
    });

    expect(mock.eq).toHaveBeenCalledWith('user_id', userId);
    expect(mock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRowId,
        user_id: userId,
        deleted_at: null,
      }),
      { onConflict: 'user_id' },
    );
  });

  it('uses a new uuid when no prior singleton row exists', async () => {
    const mock = createMockClient(null);

    await runWithSupabaseDataContext(mock.client, userId, async () => {
      await upsertSinglePayload('next_action_state', { currentAction: 'Rest' });
    });

    expect(mock.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        deleted_at: null,
      }),
      { onConflict: 'user_id' },
    );
    const upsertArg = mock.upsert.mock.calls[0]?.[0] as { id: string };
    expect(upsertArg.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});
