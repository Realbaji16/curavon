// Legacy next-action path. Do not use for new generation. Route through Plan Engine v2 via nextActionAdapter.
import type { RedFlagLog } from '../types/doctorSummary';
import type { NextActionState } from '../types/health';
import type { HealthSnapshot } from '../types/healthSnapshot';
import type { ActionEnginePrimaryAction } from './actionEngineV2';
import { generateNextBestPlanActionSync } from '../lib/plan/planEngineV2';
import { collectOrchestratorExecution, collectSafetyEvent, runMetaSystemCycle } from './metaSystem';
import { CALM_URGENT_BODY, CALM_URGENT_TITLE, detectUrgentConcern } from './healthSafety';
import { loadHealthSnapshot } from './healthSnapshot';
import { safeRead } from './healthStorage';
import { APP_STORAGE_KEYS } from '../lib/data/storageKeys';

const RED_FLAG_LOGS_KEY = APP_STORAGE_KEYS.redFlagLogs;
const NEXT_ACTION_KEY = APP_STORAGE_KEYS.nextActionState;

type ContextType = 'new_concern' | 'follow_up' | 'blocked_action' | 'routine_check_in';
type FollowUpOutcome = 'done' | 'blocked' | 'worse' | 'continue';

export interface OrchestratorConversationState {
  lastAction?: NextActionState | null;
  followUpState?: FollowUpOutcome;
  priorBlockers?: string[];
}

export interface OrchestratorRunInput {
  userMessage?: string;
  currentConversationState?: OrchestratorConversationState;
  curavonHealthSnapshot?: HealthSnapshot | null;
  curavonMemory?: {
    lastAction?: NextActionState | null;
    priorBlockers?: string[];
  } | null;
  curavonRedFlagLogs?: RedFlagLog[] | null;
}

export interface OrchestratorRunOutput {
  stage: 'safety_override' | ContextType | 'fallback';
  safetyLevel: 'normal' | 'caution' | 'urgent';
  action: ActionEnginePrimaryAction;
  reasoning: string;
  memoryUsed: string[];
  metaLogged: boolean;
  nextStep: string;
  followUpPrompt?: string;
  watchFor?: string;
  sourceSignals?: string[];
  aiReasoned?: boolean;
  fallbackUsed?: boolean;
  selectedBy?: 'ai' | 'rules';
}

function inLastDays(iso: string, days: number): boolean {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return false;
  return Date.now() - time <= days * 24 * 60 * 60 * 1000;
}

function classifyContext(message: string, state?: OrchestratorConversationState): ContextType {
  const lower = message.toLowerCase();
  if (state?.followUpState) return 'follow_up';
  if (/\bblocked|can't|cannot|stuck|hard to\b/.test(lower)) return 'blocked_action';
  if (/\bcheck[- ]?in|routine|daily\b/.test(lower)) return 'routine_check_in';
  if (/\bdone|better|worse|adjust\b/.test(lower)) return 'follow_up';
  return 'new_concern';
}

function resolveFollowUp(message: string, state?: OrchestratorConversationState): FollowUpOutcome {
  if (state?.followUpState) return state.followUpState;
  const lower = message.toLowerCase();
  if (/\bdone|completed|finished\b/.test(lower)) return 'done';
  if (/\bblocked|can't|cannot|stuck\b/.test(lower)) return 'blocked';
  if (/\bworse|worsened|getting worse\b/.test(lower)) return 'worse';
  return 'continue';
}

function fallbackAction(): ActionEnginePrimaryAction {
  return {
    title: 'Keep today simple',
    action: 'Take one gentle stabilizing step now: hydrate, pause briefly, and write one short note.',
    reason: 'Fallback action used to keep support safe and stable.',
    category: 'stabilize',
    safetyLevel: 'normal',
    relatedGuide: 'Tiny Grounding Steps',
  };
}

function relatedGuideFlowId(relatedGuide?: string): NextActionState['relatedGuideFlowId'] {
  const guide = (relatedGuide ?? '').toLowerCase();
  if (guide.includes('doctor')) return 'doctor-visit-prep';
  if (guide.includes('sleep') || guide.includes('mood')) return 'mood-stress-checkin';
  if (guide.includes('stomach')) return 'stomach-pain';
  if (guide.includes('headache')) return 'headache';
  return 'something-feels-off';
}

export function toNextActionStateFromOrchestrator(output: OrchestratorRunOutput): NextActionState {
  return {
    currentAction: output.action.action,
    title: output.action.title,
    reason: output.action.reason,
    source: "Today's Check-In",
    sourceChips: ['Next Action'],
    effort: 'very_low',
    category: output.action.category,
    relatedGuide: output.action.relatedGuide,
    relatedGuideFlowId: relatedGuideFlowId(output.action.relatedGuide),
    safetyLevel: output.action.safetyLevel,
    watchFor: output.watchFor,
    followUpPrompt: output.followUpPrompt,
    aiReasoned: output.aiReasoned,
    fallbackUsed: output.fallbackUsed,
    selectedBy: output.selectedBy,
    sourceSignals: output.sourceSignals ?? [],
    actionId: `orch-v2-${output.action.category}`,
    status: 'pending',
    updatedAt: new Date().toISOString(),
  };
}

export function runCuravonOrchestratorV2(
  input: OrchestratorRunInput,
  options?: { logMeta?: boolean },
): OrchestratorRunOutput {
  const logMeta = options?.logMeta ?? false;
  try {
    const userMessage = input.userMessage?.trim() ?? '';
    const snapshot = input.curavonHealthSnapshot ?? loadHealthSnapshot();
    const redFlagLogs = input.curavonRedFlagLogs ?? safeRead<RedFlagLog[]>(RED_FLAG_LOGS_KEY, []);
    const lastAction =
      input.currentConversationState?.lastAction ??
      input.curavonMemory?.lastAction ??
      safeRead<NextActionState | null>(NEXT_ACTION_KEY, null);
    const priorBlockers = input.currentConversationState?.priorBlockers ?? input.curavonMemory?.priorBlockers ?? [];

    const memoryUsed: string[] = [APP_STORAGE_KEYS.healthSnapshot];
    if (lastAction) memoryUsed.push(APP_STORAGE_KEYS.nextActionState);
    if (priorBlockers.length > 0) memoryUsed.push('prior_blockers');
    if (redFlagLogs.length > 0) memoryUsed.push(APP_STORAGE_KEYS.redFlagLogs);

    const safetySignals = [
      userMessage,
      ...redFlagLogs.slice(0, 3).map((log) => log.matchedConcern),
      ...snapshot.activeConcerns.repeatingSymptoms.slice(0, 2),
    ].filter(Boolean);
    const urgent = detectUrgentConcern(safetySignals);
    const recentRedFlag = snapshot.riskSignals.repeatedRedFlags || redFlagLogs.some((log) => inLastDays(log.createdAt, 7));

    if (urgent.hasUrgent || recentRedFlag) {
      const safetyAction: ActionEnginePrimaryAction = {
        title: urgent.hasUrgent ? urgent.title : CALM_URGENT_TITLE,
        action: urgent.hasUrgent ? urgent.body : CALM_URGENT_BODY,
        reason: 'Safety override activated before other agents.',
        category: 'escalate',
        safetyLevel: 'urgent',
        relatedGuide: 'Doctor Visit Prep',
      };
      if (logMeta) {
        collectSafetyEvent({
          source: 'Orchestrator',
          eventType: 'escalation',
          severity: 'high',
          signal: urgent.matches[0] ?? 'recent-red-flag-pattern',
        });
        collectOrchestratorExecution({
          stage: 'safety_override',
          safetyLevel: 'urgent',
          decisionOutcome: 'safety_only',
          actionCategory: safetyAction.category,
          memoryUsed,
        });
        runMetaSystemCycle();
      }
      return {
        stage: 'safety_override',
        safetyLevel: 'urgent',
        action: safetyAction,
        reasoning: 'Safety Agent ran first and stopped downstream execution.',
        memoryUsed,
        metaLogged: logMeta,
        nextStep: 'safety_override',
        followUpPrompt: 'Do you need help preparing a clinician summary right now?',
        watchFor: 'Severe, sudden, or unsafe symptom changes.',
        sourceSignals: ['recent_red_flag'],
        aiReasoned: false,
        fallbackUsed: false,
        selectedBy: 'rules',
      };
    }

    const stage = classifyContext(userMessage, input.currentConversationState);
    const followUp = resolveFollowUp(userMessage, input.currentConversationState);
    const planResult = generateNextBestPlanActionSync({
      snapshot,
      nextActionState: lastAction,
      redFlagLogs,
      profile: null,
      currentConcern: userMessage,
    });
    let action: ActionEnginePrimaryAction = {
      title: planResult.action.title,
      action: planResult.action.actionText,
      reason: planResult.action.reason,
      category: planResult.action.category,
      safetyLevel: planResult.action.safetyLevel,
      relatedGuide: planResult.action.relatedGuide,
    };
    let nextStep = 'proceed';
    let reasoning = `Context classified as ${stage}.`;

    if (followUp === 'done') {
      reasoning = `${reasoning} Follow-up state is done, so reinforce progress.`;
      nextStep = 'reinforce';
    } else if (followUp === 'blocked') {
      action = {
        title: 'Make the next step easier',
        action: 'Reduce your step to a 2-minute version and note one blocker before retrying.',
        reason: 'Follow-up reported a blocked action, so friction reduction is prioritized.',
        category: 'reduce_friction',
        safetyLevel: 'normal',
        relatedGuide: 'Tiny Grounding Steps',
      };
      nextStep = 'adjust';
    } else if (followUp === 'worse') {
      action = {
        title: CALM_URGENT_TITLE,
        action: CALM_URGENT_BODY,
        reason: 'Follow-up indicates worsening, so escalation support is prioritized.',
        category: 'escalate',
        safetyLevel: 'caution',
        relatedGuide: 'Doctor Visit Prep',
      };
      nextStep = 'escalate';
    }

    if (logMeta) {
      collectOrchestratorExecution({
        stage,
        safetyLevel: action.safetyLevel,
        decisionOutcome: nextStep,
        actionCategory: action.category,
        memoryUsed,
      });
      runMetaSystemCycle();
    }

    return {
      stage,
      safetyLevel: action.safetyLevel,
      action,
      reasoning,
      memoryUsed,
      metaLogged: logMeta,
      nextStep,
      followUpPrompt: planResult.action.followUpPrompt,
      watchFor: planResult.action.watchFor,
      sourceSignals: planResult.action.sourceSignals,
      aiReasoned: planResult.action.aiReasoned,
      fallbackUsed: planResult.action.fallbackUsed,
      selectedBy: planResult.action.selectedBy,
    };
  } catch {
    const fallback = fallbackAction();
    if (options?.logMeta) {
      collectOrchestratorExecution({
        stage: 'fallback',
        safetyLevel: fallback.safetyLevel,
        decisionOutcome: 'fallback_safe_action',
        actionCategory: fallback.category,
        memoryUsed: ['fallback'],
      });
      runMetaSystemCycle();
    }
    return {
      stage: 'fallback',
      safetyLevel: fallback.safetyLevel,
      action: fallback,
      reasoning: 'A fallback safe action was returned after an internal orchestration failure.',
      memoryUsed: ['fallback'],
      metaLogged: Boolean(options?.logMeta),
      nextStep: 'fallback_safe_action',
      followUpPrompt: 'How did this step go: done, blocked, or adjust?',
      watchFor: 'Any noticeable change in how you feel.',
      sourceSignals: [],
      aiReasoned: false,
      fallbackUsed: true,
      selectedBy: 'rules',
    };
  }
}
