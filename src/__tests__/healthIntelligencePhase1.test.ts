import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  APPROVED_ACTIONS,
  HEALTH_MODULES,
  bridgeRedFlags,
  generateGuidedQuestions,
  isHealthIntelligenceResponseAllowed,
  normalizeNigerianHealthLanguage,
  routeHealthModules,
  runHealthIntelligencePipeline,
  validateHealthIntelligenceResponse,
} from '../lib/health-intelligence';
import { detectRedFlags, hasUrgentRedFlag } from '../lib/health/redFlags';
import { handleAIIntakePost } from '../lib/server/aiIntakeHandler';

vi.mock('../lib/supabase/serverClient', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '../lib/supabase/serverClient';

const ENV_KEYS = [
  'NEXT_PUBLIC_AUTH_MODE',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'OPENAI_API_KEY',
  'AI_ENABLED',
] as const;

const originalEnv: Record<string, string | undefined> = {};

function saveEnv() {
  for (const key of ENV_KEYS) {
    originalEnv[key] = process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}

function configureSupabaseEnv() {
  process.env.NEXT_PUBLIC_AUTH_MODE = 'supabase';
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_key';
}

function mockAuthenticatedUser(userId = 'user-phase1') {
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

function postIntake(input: string) {
  return handleAIIntakePost(
    new Request('http://localhost/api/ai/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input }),
    }),
  );
}

const BLOCKED_OUTPUTS = [
  'You have malaria and should start treatment',
  'Take amoxicillin twice daily',
  'Take the correct dose now',
  'I can prescribe antibiotics for you',
];

describe('Healthy.Ai Phase 1 intelligence skeleton', () => {
  beforeEach(() => {
    saveEnv();
    for (const key of ENV_KEYS) delete process.env[key];
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  afterEach(() => {
    restoreEnv();
    vi.mocked(createSupabaseServerClient).mockReset();
  });

  describe('1. module catalog', () => {
    it('loads exactly 20 Nigeria-context modules', () => {
      expect(HEALTH_MODULES).toHaveLength(20);
      expect(HEALTH_MODULES.every((module) => module.country_context === 'NG')).toBe(true);
    });
  });

  describe('2. Nigerian phrase normalization', () => {
    it('normalizes body hot and head dey bang', () => {
      const result = normalizeNigerianHealthLanguage('my body hot and head dey bang');
      expect(result.normalizedTerms['body hot']).toBe('fever / feeling hot');
      expect(result.normalizedTerms['head dey bang']).toBe('headache');
      expect(result.moduleHints).toEqual(
        expect.arrayContaining(['fever_malaria_ng_v1', 'headache_ng_v1']),
      );
    });
  });

  describe('3. multi-module routing', () => {
    it('routes fever + headache + medication', () => {
      const routing = routeHealthModules({
        rawText: 'my body hot and head dey bang and chemist gave me drug',
      });
      const ids = routing.selectedModules.map((module) => module.moduleId);
      expect(ids).toEqual(
        expect.arrayContaining([
          'fever_malaria_ng_v1',
          'headache_ng_v1',
          'medication_question_ng_v1',
        ]),
      );
    });

    it('routes belle pain and stooling', () => {
      const routing = routeHealthModules({
        rawText: 'my belle dey pain me and I am stooling',
      });
      const ids = routing.selectedModules.map((module) => module.moduleId);
      expect(ids).toEqual(
        expect.arrayContaining(['stomach_pain_ng_v1', 'diarrhea_vomiting_ng_v1']),
      );
    });
  });

  describe('4. high-risk module priority', () => {
    it('prioritizes chest pain over breathing for combined urgent symptoms', () => {
      const routing = routeHealthModules({ rawText: 'chest pain and breathing fast' });
      expect(routing.primaryModuleId).toBe('chest_pain_ng_v1');
      expect(['high', 'urgent']).toContain(routing.riskLevel);
    });

    it('prioritizes child fever over adult fever module', () => {
      const routing = routeHealthModules({ rawText: 'my baby body hot since last night' });
      expect(routing.primaryModuleId).toBe('child_fever_illness_ng_v1');
    });
  });

  describe('5. red flag bridge', () => {
    it('wraps detectRedFlags with intelligence hits and urgent message', () => {
      const bridge = bridgeRedFlags('I cannot breathe and have chest pain');
      expect(bridge.isUrgent).toBe(true);
      expect(bridge.hits.length).toBeGreaterThan(0);
      expect(bridge.message).toMatch(/urgent|emergency|support/i);
      expect(bridge.detection.matches.length).toBeGreaterThan(0);
    });
  });

  describe('6. guided questions count and safety', () => {
    it('returns 2-5 safe questions with red-flag priority for blurry vision headache', () => {
      const routing = routeHealthModules({ rawText: 'headache and blurry vision since morning' });
      const questions = generateGuidedQuestions({
        rawText: 'headache and blurry vision since morning',
        selectedModules: routing.selectedModules,
        primaryModuleId: routing.primaryModuleId,
      });

      expect(questions.length).toBeGreaterThanOrEqual(2);
      expect(questions.length).toBeLessThanOrEqual(5);
      expect(questions[0]?.type).toBe('red_flag');
    });

    it('limits urgent pipeline questions to at most one summary-prep question', () => {
      const result = runHealthIntelligencePipeline({
        rawText: 'I cannot breathe and have chest pain',
      });
      expect(result.safety.allowed).toBe(false);
      expect(result.questions.length).toBeLessThanOrEqual(1);
      expect(result.nextStep).toBe(APPROVED_ACTIONS.seek_urgent_care_now.instruction);
    });
  });

  describe('7. blocked diagnosis / prescription / dosage', () => {
    it.each(BLOCKED_OUTPUTS)('blocks unsafe output: %s', (text) => {
      expect(isHealthIntelligenceResponseAllowed(text)).toBe(false);
      expect(validateHealthIntelligenceResponse(text).allowed).toBe(false);
    });

    it('allows safe organizational copy', () => {
      const safe =
        'Track when symptoms started and prepare questions for a clinician. This does not diagnose.';
      expect(isHealthIntelligenceResponseAllowed(safe)).toBe(true);
    });
  });

  describe('8. API intake includes result.intelligence', () => {
    it('returns intelligence payload when AI_ENABLED=false', async () => {
      configureSupabaseEnv();
      mockAuthenticatedUser();
      process.env.AI_ENABLED = 'false';

      const { status, body } = await postIntake('my body hot and head dey bang');
      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.result?.intelligence?.selectedModules.length).toBeGreaterThan(0);
      expect(body.result?.questions.length).toBeGreaterThanOrEqual(2);
      expect(body.result?.message).toContain('does not diagnose');
    });

    it('returns intelligence payload when AI_ENABLED=true without OPENAI_API_KEY', async () => {
      configureSupabaseEnv();
      mockAuthenticatedUser();
      process.env.AI_ENABLED = 'true';
      delete process.env.OPENAI_API_KEY;

      const { status, body } = await postIntake('my body hot and head dey bang');
      const serialized = JSON.stringify(body);

      expect(status).toBe(200);
      expect(body.ok).toBe(true);
      expect(body.result?.intelligence?.selectedModules.length).toBeGreaterThan(0);
      expect(serialized).not.toContain('OPENAI_API_KEY');
    });

    it('never exposes OPENAI_API_KEY in intake response', async () => {
      configureSupabaseEnv();
      mockAuthenticatedUser();
      process.env.AI_ENABLED = 'false';
      process.env.OPENAI_API_KEY = 'sk-test-secret-key-value';

      const { body } = await postIntake('mild headache for two days');
      const serialized = JSON.stringify(body);

      expect(serialized).not.toContain('sk-test-secret-key-value');
      expect(serialized).not.toContain('OPENAI_API_KEY');
    });
  });

  describe('9. aiIntakeRoute compatibility (smoke)', () => {
    it('blocks urgent intake with 422 safety_blocked without echoing raw input', async () => {
      configureSupabaseEnv();
      mockAuthenticatedUser();
      process.env.AI_ENABLED = 'false';

      const rawInput = 'I have chest pain and trouble breathing';
      const { status, body } = await postIntake(rawInput);
      const serialized = JSON.stringify(body);

      expect(status).toBe(422);
      expect(body.error?.code).toBe('safety_blocked');
      expect(body.safety.allowed).toBe(false);
      expect(serialized).not.toContain(rawInput);
    });
  });

  describe('10. redFlags compatibility (smoke)', () => {
    it('detectRedFlags still flags cannot breathe', () => {
      expect(hasUrgentRedFlag('I cannot breathe')).toBe(true);
      const result = detectRedFlags('I cannot breathe');
      expect(result.hasUrgent).toBe(true);
      expect(result.matches.some((match) => match.category === 'difficulty_breathing')).toBe(true);
    });

    it('does not flag negated chest pain', () => {
      expect(hasUrgentRedFlag('I do not have chest pain, just mild fatigue')).toBe(false);
    });
  });
});
