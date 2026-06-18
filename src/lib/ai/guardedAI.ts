import { getAIConfig } from './aiConfig';
import { runAIClient } from './aiClient';
import type { AIRequest, AIResponse } from './aiTypes';
import { validateAIOutput } from './guards/aiOutputValidator';
import { enforceSafeLanguage, isWithinMedicalBoundary } from './guards/aiMedicalBoundary';
import { buildIntakePrompt } from './prompts/intakePrompt';
import { buildMemoryPrompt } from './prompts/memoryPrompt';
import { buildPlanPrompt } from './prompts/planPrompt';
import { buildSummaryPrompt } from './prompts/summaryPrompt';

function fallbackTextForTask(task: AIRequest['task']): string {
  switch (task) {
    case 'intake_summary':
      return 'Concern summary: Keep this concern short and specific. Missing question: when did this start? This does not diagnose.';
    case 'next_action_draft':
      return 'One safe next step is to choose a simple, low-effort action and monitor how you feel. This does not diagnose.';
    case 'doctor_summary_draft':
      return 'Doctor-ready draft: organize recent symptoms, timing, what changed, and your top question. Not a diagnosis.';
    case 'memory_snapshot':
      return 'Recent pattern summary: note recurring symptoms, stress/energy changes, and blockers. This does not diagnose.';
    case 'guide_recommendation':
      return 'A related guide may help organize your next step without replacing clinician care. This does not diagnose.';
    default:
      return 'Safe fallback response. This does not diagnose.';
  }
}

function buildTaskPrompt(request: AIRequest): string {
  switch (request.task) {
    case 'intake_summary':
      return buildIntakePrompt(request.userInput, request.context);
    case 'next_action_draft':
      return buildPlanPrompt(request.userInput, request.context);
    case 'doctor_summary_draft':
      return buildSummaryPrompt(request.userInput, request.context);
    case 'memory_snapshot':
      return buildMemoryPrompt(request.userInput, request.context);
    case 'guide_recommendation':
      return buildPlanPrompt(request.userInput, request.context);
    default:
      return request.userInput;
  }
}

function buildFallbackResponse(request: AIRequest, warning: string): AIResponse {
  return {
    success: true,
    text: fallbackTextForTask(request.task),
    structuredData: {},
    warnings: [warning],
    fallbackUsed: true,
  };
}

export async function runGuardedAI(request: AIRequest): Promise<AIResponse> {
  const config = getAIConfig();
  if (!config.enabled || !config.apiKey) {
    const fallback = buildFallbackResponse(request, 'AI disabled or API key missing.');
    console.info(`[Curavon AI] enabled: false fallback: true task: ${request.task}`);
    return fallback;
  }

  const prompt = buildTaskPrompt(request);
  const preflight = isWithinMedicalBoundary(prompt);
  if (!preflight) {
    const fallback = buildFallbackResponse(request, 'Blocked by pre-output medical boundary rules.');
    console.info(`[Curavon AI] enabled: true fallback: true task: ${request.task}`);
    return fallback;
  }

  const ai = await runAIClient({
    model: config.model,
    systemPrompt:
      'You are Curavon AI. You are safety-controlled. Never diagnose, prescribe, or replace clinicians. Keep output concise and safe.',
    prompt,
  });

  if (!ai.success || !ai.text) {
    const fallback = buildFallbackResponse(request, ai.warnings.join(' ') || 'AI client failed.');
    console.info(`[Curavon AI] enabled: true fallback: true task: ${request.task}`);
    return fallback;
  }

  const candidate: AIResponse = {
    success: true,
    text: ai.text,
    structuredData: {},
    warnings: ai.warnings,
    fallbackUsed: false,
  };
  const validation = validateAIOutput(request, candidate);
  if (!validation.valid) {
    const fallback = buildFallbackResponse(
      request,
      `AI output rejected by validator. ${validation.warnings.join(' ')}`,
    );
    console.info(`[Curavon AI] enabled: true fallback: true task: ${request.task}`);
    return fallback;
  }

  const safeText = enforceSafeLanguage(candidate.text);
  const response: AIResponse = {
    ...candidate,
    text: safeText,
    warnings: validation.warnings,
  };
  console.info(`[Curavon AI] enabled: true fallback: false task: ${request.task}`);
  return response;
}
