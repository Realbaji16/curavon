import { getConfiguredAuthMode } from '../auth/authConfig';
import { DataAuthError, DataPermissionError, DataUnavailableError } from '../data/dataErrors';
import { detectRedFlags } from '../health/redFlags';
import type { IntelligenceRiskLevel, HealthIntelligenceResult } from '../health-intelligence/types';
import { createSupabaseServerClient } from '../supabase/serverClient';
import { hasSupabasePublicConfig } from '../supabase/supabaseEnv';
import type { AIIntakeRiskLevel, AIIntakeResult, AIIntakeSafety, IntakeRequestBody } from './aiIntakeTypes';
import type {
  FlowProposalRequestBody,
  ParsedFlowProposalInput,
  ParsedSummaryInput,
  ProposedActionPreview,
  SummaryRequestBody,
} from './aiServerTypes';

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
  context?: Record<string, unknown>;
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
    data: { session },
    error: sessionError,
  } = await client.auth.getSession();

  if (!sessionError && session?.user) {
    return { ok: true, userId: session.user.id };
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
  const rawField =
    typeof record.input === 'string'
      ? record.input
      : typeof record.concernText === 'string'
        ? record.concernText
        : null;

  if (rawField === null) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Field "input" must be a string.',
    };
  }

  const input = rawField.trim();
  if (!input) {
    return {
      ok: false,
      status: 400,
      code: 'empty_input',
      message: 'Field "input" must not be empty.',
    };
  }

  let context: Record<string, unknown> | undefined;
  if (record.context !== undefined) {
    if (record.context === null || typeof record.context !== 'object' || Array.isArray(record.context)) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_body',
        message: 'Field "context" must be a JSON object when provided.',
      };
    }
    context = record.context as Record<string, unknown>;
  }

  return { ok: true, input, context };
}

export function assessIntakeSafety(input: string): AIIntakeSafety {
  const urgent = detectRedFlags(input);

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

export function mapIntelligenceRiskToIntakeRisk(risk: IntelligenceRiskLevel): AIIntakeRiskLevel {
  if (risk === 'medium_high') return 'high';
  return risk;
}

export function buildIntakeResultFromIntelligence(
  intelligence: HealthIntelligenceResult,
): AIIntakeResult {
  return {
    message: intelligence.message,
    questions: intelligence.questions.map((question) => question.prompt),
    nextStep: intelligence.nextStep,
    intelligence,
  };
}

export function buildIntakeSafetyFromIntelligence(
  intelligence: HealthIntelligenceResult,
): AIIntakeSafety {
  return {
    allowed: intelligence.safety.allowed,
    riskLevel: mapIntelligenceRiskToIntakeRisk(intelligence.safety.riskLevel),
    blockedReason: intelligence.safety.blockedReason,
  };
}

/** @deprecated Pilot mock — replaced by health intelligence pipeline. */
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

type RouteBodyFailure = {
  ok: false;
  status: 400;
  code: 'invalid_body' | 'empty_input';
  message: string;
};

function parsePrivacyLevel(value: unknown): 'standard' | 'sensitive' {
  if (value === 'sensitive') return 'sensitive';
  return 'standard';
}

function parseProposedAction(value: unknown): ProposedActionPreview | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (typeof record.title !== 'string' || !record.title.trim()) return null;
  if (typeof record.instruction !== 'string' || !record.instruction.trim()) return null;
  const safetyLevel =
    record.safetyLevel === 'urgent' || record.safetyLevel === 'caution' ? record.safetyLevel : 'normal';
  return {
    title: record.title.trim(),
    instruction: record.instruction.trim(),
    reason: typeof record.reason === 'string' ? record.reason.trim() : 'Organize notes before next steps.',
    category: typeof record.category === 'string' ? record.category.trim() : 'general',
    safetyLevel,
  };
}

export function parseFlowProposalBody(
  body: unknown,
): { ok: true; data: ParsedFlowProposalInput } | RouteBodyFailure {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Request body must be a JSON object.',
    };
  }

  const record = body as FlowProposalRequestBody;
  const privacyLevel = parsePrivacyLevel(record.privacyLevel);

  if (typeof record.askIntakeSessionId === 'string' && record.askIntakeSessionId.trim()) {
    return {
      ok: true,
      data: { kind: 'session', askIntakeSessionId: record.askIntakeSessionId.trim(), privacyLevel },
    };
  }

  if (typeof record.guideResultId === 'string' && record.guideResultId.trim()) {
    return {
      ok: true,
      data: { kind: 'guide', guideResultId: record.guideResultId.trim(), privacyLevel },
    };
  }

  if (record.concernSummary !== null && typeof record.concernSummary === 'object' && !Array.isArray(record.concernSummary)) {
    const summary = record.concernSummary as Record<string, unknown>;
    const concernType = typeof summary.concernType === 'string' ? summary.concernType.trim() : '';
    const timeline = typeof summary.timeline === 'string' ? summary.timeline.trim() : '';
    const goal = typeof summary.goal === 'string' ? summary.goal.trim() : undefined;
    const proposedAction = parseProposedAction(record.proposedAction);

    let safetyCheckText = '';
    if (record.safetyResult !== null && typeof record.safetyResult === 'object' && !Array.isArray(record.safetyResult)) {
      const safety = record.safetyResult as Record<string, unknown>;
      if (typeof safety.safetyCheckText === 'string') {
        safetyCheckText = safety.safetyCheckText.trim();
      }
    }
    if (!safetyCheckText && typeof summary.safetyCheckText === 'string') {
      safetyCheckText = summary.safetyCheckText.trim();
    }

    if (!concernType || !timeline || !proposedAction || !safetyCheckText) {
      return {
        ok: false,
        status: 400,
        code: 'invalid_body',
        message:
          'Structured flow proposals require concernSummary, proposedAction, and safetyCheckText for server safety review.',
      };
    }

    return {
      ok: true,
      data: {
        kind: 'structured',
        concernSummary: { concernType, timeline, goal },
        proposedAction,
        safetyCheckText,
        privacyLevel,
      },
    };
  }

  return {
    ok: false,
    status: 400,
    code: 'invalid_body',
    message:
      'Provide askIntakeSessionId, guideResultId, or structured concernSummary with proposedAction.',
  };
}

export function parseSummaryBody(body: unknown): { ok: true; data: ParsedSummaryInput } | RouteBodyFailure {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Request body must be a JSON object.',
    };
  }

  const record = body as SummaryRequestBody;
  if (typeof record.healthFlowId !== 'string' || !record.healthFlowId.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'empty_input',
      message: 'Field "healthFlowId" must be a non-empty string.',
    };
  }

  return { ok: true, data: { healthFlowId: record.healthFlowId.trim() } };
}

export type ServerDataAccessFailure = {
  status: 503 | 401;
  code: 'data_permission' | 'data_unavailable' | 'unauthenticated';
  message: string;
};

/** Map data-layer errors from withServerDataAccess into API-safe responses. */
export function mapServerDataAccessError(error: unknown): ServerDataAccessFailure {
  if (error instanceof DataAuthError) {
    return {
      status: 401,
      code: 'unauthenticated',
      message: 'Authentication required.',
    };
  }

  if (error instanceof DataPermissionError) {
    return {
      status: 503,
      code: 'data_permission',
      message:
        'Curavon cannot reach your Supabase tables yet. Run migration 20250618100004_curavon_table_grants.sql (or supabase db push), then try again.',
    };
  }

  if (error instanceof DataUnavailableError) {
    return {
      status: 503,
      code: 'data_unavailable',
      message: 'Your health data is temporarily unavailable. Try again soon.',
    };
  }

  return {
    status: 503,
    code: 'data_unavailable',
    message: 'Your health data is temporarily unavailable. Try again soon.',
  };
}
