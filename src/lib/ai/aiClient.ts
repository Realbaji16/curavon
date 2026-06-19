import { getAIConfig } from './aiConfig';
import type {
  AIClientRequest,
  AIClientResponse,
  AIKernelRequest,
  AIKernelResponse,
} from './aiTypes';
import { INTAKE_SYSTEM_PROMPT } from './prompts/intakePrompt';
import { buildIntakePrompt } from './prompts/intakePrompt';
import { buildPlanPrompt } from './prompts/planPrompt';
import { buildSummaryPrompt } from './prompts/summaryPrompt';

const OPENAI_CHAT_COMPLETIONS_URL = 'https://api.openai.com/v1/chat/completions';
export const KERNEL_MODEL = 'gpt-4o-mini';
export const MAX_TOKENS = 350;
export const KERNEL_TEMPERATURE = 0.3;
export const SYNTHESIS_TEMPERATURE = 0.2;

function kernelFallback(input: string): AIKernelResponse {
  return {
    refinedConcern: input,
    missingQuestions: [],
    severityGuess: 'unknown',
    tags: [],
    fallbackUsed: true,
  };
}

export async function runAIClient(request: AIClientRequest): Promise<AIClientResponse> {
  const config = getAIConfig();
  if (!config.enabled || !config.apiKey) {
    return {
      success: false,
      text: '',
      warnings: ['AI disabled or missing API key.'],
    };
  }

  try {
    // TODO: If project adds provider routing, move endpoint selection here.
    const response = await fetch(OPENAI_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        temperature: request.temperature ?? KERNEL_TEMPERATURE,
        max_tokens: request.max_tokens ?? MAX_TOKENS,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.prompt },
        ],
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        text: '',
        warnings: [`AI request failed with status ${response.status}.`],
      };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';
    return {
      success: Boolean(text),
      text,
      warnings: text ? [] : ['AI returned empty content.'],
    };
  } catch {
    return {
      success: false,
      text: '',
      warnings: ['AI network or runtime failure.'],
    };
  }
}

function parseKernelResponse(text: string, input: string): AIKernelResponse {
  try {
    const parsed = JSON.parse(text) as Partial<AIKernelResponse>;
    return {
      refinedConcern: String(parsed.refinedConcern ?? input),
      missingQuestions: Array.isArray(parsed.missingQuestions)
        ? parsed.missingQuestions.map((q) => String(q))
        : [],
      severityGuess:
        parsed.severityGuess === 'low' || parsed.severityGuess === 'medium'
          ? parsed.severityGuess
          : 'unknown',
      tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t)) : [],
      selectedCandidateId: parsed.selectedCandidateId ? String(parsed.selectedCandidateId) : undefined,
      reasoning: parsed.reasoning ? String(parsed.reasoning) : undefined,
      whyNotOthers: parsed.whyNotOthers ? String(parsed.whyNotOthers) : undefined,
      followUpPrompt: parsed.followUpPrompt ? String(parsed.followUpPrompt) : undefined,
      watchFor: parsed.watchFor ? String(parsed.watchFor) : undefined,
      confidence:
        parsed.confidence === 'low' || parsed.confidence === 'medium' || parsed.confidence === 'high'
          ? parsed.confidence
          : undefined,
      selectedMode:
        parsed.selectedMode === 'use_existing_candidate' ||
        parsed.selectedMode === 'synthesize_custom_action'
          ? parsed.selectedMode
          : undefined,
      synthesizedAction:
        parsed.synthesizedAction && typeof parsed.synthesizedAction === 'object'
          ? {
              title: parsed.synthesizedAction.title
                ? String(parsed.synthesizedAction.title)
                : undefined,
              actionText: parsed.synthesizedAction.actionText
                ? String(parsed.synthesizedAction.actionText)
                : undefined,
              reason: parsed.synthesizedAction.reason
                ? String(parsed.synthesizedAction.reason)
                : undefined,
              category: parsed.synthesizedAction.category
                ? String(parsed.synthesizedAction.category)
                : undefined,
              safetyLevel: parsed.synthesizedAction.safetyLevel
                ? String(parsed.synthesizedAction.safetyLevel)
                : undefined,
              primitiveUsed: parsed.synthesizedAction.primitiveUsed
                ? String(parsed.synthesizedAction.primitiveUsed)
                : undefined,
              followUpPrompt: parsed.synthesizedAction.followUpPrompt
                ? String(parsed.synthesizedAction.followUpPrompt)
                : undefined,
              watchFor: parsed.synthesizedAction.watchFor
                ? String(parsed.synthesizedAction.watchFor)
                : undefined,
            }
          : undefined,
      safetyNotes: parsed.safetyNotes ? String(parsed.safetyNotes) : undefined,
      summaryTitle: parsed.summaryTitle ? String(parsed.summaryTitle) : undefined,
      mainConcerns: Array.isArray(parsed.mainConcerns) ? parsed.mainConcerns.map((v) => String(v)) : undefined,
      symptomTimeline: Array.isArray(parsed.symptomTimeline) ? parsed.symptomTimeline.map((v) => String(v)) : undefined,
      recentPatterns: Array.isArray(parsed.recentPatterns) ? parsed.recentPatterns.map((v) => String(v)) : undefined,
      actionsTried: Array.isArray(parsed.actionsTried) ? parsed.actionsTried.map((v) => String(v)) : undefined,
      questionsForClinician: Array.isArray(parsed.questionsForClinician)
        ? parsed.questionsForClinician.map((v) => String(v))
        : undefined,
      redFlagNotes: Array.isArray(parsed.redFlagNotes) ? parsed.redFlagNotes.map((v) => String(v)) : undefined,
      medicationNotes: Array.isArray(parsed.medicationNotes)
        ? parsed.medicationNotes.map((v) => String(v))
        : undefined,
      userGoals: Array.isArray(parsed.userGoals) ? parsed.userGoals.map((v) => String(v)) : undefined,
      footer: parsed.footer ? String(parsed.footer) : undefined,
      fallbackUsed: false,
    };
  } catch {
    return kernelFallback(input);
  }
}

function buildKernelPrompt(request: AIKernelRequest): string {
  if (request.task === 'intake') return buildIntakePrompt(request.input, request.context);
  if (request.task === 'plan_explain') return buildPlanPrompt(request.input, request.context);
  if (request.task === 'next_action_reasoning') return request.input;
  if (request.task === 'next_action_synthesis') return request.input;
  if (request.task === 'doctor_summary') return request.input;
  return buildSummaryPrompt(request.input, request.context);
}

export async function runAIKernelClient(request: AIKernelRequest): Promise<AIKernelResponse> {
  const config = getAIConfig();
  if (!config.apiKey || !config.enabled) return kernelFallback(request.input);

  const response = await runAIClient({
    model: KERNEL_MODEL,
    systemPrompt: String(request.context?.systemPrompt ?? INTAKE_SYSTEM_PROMPT),
    prompt: buildKernelPrompt(request),
    max_tokens: request.maxTokens ?? MAX_TOKENS,
    temperature:
      request.task === 'next_action_synthesis' ? SYNTHESIS_TEMPERATURE : KERNEL_TEMPERATURE,
  });
  if (!response.success || !response.text) return kernelFallback(request.input);
  const parsed = parseKernelResponse(response.text, request.input);
  return parsed;
}
