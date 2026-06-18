import { runAIKernel } from '../aiKernel';
import type { AIKernelRequest, AIKernelResponse } from '../aiTypes';
import { getAIConfig } from '../aiConfig';
import {
  createRequestCacheKey,
  exceededSessionLimit,
  isDuplicateBlockedRequest,
  isRuleBasedEnough,
  shouldBlockBySafety,
  validateOrchestratorOutput,
  MAX_AI_CALLS_PER_REQUEST,
} from './orchestratorGuards';
import { logOrchestratorEvent } from './orchestratorLogger';
import { routeAIRequest } from './orchestratorRouter';
import {
  addBlockedRequest,
  getCachedRequest,
  incrementAIUsage,
  incrementFallbackUsage,
  setCachedRequest,
} from './orchestratorState';
import { evaluateAIPolicy } from '../governance/aiPolicy';
import { canUseAI, estimateTokenCost, incrementAICall } from '../governance/aiBudget';
import {
  getAIState,
  recordAIAllowed,
  recordAIBlocked,
  recordFallback,
  recordSafetyOverride,
  updateAIState,
} from '../governance/aiPolicyState';
import { recordAIDecisionTrace } from '../governance/aiDecisionTrace';
import { refreshAIObservabilitySummary } from '../governance/aiObservability';
import type {
  AIRequest,
  AIResponse,
  AIStage,
  OrchestratorDecision,
} from './orchestratorTypes';
import type { AIAllowedTask, AIBlockReason } from '../governance/aiPolicyTypes';

function fallbackResultForStage(stage: AIStage, userInput: string): Record<string, unknown> {
  if (stage === 'intake') {
    return {
      refinedConcern: userInput,
      missingQuestions: [],
      severityGuess: 'unknown',
      tags: [],
      fallbackUsed: true,
    };
  }
  if (stage === 'plan_reasoning') {
    return {
      selectedCandidateId: '',
      reasoning: 'Rule-based selection used by orchestrator policy.',
      whyNotOthers: 'AI call skipped by policy.',
      confidence: 'medium',
      fallbackUsed: true,
    };
  }
  if (stage === 'summary_generation') {
    return {
      summaryTitle: 'Curavon Summary',
      mainConcerns: [],
      symptomTimeline: [],
      recentPatterns: [],
      actionsTried: [],
      questionsForClinician: [],
      redFlagNotes: [],
      medicationNotes: [],
      userGoals: [],
      footer: 'This summary is generated from user-provided notes and is not a diagnosis.',
      fallbackUsed: true,
    };
  }
  return {
    refinedConcern: userInput,
    missingQuestions: [],
    severityGuess: 'unknown',
    tags: [],
    fallbackUsed: true,
  };
}

function mapStageToKernelTask(stage: AIStage): AIKernelRequest['task'] | null {
  if (stage === 'intake') return 'intake';
  if (stage === 'plan_reasoning') return 'next_action_reasoning';
  if (stage === 'summary_generation') return 'doctor_summary';
  if (stage === 'followup_analysis') return null;
  return null;
}

function mapStageToGovernanceTask(stage: AIStage): AIAllowedTask | null {
  if (stage === 'intake') return 'intake_structuring';
  if (stage === 'plan_reasoning') return 'next_action_reasoning';
  if (stage === 'summary_generation') return 'doctor_summary';
  if (stage === 'followup_analysis') return 'followup_note_summary';
  if (stage === 'plan_generation') return 'memory_compression';
  return null;
}

function buildDecision(input: {
  allowAI: boolean;
  reason: string;
  selectedModule: OrchestratorDecision['selectedModule'];
  blockedReason?: string;
  cachedResult?: Record<string, unknown>;
}): OrchestratorDecision {
  return {
    allowAI: input.allowAI,
    selectedModule: input.selectedModule,
    reason: input.reason,
    blockedReason: input.blockedReason,
    cachedResult: input.cachedResult,
    estimatedCostImpact: input.allowAI ? 'low' : 'none',
  };
}

export async function runAIOrchestrator(request: AIRequest): Promise<AIResponse> {
  const route = routeAIRequest(request);
  const cacheKey = createRequestCacheKey(request, route.stage);
  const requestId = `orch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const estimatedTokens = estimateTokenCost(request.userInput);
  const governanceTask = mapStageToGovernanceTask(route.stage);
  const consentCompleted =
    Boolean(request.contextSnapshot?.consentCompleted) || request.source === 'doctor_summary';
  const hasApiKey = Boolean(getAIConfig().enabled);
  updateAIState({ apiKeyPresent: hasApiKey, aiEnabled: hasApiKey });

  const safetyBlock = shouldBlockBySafety(request);
  if (safetyBlock.blocked) {
    addBlockedRequest(cacheKey);
    const decision = buildDecision({
      allowAI: false,
      reason: 'Safety-first policy blocked AI.',
      selectedModule: 'none',
      blockedReason: safetyBlock.reason,
    });
    const fallback = fallbackResultForStage(route.stage, request.userInput);
    const blockReason = 'urgent_safety' as AIBlockReason;
    recordAIBlocked(blockReason, request.source);
    recordSafetyOverride(request.source);
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: request.source,
      task: governanceTask ?? 'unknown',
      requestedStage: route.stage,
      allowed: false,
      blockReason,
      moduleSelected: decision.selectedModule,
      safetyLevel: request.safetyLevel,
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: false,
      estimatedTokens,
      contextType: 'compressed',
      reason: decision.reason,
    });
    refreshAIObservabilitySummary();
    logOrchestratorEvent({
      timestamp: new Date().toISOString(),
      source: request.source,
      stage: route.stage,
      aiUsed: false,
      moduleSelected: decision.selectedModule,
      reason: decision.reason,
      cache: 'miss',
      fallbackUsed: true,
    });
    incrementFallbackUsage();
    if (governanceTask) recordFallback(governanceTask, request.source);
    return {
      result: fallback,
      moduleUsed: 'none',
      cached: false,
      blockedBySafety: true,
      fallbackUsed: true,
    };
  }

  const cached = getCachedRequest(cacheKey);
  if (cached) {
    const decision = buildDecision({
      allowAI: false,
      reason: 'Cache hit.',
      selectedModule: 'none',
      cachedResult: cached,
    });
    recordAIBlocked('cache_available', request.source);
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: request.source,
      task: governanceTask ?? 'unknown',
      requestedStage: route.stage,
      allowed: false,
      blockReason: 'cache_available',
      moduleSelected: decision.selectedModule,
      safetyLevel: request.safetyLevel,
      cacheHit: true,
      fallbackUsed: Boolean((cached as { fallbackUsed?: boolean }).fallbackUsed),
      aiUsed: false,
      estimatedTokens: 0,
      contextType: 'compressed',
      reason: decision.reason,
    });
    refreshAIObservabilitySummary();
    logOrchestratorEvent({
      timestamp: new Date().toISOString(),
      source: request.source,
      stage: route.stage,
      aiUsed: false,
      moduleSelected: decision.selectedModule,
      reason: decision.reason,
      cache: 'hit',
      fallbackUsed: false,
    });
    return {
      result: cached,
      moduleUsed: 'none',
      cached: true,
      blockedBySafety: false,
      fallbackUsed: Boolean((cached as { fallbackUsed?: boolean }).fallbackUsed),
    };
  }

  if (isRuleBasedEnough(route.stage, request)) {
    const decision = buildDecision({
      allowAI: false,
      reason: 'Rule-based path is sufficient.',
      selectedModule: 'none',
      blockedReason: 'rule_based_sufficient',
    });
    const fallback = fallbackResultForStage(route.stage, request.userInput);
    setCachedRequest(cacheKey, fallback);
    incrementFallbackUsage();
    recordAIBlocked('rule_based_sufficient', request.source);
    if (governanceTask) recordFallback(governanceTask, request.source);
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: request.source,
      task: governanceTask ?? 'unknown',
      requestedStage: route.stage,
      allowed: false,
      blockReason: 'rule_based_sufficient',
      moduleSelected: decision.selectedModule,
      safetyLevel: request.safetyLevel,
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: false,
      estimatedTokens,
      contextType: 'compressed',
      reason: decision.reason,
    });
    refreshAIObservabilitySummary();
    logOrchestratorEvent({
      timestamp: new Date().toISOString(),
      source: request.source,
      stage: route.stage,
      aiUsed: false,
      moduleSelected: decision.selectedModule,
      reason: decision.reason,
      cache: 'miss',
      fallbackUsed: true,
    });
    return {
      result: fallback,
      moduleUsed: 'none',
      cached: false,
      blockedBySafety: false,
      fallbackUsed: true,
    };
  }

  if (exceededSessionLimit() || isDuplicateBlockedRequest(cacheKey)) {
    addBlockedRequest(cacheKey);
    const decision = buildDecision({
      allowAI: false,
      reason: 'Session AI limit reached or duplicate blocked request.',
      selectedModule: 'none',
      blockedReason: exceededSessionLimit() ? 'session_limit' : 'duplicate_blocked_request',
    });
    const fallback = fallbackResultForStage(route.stage, request.userInput);
    setCachedRequest(cacheKey, fallback);
    incrementFallbackUsage();
    const blockReason = exceededSessionLimit() ? 'session_limit_reached' : 'duplicate_request';
    recordAIBlocked(blockReason, request.source);
    if (governanceTask) recordFallback(governanceTask, request.source);
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: request.source,
      task: governanceTask ?? 'unknown',
      requestedStage: route.stage,
      allowed: false,
      blockReason,
      moduleSelected: decision.selectedModule,
      safetyLevel: request.safetyLevel,
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: false,
      estimatedTokens,
      contextType: 'compressed',
      reason: decision.reason,
    });
    refreshAIObservabilitySummary();
    logOrchestratorEvent({
      timestamp: new Date().toISOString(),
      source: request.source,
      stage: route.stage,
      aiUsed: false,
      moduleSelected: decision.selectedModule,
      reason: decision.reason,
      cache: 'miss',
      fallbackUsed: true,
    });
    return {
      result: fallback,
      moduleUsed: 'none',
      cached: false,
      blockedBySafety: false,
      fallbackUsed: true,
    };
  }

  if (MAX_AI_CALLS_PER_REQUEST < 1) {
    const fallback = fallbackResultForStage(route.stage, request.userInput);
    recordAIBlocked('request_limit_reached', request.source);
    if (governanceTask) recordFallback(governanceTask, request.source);
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: request.source,
      task: governanceTask ?? 'unknown',
      requestedStage: route.stage,
      allowed: false,
      blockReason: 'request_limit_reached',
      moduleSelected: 'none',
      safetyLevel: request.safetyLevel,
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: false,
      estimatedTokens,
      contextType: 'compressed',
      reason: 'Request AI usage limit reached.',
    });
    refreshAIObservabilitySummary();
    return {
      result: fallback,
      moduleUsed: 'none',
      cached: false,
      blockedBySafety: false,
      fallbackUsed: true,
    };
  }

  const task = mapStageToKernelTask(route.stage);
  if (!task) {
    const fallback = fallbackResultForStage(route.stage, request.userInput);
    setCachedRequest(cacheKey, fallback);
    incrementFallbackUsage();
    recordAIBlocked('rule_based_sufficient', request.source);
    if (governanceTask) recordFallback(governanceTask, request.source);
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: request.source,
      task: governanceTask ?? 'unknown',
      requestedStage: route.stage,
      allowed: false,
      blockReason: 'rule_based_sufficient',
      moduleSelected: 'none',
      safetyLevel: request.safetyLevel,
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: false,
      estimatedTokens,
      contextType: 'compressed',
      reason: 'No AI module mapped for stage.',
    });
    refreshAIObservabilitySummary();
    logOrchestratorEvent({
      timestamp: new Date().toISOString(),
      source: request.source,
      stage: route.stage,
      aiUsed: false,
      moduleSelected: 'none',
      reason: 'No AI module mapped for stage.',
      cache: 'miss',
      fallbackUsed: true,
    });
    return {
      result: fallback,
      moduleUsed: 'none',
      cached: false,
      blockedBySafety: false,
      fallbackUsed: true,
    };
  }

  const policyDecision =
    governanceTask &&
    evaluateAIPolicy({
      task: governanceTask,
      source: request.source,
      safetyLevel: request.safetyLevel,
      userInputSummary: request.userInput.slice(0, 200),
      compressedContext: {
        ...request.contextSnapshot,
        compressedContextOnly: true,
      },
      sessionState: {
        sessionAIUsageCount: getAIState().sessionCallCount,
        requestAIUsageCount: 0,
      },
      cacheStatus: { hasCached: Boolean(cached) },
      hasApiKey,
      candidateCount: Number(request.contextSnapshot?.candidateCount ?? 0),
      userConsentState: { consentCompleted },
    });
  const budgetAllowed = governanceTask ? canUseAI(governanceTask) : false;

  if (!policyDecision || !policyDecision.allowed || !budgetAllowed) {
    const fallback = fallbackResultForStage(route.stage, request.userInput);
    const blockReason =
      policyDecision?.blockReason ??
      (budgetAllowed ? 'invalid_context' : 'session_limit_reached');
    recordAIBlocked(blockReason, request.source);
    if (governanceTask) recordFallback(governanceTask, request.source);
    setCachedRequest(cacheKey, fallback);
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: request.source,
      task: governanceTask ?? 'unknown',
      requestedStage: route.stage,
      allowed: false,
      blockReason,
      moduleSelected: 'none',
      safetyLevel: request.safetyLevel,
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: false,
      estimatedTokens,
      contextType: 'compressed',
      reason: policyDecision?.reason ?? 'Budget guard blocked AI call.',
    });
    refreshAIObservabilitySummary();
    return {
      result: fallback,
      moduleUsed: 'none',
      cached: false,
      blockedBySafety: false,
      fallbackUsed: true,
    };
  }

  const kernelResponse = await runAIKernel({
    task,
    input: request.userInput,
    source: request.source,
    requestId,
    policyDecisionId: `${requestId}-policy`,
    maxTokens: policyDecision.maxTokens,
    context: {
      ...(request.contextSnapshot?.kernelContext as Record<string, unknown> | undefined),
      compressedContextOnly: true,
      governance: {
        source: request.source,
        requestId,
        policyDecisionId: `${requestId}-policy`,
      },
    },
  });

  const output = kernelResponse as unknown as Record<string, unknown>;
  if (!validateOrchestratorOutput(output)) {
    const fallback = fallbackResultForStage(route.stage, request.userInput);
    setCachedRequest(cacheKey, fallback);
    incrementFallbackUsage();
    addBlockedRequest(cacheKey);
    recordAIBlocked('medical_boundary', request.source);
    if (governanceTask) recordFallback(governanceTask, request.source);
    recordAIDecisionTrace({
      id: requestId,
      timestamp: new Date().toISOString(),
      source: request.source,
      task: governanceTask ?? 'unknown',
      requestedStage: route.stage,
      allowed: true,
      blockReason: 'medical_boundary',
      moduleSelected: 'ai_kernel',
      safetyLevel: request.safetyLevel,
      cacheHit: false,
      fallbackUsed: true,
      aiUsed: true,
      estimatedTokens,
      contextType: 'compressed',
      reason: 'AI output blocked by orchestrator validation.',
    });
    refreshAIObservabilitySummary();
    logOrchestratorEvent({
      timestamp: new Date().toISOString(),
      source: request.source,
      stage: route.stage,
      aiUsed: true,
      moduleSelected: 'ai_kernel',
      reason: 'AI output blocked by orchestrator validation.',
      cache: 'miss',
      fallbackUsed: true,
    });
    return {
      result: fallback,
      moduleUsed: 'ai_kernel',
      cached: false,
      blockedBySafety: false,
      fallbackUsed: true,
    };
  }

  setCachedRequest(cacheKey, output);
  incrementAIUsage();
  if (governanceTask) {
    incrementAICall(governanceTask);
    recordAIAllowed(governanceTask, request.source);
  }
  recordAIDecisionTrace({
    id: requestId,
    timestamp: new Date().toISOString(),
    source: request.source,
    task: governanceTask ?? 'unknown',
    requestedStage: route.stage,
    allowed: true,
    moduleSelected: 'ai_kernel',
    safetyLevel: request.safetyLevel,
    cacheHit: false,
    fallbackUsed: Boolean((kernelResponse as AIKernelResponse).fallbackUsed),
    aiUsed: true,
    estimatedTokens,
    contextType: 'compressed',
    reason: 'AI allowed by governance policy and orchestrator.',
  });
  refreshAIObservabilitySummary();
  logOrchestratorEvent({
    timestamp: new Date().toISOString(),
    source: request.source,
    stage: route.stage,
    aiUsed: true,
    moduleSelected: 'ai_kernel',
    reason: 'AI allowed by orchestrator.',
    cache: 'miss',
    fallbackUsed: Boolean((kernelResponse as AIKernelResponse).fallbackUsed),
  });
  return {
    result: output,
    moduleUsed: 'ai_kernel',
    cached: false,
    blockedBySafety: false,
    fallbackUsed: Boolean((kernelResponse as AIKernelResponse).fallbackUsed),
  };
}
