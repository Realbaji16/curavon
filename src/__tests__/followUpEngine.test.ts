import { beforeEach, describe, expect, it, vi } from 'vitest';
import { evaluateFollowUp } from '../lib/followUp/followUpEngine';
import { scheduleFollowUpForAction } from '../lib/followUp/followUpScheduler';
import { saveFollowUp } from '../lib/followUp/followUpStorage';
import type { FollowUpRecord } from '../lib/followUp/followUpTypes';
import { clearLocalStorage } from './testUtils';

vi.mock('../lib/sync/syncQueue', () => ({
  queueSyncForCurrentUser: vi.fn(),
}));

function baseRecord(overrides: Partial<FollowUpRecord> = {}): FollowUpRecord {
  return {
    id: 'fup-test-1',
    actionId: 'plan-v2-test-action',
    createdAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + 86_400_000).toISOString(),
    status: 'pending',
    intent: 'check_action',
    linkedActionTitle: 'Test action',
    linkedActionCategory: 'stabilize',
    linkedSafetyLevel: 'normal',
    prompt: 'How did it go?',
    sourceSignals: [],
    escalationFlag: false,
    savedToDoctorSummary: false,
    ...overrides,
  };
}

describe('followUpEngine evaluateFollowUp', () => {
  it('helped outcome does not require new action or escalation', () => {
    const decision = evaluateFollowUp(baseRecord(), 'helped', 'Felt calmer');
    expect(decision.shouldGenerateNewAction).toBe(false);
    expect(decision.shouldEscalate).toBe(false);
  });

  it('blocked outcome requests friction reduction and new action', () => {
    const decision = evaluateFollowUp(baseRecord(), 'blocked', 'No time today');
    expect(decision.nextState).toBe('reduce_friction');
    expect(decision.shouldGenerateNewAction).toBe(true);
    expect(decision.shouldEscalate).toBe(false);
  });

  it('worse outcome with red-flag note escalates safety', () => {
    const decision = evaluateFollowUp(
      baseRecord(),
      'worse',
      'Chest pain is worse and I cannot breathe',
    );
    expect(decision.shouldEscalate).toBe(true);
    expect(decision.shouldGenerateNewAction).toBe(false);
    expect(decision.nextState).toBe('escalate');
  });
});

describe('followUpScheduler scheduleFollowUpForAction', () => {
  beforeEach(() => {
    clearLocalStorage();
  });

  it('skips casual follow-up for urgent/escalate actions', () => {
    const urgent = scheduleFollowUpForAction({
      source: 'today',
      action: {
        actionId: 'urgent-action',
        title: 'Urgent review',
        category: 'escalate',
        safetyLevel: 'urgent',
      },
    });
    expect(urgent.status).toBe('skipped');
    expect(urgent.reason).toBe('urgent_or_escalate');
  });

  it('does not create duplicate pending follow-up for same actionId on same day', () => {
    const input = {
      source: 'today' as const,
      action: {
        actionId: 'dup-action-id',
        title: 'Hydrate',
        category: 'stabilize',
        safetyLevel: 'normal' as const,
      },
    };

    const first = scheduleFollowUpForAction(input);
    const second = scheduleFollowUpForAction(input);

    expect(first.status).toBe('created');
    expect(second.status).toBe('existing');
    expect(second.record?.id).toBe(first.record?.id);
  });

  it('saveFollowUp rejects urgent records at storage layer', () => {
    const saved = saveFollowUp(
      baseRecord({
        linkedSafetyLevel: 'urgent',
        linkedActionCategory: 'escalate',
      }),
    );
    expect(saved).toBeNull();
  });
});
