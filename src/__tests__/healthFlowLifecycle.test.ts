import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ASK_INTAKE } from '../types/askIntake';
import { hasUrgentIntakeSignals } from '../utils/askIntakeRules';
import {
  activateHealthFlowWithAction,
  createAskDraftHealthFlow,
  createAskSafetyBlockedFlow,
  persistFlowActionAdjusted,
  persistFlowActionBlocked,
  persistFlowActionDone,
  resolveAskPrivacyLevel,
} from '../lib/data/healthFlowService';

const mockCreateDraftHealthFlow = vi.fn();
const mockUpdateHealthFlowStatus = vi.fn();
const mockGetHealthFlow = vi.fn();
const mockCreateFlowAction = vi.fn();
const mockUpdateFlowActionStatus = vi.fn();
const mockCreateFlowBlocker = vi.fn();

vi.mock('../lib/data/getDataAdapter', () => ({
  getDataAdapter: () => ({
    createDraftHealthFlow: mockCreateDraftHealthFlow,
    updateHealthFlowStatus: mockUpdateHealthFlowStatus,
    getHealthFlow: mockGetHealthFlow,
    createFlowAction: mockCreateFlowAction,
    updateFlowActionStatus: mockUpdateFlowActionStatus,
    createFlowBlocker: mockCreateFlowBlocker,
  }),
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HEALTH_FLOW_SERVICE_PATH = path.resolve(__dirname, '../lib/data/healthFlowService.ts');
const ASK_CURAVON_PATH = path.resolve(__dirname, '../screens/AskCuravon.tsx');

function sampleFlow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'flow-1',
    userId: 'user-1',
    status: 'draft',
    stage: 'intake',
    riskLevel: 'low' as const,
    privacyLevel: 'private' as const,
    moduleVersion: 'health_flow_v1',
    payload: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function sampleAction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'action-1',
    userId: 'user-1',
    flowId: 'flow-1',
    status: 'pending',
    stage: 'next_action',
    riskLevel: 'low' as const,
    privacyLevel: 'private' as const,
    moduleVersion: 'health_flow_v1',
    actionOrder: 0,
    payload: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('healthFlow lifecycle service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateDraftHealthFlow.mockResolvedValue(sampleFlow());
    mockUpdateHealthFlowStatus.mockImplementation((_id, patch) =>
      Promise.resolve(sampleFlow(patch)),
    );
    mockGetHealthFlow.mockResolvedValue(sampleFlow());
    mockCreateFlowAction.mockResolvedValue(sampleAction());
    mockUpdateFlowActionStatus.mockImplementation((_id, patch) =>
      Promise.resolve(sampleAction(patch)),
    );
    mockCreateFlowBlocker.mockResolvedValue({
      id: 'blocker-1',
      userId: 'user-1',
      flowId: 'flow-1',
      status: 'active',
      stage: 'blocked',
      riskLevel: 'low',
      privacyLevel: 'private',
      moduleVersion: 'health_flow_v1',
      blockerType: 'tired',
      payload: {},
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('creates draft ask flow awaiting user approval, not active', async () => {
    const flow = await createAskDraftHealthFlow({
      title: 'Track symptoms',
      riskLevel: 'low',
      privacyLevel: 'private',
      payload: { source: 'ask_curavon', concernType: 'Physical symptom' },
    });

    expect(mockCreateDraftHealthFlow).toHaveBeenCalledTimes(1);
    expect(mockUpdateHealthFlowStatus).toHaveBeenCalledWith('flow-1', {
      status: 'awaiting_user_approval',
      stage: 'intake_complete',
      riskLevel: 'low',
      privacyLevel: 'private',
      payload: { source: 'ask_curavon', concernType: 'Physical symptom' },
    });
    expect(flow.status).toBe('awaiting_user_approval');
    expect(flow.status).not.toBe('active');
    expect(mockCreateFlowAction).not.toHaveBeenCalled();
  });

  it('activates flow and creates pending first action on approval', async () => {
    mockUpdateHealthFlowStatus.mockResolvedValueOnce(
      sampleFlow({ status: 'active', stage: 'action_active' }),
    );

    const { flow, action } = await activateHealthFlowWithAction({
      flowId: 'flow-1',
      instruction: 'Write down when symptoms started.',
      reason: 'Organize notes first.',
      category: 'track',
      actionId: 'ask-v2-demo',
    });

    expect(mockUpdateHealthFlowStatus).toHaveBeenCalledWith('flow-1', {
      status: 'active',
      stage: 'action_active',
      riskLevel: 'low',
      privacyLevel: 'private',
    });
    expect(mockCreateFlowAction).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'flow-1',
        status: 'pending',
        payload: expect.objectContaining({
          instruction: 'Write down when symptoms started.',
          reason: 'Organize notes first.',
        }),
      }),
    );
    expect(flow.status).toBe('active');
    expect(action.status).toBe('pending');
  });

  it('marks flow action done with response metadata', async () => {
    await persistFlowActionDone('action-1', {
      currentAction: 'Write one sentence about symptoms.',
      reason: 'Start small.',
      category: 'track',
    });

    expect(mockUpdateFlowActionStatus).toHaveBeenCalledWith(
      'action-1',
      expect.objectContaining({
        status: 'done',
        payload: expect.objectContaining({
          responseReason: 'done',
          instruction: 'Write one sentence about symptoms.',
        }),
      }),
    );
  });

  it('persists blocked action and flow_blocker', async () => {
    await persistFlowActionBlocked({
      flowId: 'flow-1',
      flowActionId: 'action-1',
      reason: 'time',
      state: {
        currentAction: 'Take a short walk.',
        reason: 'Light movement may help.',
        category: 'stabilize',
      },
    });

    expect(mockUpdateFlowActionStatus).toHaveBeenCalledWith(
      'action-1',
      expect.objectContaining({ status: 'blocked' }),
    );
    expect(mockCreateFlowBlocker).toHaveBeenCalledWith(
      expect.objectContaining({
        flowId: 'flow-1',
        blockerType: 'time',
        payload: expect.objectContaining({ notesSummary: expect.any(String) }),
      }),
    );
    expect(mockUpdateHealthFlowStatus).toHaveBeenCalledWith('flow-1', { stage: 'blocked' });
  });

  it('persists adjusted action with response reason', async () => {
    await persistFlowActionAdjusted({
      flowId: 'flow-1',
      flowActionId: 'action-1',
      option: 'two-minutes',
      state: {
        currentAction: 'Take a short walk.',
        reason: 'Light movement may help.',
        category: 'stabilize',
      },
    });

    expect(mockUpdateFlowActionStatus).toHaveBeenCalledWith(
      'action-1',
      expect.objectContaining({
        status: 'adjusted',
        payload: expect.objectContaining({
          responseReason: 'two-minutes',
          adjustment: expect.any(String),
        }),
      }),
    );
  });

  it('maps Sensitive Mode to sensitive privacy_level on ask flows', () => {
    expect(resolveAskPrivacyLevel(true)).toBe('sensitive');
    expect(resolveAskPrivacyLevel(false)).toBe('private');
  });

  it('creates safety_blocked flow for urgent intake audit without self-care action', async () => {
    const flow = await createAskSafetyBlockedFlow({
      privacyLevel: 'private',
      payload: {
        source: 'ask_curavon',
        outcome: 'safety_blocked',
        redFlagCategories: ['chest_pain'],
      },
    });

    expect(mockUpdateHealthFlowStatus).toHaveBeenCalledWith(
      'flow-1',
      expect.objectContaining({
        status: 'safety_blocked',
        stage: 'safety_escalation',
        riskLevel: 'urgent',
      }),
    );
    expect(flow.status).toBe('safety_blocked');
    expect(mockCreateFlowAction).not.toHaveBeenCalled();
  });

  it('urgent red-flag intake should not proceed as normal self-care intake', () => {
    const intake = {
      ...EMPTY_ASK_INTAKE,
      mainConcern: 'I have chest pain and pressure',
    };
    expect(hasUrgentIntakeSignals(intake)).toBe(true);
  });

  it('AskCuravon routes intake completion through server flow-proposal client', () => {
    const source = readFileSync(ASK_CURAVON_PATH, 'utf8');
    expect(source).toMatch(/postFlowProposal/);
    expect(source).not.toMatch(/runAIOrchestrator/);
    expect(source).not.toMatch(/generateCuravonNextAction/);
  });

  it('health flow lifecycle files do not import localStorage modules', () => {
    const localStorageImport = /\bfrom\s+['"].*localStorage|healthStorage|storageKeys/;
    expect(localStorageImport.test(readFileSync(HEALTH_FLOW_SERVICE_PATH, 'utf8'))).toBe(false);
    expect(localStorageImport.test(readFileSync(ASK_CURAVON_PATH, 'utf8'))).toBe(false);
  });
});
