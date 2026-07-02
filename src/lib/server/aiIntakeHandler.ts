import type { AIIntakeResponse } from './aiIntakeTypes';
import { runHealthIntelligencePipeline } from '../health-intelligence/services/healthIntelligencePipeline';
import { trackSafeEvent } from '../observability/safeAnalytics';
import {
  assessIntakeSafety,
  buildIntakeResultFromIntelligence,
  buildIntakeSafetyFromIntelligence,
  defaultSafetyForError,
  parseIntakeRequestBody,
  requireAuthenticatedSupabaseUser,
} from './aiRouteGuards';

function intakeErrorResponse(
  status: number,
  code: string,
  message: string,
  safety = defaultSafetyForError(),
): { status: number; body: AIIntakeResponse } {
  return {
    status,
    body: {
      ok: false,
      mode: 'intake',
      safety,
      error: { code, message },
    },
  };
}

/** Server-side AI intake handler — deterministic Phase 1 health intelligence pipeline. */
export async function handleAIIntakePost(request: Request): Promise<{
  status: number;
  body: AIIntakeResponse;
}> {
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return intakeErrorResponse(auth.status, auth.code, auth.message);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return intakeErrorResponse(400, 'invalid_json', 'Request body must be valid JSON.');
  }

  const body = parseIntakeRequestBody(parsedBody);
  if (!body.ok) {
    return intakeErrorResponse(body.status, body.code, body.message);
  }

  const safety = assessIntakeSafety(body.input);
  if (!safety.allowed) {
    trackSafeEvent('ai_route_blocked', {
      route_name: 'ai_intake',
      error_code: 'safety_blocked',
      safety_flag: true,
      risk_level: safety.riskLevel ?? 'urgent',
    });
    trackSafeEvent('unsafe_response_blocked', {
      route_name: 'ai_intake',
      error_code: 'safety_blocked',
      safety_flag: true,
      risk_level: safety.riskLevel ?? 'urgent',
    });
    return {
      status: 422,
      body: {
        ok: false,
        mode: 'intake',
        safety,
        error: {
          code: 'safety_blocked',
          message:
            'This concern may need urgent support. Use local emergency services or a clinician now.',
        },
      },
    };
  }

  const intelligence = runHealthIntelligencePipeline({
    rawText: body.input,
    context: body.context,
  });
  const result = buildIntakeResultFromIntelligence(intelligence);
  const responseSafety = buildIntakeSafetyFromIntelligence(intelligence);

  trackSafeEvent('ai_route_called', {
    route_name: 'ai_intake',
    status: 'completed',
    safety_flag: !responseSafety.allowed,
    risk_level: responseSafety.riskLevel ?? 'low',
  });

  return {
    status: 200,
    body: {
      ok: true,
      mode: 'intake',
      safety: responseSafety,
      result,
    },
  };
}
