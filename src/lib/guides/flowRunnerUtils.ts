import type { FlowDefinition, FlowQuestion } from '../../data/guides/flowRunners';
import { detectUrgentConcern } from '../../utils/healthSafety';

export type RunnerUrgentResult = {
  urgent: ReturnType<typeof detectUrgentConcern>;
  text: string;
  signature: string;
};

export function formatAnswer(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'number') return `${value}/10`;
  if (typeof value === 'string') return value;
  return '—';
}

export function isAnswered(question: FlowQuestion, value: unknown): boolean {
  if (question.type === 'multi') return Array.isArray(value) && value.length > 0;
  if (question.type === 'shortText') return typeof value === 'string' && value.trim().length > 0;
  if (question.type === 'scale') return typeof value === 'number';
  if (question.type === 'single' || question.type === 'yesno') return typeof value === 'string' && value.length > 0;
  return false;
}

export function detectRunnerUrgent(
  _runner: FlowDefinition | null | undefined,
  answers: Record<string, unknown>,
): RunnerUrgentResult {
  const flattened = Object.values(answers)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => String(value));
  const moodSafetyRaw = typeof answers.safety === 'string' ? answers.safety : '';
  const moodSafetySelected = ['yes', "i'm not sure"].includes(moodSafetyRaw.toLowerCase());
  const urgent = moodSafetySelected
    ? detectUrgentConcern('thoughts of harming myself')
    : detectUrgentConcern(flattened);
  return {
    urgent,
    text: moodSafetySelected ? `Mood safety answer: ${moodSafetyRaw}` : flattened.join(', '),
    signature: [...urgent.matches].sort().join('|'),
  };
}

export function applyMultiOptionToggle(existing: string[], option: string): string[] {
  const hasNone = option === 'None of these' || option === "I'm not sure";
  if (existing.includes(option)) {
    return existing.filter((entry) => entry !== option);
  }
  if (hasNone) {
    return [option];
  }
  return [...existing.filter((entry) => entry !== 'None of these' && entry !== "I'm not sure"), option];
}

export function getCurrentQuestion(
  runner: FlowDefinition | null | undefined,
  stepIndex: number,
): FlowQuestion | null {
  const questions = runner?.questions;
  if (!questions || questions.length === 0) return null;
  return questions[stepIndex] ?? null;
}

export function shouldBlockRunnerCompletion(
  flowUrgentTerminal: boolean,
  answers: Record<string, unknown>,
  runner?: FlowDefinition | null,
): boolean {
  if (flowUrgentTerminal) return true;
  return detectRunnerUrgent(runner ?? null, answers).urgent.hasUrgent;
}

export function showMoodSafetyInlineMessage(
  flowId: string | null | undefined,
  answers: Record<string, unknown>,
): boolean {
  return (
    flowId === 'mood-stress-checkin' &&
    typeof answers.safety === 'string' &&
    ['Yes', "I'm not sure"].includes(answers.safety)
  );
}
