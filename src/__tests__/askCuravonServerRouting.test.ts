import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ASK_INTAKE } from '../types/askIntake';
import {
  buildAskFlowProposalFromIntake,
  buildAskIntakeRefinementFromIntelligence,
  mapAskPrivacyForServer,
  postAIIntake,
  postFlowProposal,
  processAIIntakeClientResult,
} from '../lib/client/aiRoutes';
import { serializeIntelligenceForFlowProposal } from '../lib/health-intelligence/services/intelligenceContextSerializer';
import { runHealthIntelligencePipeline } from '../lib/health-intelligence/services/healthIntelligencePipeline';
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
    expect(source).toMatch(/postAIIntake/);
    expect(source).toMatch(/processAIIntakeClientResult/);
    expect(source).toMatch(/buildAskFlowProposalFromIntake/);
    expect(source).toMatch(/aiIntelligenceContext/);
    expect(source).not.toMatch(/runAIOrchestrator/);
    expect(source).not.toMatch(/generateCuravonNextAction/);
    expect(source).not.toMatch(/createAskDraftHealthFlow/);
  });

  it('buildAskFlowProposalFromIntake includes intelligenceContext when available', () => {
    const intelligenceContext = serializeIntelligenceForFlowProposal(
      runHealthIntelligencePipeline({
        rawText: 'my body hot since yesterday and took malaria drug',
      }),
    );

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
        intelligenceContext,
      },
    );

    expect(body.intelligenceContext).toEqual(intelligenceContext);
    expect(body.intelligenceContext?.selectedModules).toContain('fever_malaria_ng_v1');
    expect(body).not.toHaveProperty('rawText');
    expect(body.intelligenceContext).not.toHaveProperty('message');
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

  it('processAIIntakeClientResult builds minimal refinement metadata', () => {
    const refinement = buildAskIntakeRefinementFromIntelligence({
      message: 'safe message',
      normalizedTerms: ['fever / feeling hot', 'headache'],
      selectedModules: [
        { moduleId: 'fever_malaria_ng_v1', confidence: 0.9, matchedTriggers: ['body hot'] },
        { moduleId: 'headache_ng_v1', confidence: 0.85, matchedTriggers: ['head dey bang'] },
      ],
      primaryModuleId: 'fever_malaria_ng_v1',
      riskLevel: 'high',
      redFlags: [],
      questions: [
        { id: 'q1', prompt: 'When did it start?', source: 'module_required' },
        { id: 'q2', prompt: 'Any weakness?', source: 'ai_generated' },
      ],
      allowedActions: [],
      nextStep: 'Answer a few short questions',
      summaryPreview: { title: 'Clinician summary preparation', fields: [], footer: 'not a diagnosis' },
      safety: { allowed: true, riskLevel: 'high' },
    });

    expect(refinement.metadata).toEqual({
      selectedModules: ['fever_malaria_ng_v1', 'headache_ng_v1'],
      riskLevel: 'high',
      questionCount: 2,
    });
    expect(refinement.understoodSummary).toContain('fever / feeling hot');
    expect(refinement.selectedModuleLabels).toContain('Fever & malaria concern');
    expect(refinement.guidedQuestions).toEqual(['When did it start?', 'Any weakness?']);

    const processed = processAIIntakeClientResult({
      ok: true,
      status: 200,
      data: {
        ok: true,
        mode: 'intake',
        safety: { allowed: true, riskLevel: 'high' },
        result: {
          message: 'safe message',
          questions: ['When did it start?'],
          nextStep: 'Answer a few short questions',
          intelligence: {
            message: 'safe message',
            normalizedTerms: ['fever / feeling hot', 'headache'],
            selectedModules: [
              { moduleId: 'fever_malaria_ng_v1', confidence: 0.9, matchedTriggers: ['body hot'] },
            ],
            primaryModuleId: 'fever_malaria_ng_v1',
            riskLevel: 'high',
            redFlags: [],
            questions: [{ id: 'q1', prompt: 'When did it start?', source: 'module_required' }],
            allowedActions: [],
            nextStep: 'Answer a few short questions',
            summaryPreview: {
              title: 'Clinician summary preparation',
              fields: [{ fieldId: 'onset', label: 'Onset', value: '' }],
              footer: 'not a diagnosis',
            },
            safety: { allowed: true, riskLevel: 'high' },
          },
        },
      },
    });
    expect(processed.kind).toBe('success');
    if (processed.kind === 'success') {
      expect(processed.intelligenceContext.selectedModules).toContain('fever_malaria_ng_v1');
      expect(processed.intelligenceContext).not.toHaveProperty('message');
      expect(processed.intelligenceContext).not.toHaveProperty('rawText');
    }
  });

  it('processAIIntakeClientResult maps safety_blocked without raw input echo', async () => {
    const rawInput = 'I cannot breathe and have chest pain';
    const processed = processAIIntakeClientResult({
      ok: false,
      status: 422,
      code: 'safety_blocked',
      message: 'This concern may need urgent support.',
    });
    expect(processed.kind).toBe('safety_blocked');
    if (processed.kind === 'safety_blocked') {
      expect(processed.title.length).toBeGreaterThan(0);
      expect(processed.body).toContain('urgent');
    }
    expect(JSON.stringify(processed)).not.toContain(rawInput);
  });

  it('postAIIntake calls /api/ai/intake with input field', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        mode: 'intake',
        safety: { allowed: true, riskLevel: 'high' },
        result: {
          message: 'Organize notes',
          questions: ['When did it start?'],
          nextStep: 'Answer a few short questions',
          intelligence: {
            message: 'Organize notes',
            normalizedTerms: ['fever / feeling hot'],
            selectedModules: [{ moduleId: 'fever_malaria_ng_v1', confidence: 0.9, matchedTriggers: [] }],
            primaryModuleId: 'fever_malaria_ng_v1',
            riskLevel: 'high',
            redFlags: [],
            questions: [{ id: 'q1', prompt: 'When did it start?', source: 'module_required' }],
            allowedActions: [],
            nextStep: 'Answer a few short questions',
            summaryPreview: { title: 'Clinician summary preparation', fields: [], footer: 'not a diagnosis' },
            safety: { allowed: true, riskLevel: 'high' },
          },
        },
      }),
    } as Response);

    const result = await postAIIntake({ input: 'my body hot' });
    expect(fetch).toHaveBeenCalledWith(
      '/api/ai/intake',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ input: 'my body hot', context: undefined }),
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.result?.intelligence?.selectedModules[0]?.moduleId).toBe('fever_malaria_ng_v1');
    }
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
