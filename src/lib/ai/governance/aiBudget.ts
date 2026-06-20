import type { AIAllowedTask } from './aiPolicyTypes';

export const MAX_AI_CALLS_PER_SESSION = 2;
export const MAX_AI_CALLS_PER_REQUEST = 1;
export const MAX_AI_CALLS_PER_DAY_LOCAL = 10;
export const MAX_TOKENS_INTAKE = 350;
export const MAX_TOKENS_NEXT_ACTION = 350;
export const MAX_TOKENS_DOCTOR_SUMMARY = 700;
export const MAX_TOKENS_MEMORY = 450;
export const MAX_TOKENS_FOLLOWUP = 250;
export const MAX_TOKENS_ACTIVITY_INSIGHT = 350;

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

let budgetState: AIBudgetState = DEFAULT_BUDGET_STATE();

function normalizeBudgetState(state: AIBudgetState): AIBudgetState {
  const today = new Date().toISOString().slice(0, 10);
  if (state.dateKey !== today) {
    return { ...DEFAULT_BUDGET_STATE(), sessionCallCount: state.sessionCallCount };
  }
  return state;
}

export function getTaskTokenLimit(task: AIAllowedTask): number {
  if (task === 'intake_structuring') return MAX_TOKENS_INTAKE;
  if (task === 'next_action_reasoning' || task === 'next_action_synthesis') return MAX_TOKENS_NEXT_ACTION;
  if (task === 'doctor_summary') return MAX_TOKENS_DOCTOR_SUMMARY;
  if (task === 'memory_compression') return MAX_TOKENS_MEMORY;
  if (task === 'activity_insight') return MAX_TOKENS_ACTIVITY_INSIGHT;
  return MAX_TOKENS_FOLLOWUP;
}

export function estimateTokenCost(input: string): number {
  return Math.max(20, Math.min(900, Math.ceil(input.length / 4)));
}

export function canUseAI(task: AIAllowedTask): boolean {
  const state = normalizeBudgetState(budgetState);
  budgetState = state;
  if (state.sessionCallCount >= MAX_AI_CALLS_PER_SESSION) return false;
  if (state.dailyCallCount >= MAX_AI_CALLS_PER_DAY_LOCAL) return false;
  const estimated = estimateTokenCost(task.replace(/_/g, ' '));
  return estimated <= getTaskTokenLimit(task);
}

export function incrementAICall(task: AIAllowedTask) {
  const state = normalizeBudgetState(budgetState);
  budgetState = {
    ...state,
    dailyCallCount: state.dailyCallCount + 1,
    sessionCallCount: state.sessionCallCount + 1,
    taskCalls: {
      ...state.taskCalls,
      [task]: (state.taskCalls[task] ?? 0) + 1,
    },
  };
}

export function getAIBudgetState() {
  budgetState = normalizeBudgetState(budgetState);
  return budgetState;
}

export function resetSessionBudget() {
  budgetState = {
    ...normalizeBudgetState(budgetState),
    sessionCallCount: 0,
  };
}

/** Test helper — reset in-memory budget counters between cases. */
export function resetAIBudgetForTests() {
  budgetState = DEFAULT_BUDGET_STATE();
}
