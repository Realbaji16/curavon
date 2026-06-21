import { describe, expect, it } from 'vitest';
import { ACCOUNT_PURGE_USER_ID_TABLES } from '../lib/data/accountDataPurge';

describe('accountDataPurge', () => {
  it('deletes flow child tables before health_flows', () => {
    const flowIndex = ACCOUNT_PURGE_USER_ID_TABLES.indexOf('health_flows');
    const actionsIndex = ACCOUNT_PURGE_USER_ID_TABLES.indexOf('flow_actions');
    const blockersIndex = ACCOUNT_PURGE_USER_ID_TABLES.indexOf('flow_blockers');

    expect(actionsIndex).toBeGreaterThanOrEqual(0);
    expect(blockersIndex).toBeGreaterThanOrEqual(0);
    expect(flowIndex).toBeGreaterThan(actionsIndex);
    expect(flowIndex).toBeGreaterThan(blockersIndex);
  });
});
