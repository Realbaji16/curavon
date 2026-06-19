import { APP_STORAGE_KEYS } from '../../data/storageKeys';
import { safeRead, safeWrite } from '../../../utils/healthStorage';
import type { AIAllowedTask } from './aiPolicyTypes';

export const MAX_AI_CALLS_PER_SESSION = 2;
export const MAX_AI_CALLS_PER_REQUEST = 1;
export const MAX_AI_CALLS_PER_DAY_LOCAL = 10;
export const MAX_TOKENS_INTAKE = 350;
export const MAX_TOKENS_NEXT_ACTION = 350;
export const MAX_TOKENS_DOCTOR_SUMMARY = 700;
export const MAX_TOKENS_MEMORY = 450;
export const MAX_TOKENS_FOLLOWUP = 250;

type AIBudgetState = {
  dateKey: string;
  dailyCallCount: number;
  sessionCallCount: number;
  taskCalls: Partial<Record<AIAllowedTask, number>>;
};

const DEFAULT_BUDGET_STATE = (): AIBudgetState => ({
  dateKey: new Date().toISOString().slice(0, 10),
  dailyCallCount: 0,
  sessionCallCount: 0,
  taskCalls: {},
});

function readBudget(): AIBudgetState {
  const state = safeRead<AIBudgetState>(APP_STORAGE_KEYS.aiBudgetState, DEFAULT_BUDGET_STATE());
  const today = new Date().toISOString().slice(0, 10);
  if (state.dateKey !== today) {
    const next = { ...DEFAULT_BUDGET_STATE(), sessionCallCount: state.sessionCallCount };
    safeWrite(APP_STORAGE_KEYS.aiBudgetState, next);
    return next;
  }
  return state;
}

function writeBudget(state: AIBudgetState) {
  safeWrite(APP_STORAGE_KEYS.aiBudgetState, state);
}

export function getTaskTokenLimit(task: AIAllowedTask): number {
  if (task === 'intake_structuring') return MAX_TOKENS_INTAKE;
  if (task === 'next_action_reasoning' || task === 'next_action_synthesis') return MAX_TOKENS_NEXT_ACTION;
  if (task === 'doctor_summary') return MAX_TOKENS_DOCTOR_SUMMARY;
  if (task === 'memory_compression') return MAX_TOKENS_MEMORY;
  return MAX_TOKENS_FOLLOWUP;
}

export function estimateTokenCost(input: string): number {
  return Math.max(20, Math.min(900, Math.ceil(input.length / 4)));
}

export function canUseAI(task: AIAllowedTask): boolean {
  const state = readBudget();
  if (state.sessionCallCount >= MAX_AI_CALLS_PER_SESSION) return false;
  if (state.dailyCallCount >= MAX_AI_CALLS_PER_DAY_LOCAL) return false;
  const estimated = estimateTokenCost(task.replace(/_/g, ' '));
  return estimated <= getTaskTokenLimit(task);
}

export function incrementAICall(task: AIAllowedTask) {
  const state = readBudget();
  const next: AIBudgetState = {
    ...state,
    dailyCallCount: state.dailyCallCount + 1,
    sessionCallCount: state.sessionCallCount + 1,
    taskCalls: {
      ...state.taskCalls,
      [task]: (state.taskCalls[task] ?? 0) + 1,
    },
  };
  writeBudget(next);
}

export function getAIBudgetState() {
  return readBudget();
}

export function resetSessionBudget() {
  const state = readBudget();
  writeBudget({
    ...state,
    sessionCallCount: 0,
  });
}
