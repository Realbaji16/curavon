import { describe, expect, it } from 'vitest';
import { createSupabaseDataPorts } from '../lib/data/supabaseRepositories';
import {
  CARE_CIRCLE_SUPABASE_TABLES,
  SUPABASE_DATA_PORT_KEYS,
  type SupabaseDataPorts,
} from '../lib/data/supabaseDataPorts';

const REQUIRED_PORT_METHODS: Record<
  keyof SupabaseDataPorts,
  readonly string[]
> = {
  profile: ['read', 'upsert'],
  healthProfile: ['read', 'save', 'softDelete'],
  dailyCheckins: ['list', 'save', 'softDeleteAll'],
  askHistory: ['list', 'save', 'softDeleteAll'],
  guideResults: ['list', 'save', 'softDeleteAll'],
  followUps: ['list', 'save', 'softDeleteAll'],
  nextActionState: ['read', 'save', 'softDelete'],
  doctorSummary: ['listItems', 'saveItem', 'listDrafts', 'saveDraft', 'softDeleteAll'],
  redFlagLogs: ['list', 'save', 'softDeleteAll'],
  activityInsights: ['read', 'save', 'softDeleteAll'],
  aiAudit: [
    'listUsageLogs',
    'appendUsageLog',
    'listDecisionTraces',
    'appendDecisionTrace',
    'softDeleteAll',
  ],
  userPreferences: ['read', 'save', 'softDelete'],
};

describe('Supabase data ports (Phase 1)', () => {
  it('exports all required port keys', () => {
    expect(SUPABASE_DATA_PORT_KEYS).toHaveLength(12);
    expect(SUPABASE_DATA_PORT_KEYS).toContain('profile');
    expect(SUPABASE_DATA_PORT_KEYS).toContain('aiAudit');
  });

  it('createSupabaseDataPorts wires every port with required methods', () => {
    const ports = createSupabaseDataPorts();

    for (const key of SUPABASE_DATA_PORT_KEYS) {
      const port = ports[key];
      expect(port).toBeDefined();
      for (const method of REQUIRED_PORT_METHODS[key]) {
        expect(typeof (port as Record<string, unknown>)[method]).toBe('function');
      }
    }
  });

  it('documents Care Circle tables pending schema work', () => {
    expect(CARE_CIRCLE_SUPABASE_TABLES).toEqual([
      'care_circles',
      'care_circle_members',
      'care_circle_events',
    ]);
  });
});
