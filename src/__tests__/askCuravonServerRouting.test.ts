import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ASK_INTAKE } from '../types/askIntake';
import {
  buildAskFlowProposalFromIntake,
  mapAskPrivacyForServer,
  postFlowProposal,
} from '../lib/client/aiRoutes';
import { runAIClient } from '../lib/ai/aiClient';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASK_CURAVON_PATH = path.resolve(__dirname, '../screens/AskCuravon.tsx');
const AI_ROUTES_PATH = path.resolve(__dirname, '../lib/client/aiRoutes.ts');

describe('Ask Curavon server flow-proposal routing', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('AskCuravon uses postFlowProposal and not runAIOrchestrator', () => {
    const source = readFileSync(ASK_CURAVON_PATH, 'utf8');
    expect(source).toMatch(/postFlowProposal/);
    expect(source).toMatch(/buildAskFlowProposalFromIntake/);
    expect(source).not.toMatch(/runAIOrchestrator/);
    expect(source).not.toMatch(/generateCuravonNextAction/);
    expect(source).not.toMatch(/createAskDraftHealthFlow/);
  });

  it('buildAskFlowProposalFromIntake includes safetyCheckText without logging helpers', () => {
    const body = buildAskFlowProposalFromIntake(
      {
        ...EMPTY_ASK_INTAKE,
        mainConcern: 'Mild headache for two days',
        concernType: 'Physical symptom',
        timeline: 'A few days',
        goal: 'One next step',
      },
      {
        privacyLevel: 'standard',
        nextSafeStep: 'Write down when symptoms started.',
      },
    );

    expect(body.safetyResult?.safetyCheckText).toContain('Mild headache');
    expect(body.concernSummary?.concernType).toBe('Physical symptom');
    expect(body.proposedAction?.instruction).toContain('Write down');
    expect(JSON.stringify(body)).not.toMatch(/console\.(log|info|debug)/);
  });

  it('postFlowProposal calls /api/ai/flow-proposal with same-origin credentials', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        mode: 'flow_proposal',
        safety: { allowed: true, riskLevel: 'low' },
        flowId: 'flow-draft-1',
        flowStatus: 'awaiting_user_approval',
        proposedAction: {
          title: 'Track symptoms',
          instruction: 'Write down when symptoms started.',
          reason: 'Organize notes first.',
          category: 'track',
          safetyLevel: 'normal',
        },
      }),
    } as Response);

    const result = await postFlowProposal(
      buildAskFlowProposalFromIntake(
        { ...EMPTY_ASK_INTAKE, mainConcern: 'Headache' },
        { privacyLevel: 'standard', nextSafeStep: 'Write one note.' },
      ),
    );

    expect(fetch).toHaveBeenCalledWith(
      '/api/ai/flow-proposal',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.flowStatus).toBe('awaiting_user_approval');
      expect(result.data.proposedAction.instruction).toContain('Write down');
    }
  });

  it('maps urgent server response to safety escalation without self-care action', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({
        ok: false,
        mode: 'flow_proposal',
        safety: { allowed: false, riskLevel: 'urgent' },
        flowId: 'flow-blocked-1',
        flowStatus: 'safety_blocked',
        escalation: {
          title: 'This may need urgent support',
          body: 'Seek local emergency services or a clinician now.',
          redFlagCategories: ['chest_pain'],
        },
        error: { code: 'safety_blocked', message: 'Safety blocked.' },
      }),
    } as Response);

    const rawConcern = 'I have chest pain and cannot breathe';
    const result = await postFlowProposal({
      concernSummary: { concernType: 'Physical symptom', timeline: 'Today' },
      safetyResult: { safetyCheckText: rawConcern },
      proposedAction: {
        title: 'Hydrate',
        instruction: 'Drink water',
        reason: 'Should not apply',
        category: 'stabilize',
        safetyLevel: 'normal',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);
    expect(result.code).toBe('safety_blocked');
    expect(result.data?.proposedAction).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain(rawConcern);
  });

  it('returns auth-safe error on 401 without raw health text in helper source', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        ok: false,
        mode: 'flow_proposal',
        safety: { allowed: false },
        error: { code: 'unauthenticated', message: 'Authentication required.' },
      }),
    } as Response);

    const result = await postFlowProposal({
      concernSummary: { concernType: 'Not sure', timeline: 'Today' },
      safetyResult: { safetyCheckText: 'private symptom detail' },
      proposedAction: {
        title: 'Step',
        instruction: 'Write one note.',
        reason: 'Safe',
        category: 'track',
        safetyLevel: 'normal',
      },
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
    expect(result.code).toBe('unauthenticated');
    const routesSource = readFileSync(AI_ROUTES_PATH, 'utf8');
    expect(routesSource).not.toMatch(/console\.(log|info|debug)/);
  });

  it('maps sensitive mode to server privacy level', () => {
    expect(mapAskPrivacyForServer(true)).toBe('sensitive');
    expect(mapAskPrivacyForServer(false)).toBe('standard');
  });

  it('browser AI client remains blocked', async () => {
    vi.stubGlobal('window', {} as Window);
    const result = await runAIClient({
      model: 'gpt-4o-mini',
      systemPrompt: 'test',
      prompt: 'secret concern text',
    });
    expect(result.success).toBe(false);
    expect(result.warnings?.join(' ')).toMatch(/server-only/i);
  });
});
