import { getConfiguredAuthMode } from '../auth/authConfig';
import { detectUrgentConcern } from '../../utils/healthSafety';
import { createSupabaseServerClient } from '../supabase/serverClient';
import { hasSupabasePublicConfig } from '../supabase/supabaseEnv';
import type { AIIntakeRiskLevel, AIIntakeSafety, IntakeRequestBody } from './aiIntakeTypes';

export type AuthGuardFailure = {
  ok: false;
  status: 401;
  code: 'unauthenticated';
  message: string;
};

export type AuthGuardSuccess = {
  ok: true;
  userId: string;
};

export type AuthGuardResult = AuthGuardSuccess | AuthGuardFailure;

export type BodyGuardFailure = {
  ok: false;
  status: 400;
  code: 'invalid_json' | 'invalid_body' | 'empty_input';
  message: string;
};

export type BodyGuardSuccess = {
  ok: true;
  input: string;
};

export type BodyGuardResult = BodyGuardSuccess | BodyGuardFailure;

export type ServerAIIntakeMode = 'mock' | 'provider_unavailable' | 'ready';

export async function requireAuthenticatedSupabaseUser(): Promise<AuthGuardResult> {
  const authMode = getConfiguredAuthMode();

  if (authMode !== 'supabase' || !hasSupabasePublicConfig()) {
    return {
      ok: false,
      status: 401,
      code: 'unauthenticated',
      message: 'Authentication required.',
    };
  }

  const client = await createSupabaseServerClient();
  if (!client) {
    return {
      ok: false,
      status: 401,
      code: 'unauthenticated',
      message: 'Authentication required.',
    };
  }

  const {
    data: { user },
    error,
  } = await client.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      status: 401,
      code: 'unauthenticated',
      message: 'Authentication required.',
    };
  }

  return { ok: true, userId: user.id };
}

export function parseIntakeRequestBody(body: unknown): BodyGuardResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Request body must be a JSON object.',
    };
  }

  const record = body as IntakeRequestBody;
  if (typeof record.input !== 'string') {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Field "input" must be a string.',
    };
  }

  const input = record.input.trim();
  if (!input) {
    return {
      ok: false,
      status: 400,
      code: 'empty_input',
      message: 'Field "input" must not be empty.',
    };
  }

  return { ok: true, input };
}

export function assessIntakeSafety(input: string): AIIntakeSafety {
  const urgent = detectUrgentConcern(input);

  if (urgent.hasUrgent) {
    return {
      allowed: false,
      riskLevel: 'urgent',
      blockedReason: urgent.selfHarm ? 'self_harm_language' : 'urgent_language_detected',
    };
  }

  return {
    allowed: true,
    riskLevel: 'low',
  };
}

/** Pilot routing: mock-first; live provider calls are not wired yet. */
export function resolveServerAIIntakeMode(): ServerAIIntakeMode {
  const enabledRaw = process.env.AI_ENABLED?.trim().toLowerCase();
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (enabledRaw === 'false') {
    return 'mock';
  }

  if (enabledRaw === 'true' && !hasKey) {
    return 'provider_unavailable';
  }

  if (enabledRaw === 'true' && hasKey) {
    return 'ready';
  }

  return 'mock';
}

export function buildMockIntakeResult(): {
  message: string;
  questions: string[];
  nextStep: string;
} {
  return {
    message:
      'Thanks for sharing. Curavon will help narrow this before suggesting any actions — not a diagnosis.',
    questions: ['When did this start?', 'Has anything made it better or worse?'],
    nextStep: 'answer_questions',
  };
}

export function defaultSafetyForError(riskLevel: AIIntakeRiskLevel = 'low'): AIIntakeSafety {
  return {
    allowed: false,
    riskLevel,
  };
}
