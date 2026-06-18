/**
 * @deprecated Legacy AI path. Do not import for active features. Use runAIOrchestrator.
 */
import type { HealthSnapshot } from '../../types/healthSnapshot';
import type { BuiltSummaryDocument } from '../../utils/doctorSummaryItems';
import { safeRead, safeWrite } from '../../utils/healthStorage';
import type { AIRequest } from './aiTypes';
import { runGuardedAI } from './guardedAI';

function baseAIRequest(task: AIRequest['task'], userInput: string, context?: Record<string, unknown>): AIRequest {
  return {
    task,
    userInput,
    context,
    safetyLevel: 'normal',
    allowedOutput: [
      'this may be worth tracking',
      'consider speaking with a clinician',
      'one safe next step is',
      'this does not diagnose',
      'if symptoms are severe, sudden, or unsafe, seek urgent care',
    ],
    blockedOutput: [
      'you have',
      'diagnosis',
      'prescription',
      'dosage',
      'start medication',
      'stop medication',
      'treatment plan',
      'lab confirms',
    ],
  };
}

export async function maybeEnhanceAskIntake(
  concern: string,
  context: { concernType?: string; timeline?: string } = {},
): Promise<{ concernSummary: string; missingQuestions: string[]; fallbackUsed: boolean }> {
  const response = await runGuardedAI(baseAIRequest('intake_summary', concern, context));
  const lines = response.text.split('\n').map((line) => line.trim()).filter(Boolean);
  const concernSummary =
    lines.find((line) => line.toLowerCase().startsWith('concern summary:'))?.replace(/concern summary:\s*/i, '') ||
    concern;
  const missingQuestions = lines
    .filter((line) => /^\d+\)/.test(line))
    .map((line) => line.replace(/^\d+\)\s*/, ''))
    .slice(0, 2);
  return {
    concernSummary,
    missingQuestions,
    fallbackUsed: response.fallbackUsed,
  };
}

export async function maybeRefineNextActionReason(
  action: string,
  reason: string,
  context: Record<string, unknown> = {},
): Promise<{ reasonText: string; fallbackUsed: boolean }> {
  const response = await runGuardedAI(
    baseAIRequest('next_action_draft', `${action}\n${reason}`, {
      ...context,
      action,
      reason,
    }),
  );
  const refined =
    response.text.split('\n').find((line) => line.toLowerCase().includes('refined reason:'))?.replace(/refined reason:\s*/i, '') ||
    reason;
  return {
    reasonText: refined || reason,
    fallbackUsed: response.fallbackUsed,
  };
}

const AI_REASON_CACHE_KEY = 'curavon_ai_reason_cache';

type ReasonCache = Record<string, { reason: string; updatedAt: string }>;

function loadReasonCache(): ReasonCache {
  return safeRead<ReasonCache>(AI_REASON_CACHE_KEY, {});
}

export function getCachedNextActionReason(cacheKey: string, fallbackReason: string): string {
  const entry = loadReasonCache()[cacheKey];
  return entry?.reason?.trim() || fallbackReason;
}

export function queueNextActionReasonRefine(
  cacheKey: string,
  action: string,
  reason: string,
  context: Record<string, unknown> = {},
) {
  void maybeRefineNextActionReason(action, reason, context).then((result) => {
    const next = loadReasonCache();
    next[cacheKey] = {
      reason: result.reasonText || reason,
      updatedAt: new Date().toISOString(),
    };
    safeWrite(AI_REASON_CACHE_KEY, next);
  });
}

export async function maybeDraftDoctorSummary(
  doc: BuiltSummaryDocument,
): Promise<{ draftText: string; fallbackUsed: boolean }> {
  const response = await runGuardedAI(
    baseAIRequest('doctor_summary_draft', doc.fullText, {
      title: doc.title,
      sectionCount: doc.sections.length,
    }),
  );
  return {
    draftText: response.text || doc.fullText,
    fallbackUsed: response.fallbackUsed,
  };
}

export async function maybeCompressSnapshot(
  snapshot: HealthSnapshot,
): Promise<{ compressedSummary: string; fallbackUsed: boolean }> {
  const response = await runGuardedAI(
    baseAIRequest('memory_snapshot', snapshot.trendSummary, {
      currentState: snapshot.currentState,
      concerns: snapshot.activeConcerns,
      focus: snapshot.recommendedFocusArea,
    }),
  );
  return {
    compressedSummary: response.text || snapshot.trendSummary,
    fallbackUsed: response.fallbackUsed,
  };
}

export async function maybeSuggestRelatedGuide(
  userInput: string,
  context: Record<string, unknown> = {},
): Promise<{ suggestion: string; fallbackUsed: boolean }> {
  const response = await runGuardedAI(baseAIRequest('guide_recommendation', userInput, context));
  return {
    suggestion: response.text,
    fallbackUsed: response.fallbackUsed,
  };
}
