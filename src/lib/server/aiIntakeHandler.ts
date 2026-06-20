import type { AIIntakeResponse } from './aiIntakeTypes';
import {
  assessIntakeSafety,
  buildMockIntakeResult,
  defaultSafetyForError,
  parseIntakeRequestBody,
  requireAuthenticatedSupabaseUser,
  resolveServerAIIntakeMode,
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

/** Server-side AI intake handler — no raw input logging, no provider calls in pilot mock mode. */
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

  const aiMode = resolveServerAIIntakeMode();
  if (aiMode === 'provider_unavailable') {
    return intakeErrorResponse(
      503,
      'ai_unavailable',
      'AI provider is temporarily unavailable.',
      safety,
    );
  }

  // Pilot: deterministic mock for mock and ready modes — live OpenAI calls deferred.
  return {
    status: 200,
    body: {
      ok: true,
      mode: 'intake',
      safety,
      result: buildMockIntakeResult(),
    },
  };
}
