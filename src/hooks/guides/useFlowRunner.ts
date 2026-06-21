import { useCallback, useState } from 'react';
import type { FlowId } from '../../data/guides/flowCatalog';
import { FLOW_RUNNERS, type FlowDefinition, type FlowQuestion } from '../../data/guides/flowRunners';
import {
  applyMultiOptionToggle,
  detectRunnerUrgent,
  getCurrentQuestion,
  isAnswered,
  type RunnerUrgentResult,
} from '../../lib/guides/flowRunnerUtils';

export type UseFlowRunnerOptions = {
  flowId?: FlowId | null;
  runner?: FlowDefinition | null;
};

export type GoNextResult =
  | { outcome: 'blocked' }
  | { outcome: 'urgent-interrupt'; urgent: RunnerUrgentResult }
  | { outcome: 'urgent-terminal' }
  | { outcome: 'advanced'; stepIndex: number }
  | { outcome: 'completed' };

export type GoBackResult = { outcome: 'exit' } | { outcome: 'back'; stepIndex: number };

export function useFlowRunner(options: UseFlowRunnerOptions) {
  const runner =
    options.runner ?? (options.flowId ? FLOW_RUNNERS[options.flowId] : null) ?? null;
  const questions = runner?.questions ?? [];

  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flowUrgentTerminal, setFlowUrgentTerminal] = useState(false);
  const [urgentResult, setUrgentResult] = useState<RunnerUrgentResult | null>(null);

  const currentQuestion = getCurrentQuestion(runner, stepIndex);
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const canContinue = currentQuestion ? isAnswered(currentQuestion, currentAnswer) : false;

  const setAnswer = useCallback((question: FlowQuestion, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  }, []);

  const toggleMultiOption = useCallback((question: FlowQuestion, option: string) => {
    setAnswers((prev) => {
      const existing = Array.isArray(prev[question.id]) ? (prev[question.id] as string[]) : [];
      return { ...prev, [question.id]: applyMultiOptionToggle(existing, option) };
    });
  }, []);

  const reset = useCallback(() => {
    setStepIndex(0);
    setAnswers({});
    setFlowUrgentTerminal(false);
    setUrgentResult(null);
  }, []);

  const goNext = useCallback(
    (opts: { safetyAcknowledged: boolean }): GoNextResult => {
      if (!questions.length || !currentQuestion || !canContinue || flowUrgentTerminal) {
        return { outcome: 'blocked' };
      }

      const mergedAnswers = { ...answers, [currentQuestion.id]: currentAnswer };
      const interruptCheck = detectRunnerUrgent(runner, mergedAnswers);
      if (interruptCheck.urgent.hasUrgent && !opts.safetyAcknowledged) {
        setFlowUrgentTerminal(true);
        setUrgentResult(interruptCheck);
        return { outcome: 'urgent-interrupt', urgent: interruptCheck };
      }

      const proceedCheck = detectRunnerUrgent(runner, answers);
      if (proceedCheck.urgent.hasUrgent) {
        setFlowUrgentTerminal(true);
        setUrgentResult(proceedCheck);
        return { outcome: 'urgent-terminal' };
      }

      const lastStep = questions.length - 1;
      if (stepIndex >= lastStep) {
        return { outcome: 'completed' };
      }

      const nextStep = Math.min(stepIndex + 1, lastStep);
      setStepIndex(nextStep);
      return { outcome: 'advanced', stepIndex: nextStep };
    },
    [answers, canContinue, currentAnswer, currentQuestion, flowUrgentTerminal, questions.length, runner, stepIndex],
  );

  const goBack = useCallback((): GoBackResult => {
    if (!questions.length || stepIndex === 0) {
      return { outcome: 'exit' };
    }
    const nextStep = Math.max(stepIndex - 1, 0);
    setStepIndex(nextStep);
    return { outcome: 'back', stepIndex: nextStep };
  }, [questions.length, stepIndex]);

  return {
    runner,
    stepIndex,
    answers,
    currentQuestion,
    currentAnswer,
    canContinue,
    flowUrgentTerminal,
    urgentResult,
    setAnswer,
    toggleMultiOption,
    goNext,
    goBack,
    reset,
    setFlowUrgentTerminal,
  };
}
