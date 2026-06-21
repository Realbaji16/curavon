import { useCallback, useRef, useState } from 'react';
import { useDoctorSummary } from '../../context/useDoctorSummary';
import { useHealth } from '../../context/useHealth';
import { resolveAskPrivacyLevel } from '../../lib/data/healthFlowService';
import type { FlowCard } from '../../data/guides/flowCatalog';
import type { FlowDefinition } from '../../data/guides/flowRunners';
import type { PlanAction } from '../../lib/plan/planTypes';
import { runMetaSystemCycle } from '../../utils/metaSystem';
import {
  completeFlowCompletion,
  type FlowCompletionResult,
} from '../../lib/guides/flowCompletion';

export type CompleteFlowParams = {
  flow: FlowCard;
  runner: FlowDefinition;
  answers: Record<string, unknown>;
  flowUrgentTerminal: boolean;
};

export function useFlowCompletion() {
  const { addFromFlow } = useDoctorSummary();
  const {
    healthSnapshot,
    nextActionState,
    healthProfile,
    refreshHealthSnapshot,
  } = useHealth();

  const [flowPlanAction, setFlowPlanAction] = useState<PlanAction | null>(null);
  const [doctorDraftSaved, setDoctorDraftSaved] = useState(false);
  const [resultSaved, setResultSaved] = useState(false);
  const flowSummarySavedRef = useRef<string | null>(null);

  const privacyLevel = resolveAskPrivacyLevel(healthProfile?.sensitiveMode ?? false);

  const completeFlow = useCallback(
    async (params: CompleteFlowParams): Promise<FlowCompletionResult> => {
      const result = await completeFlowCompletion({
        ...params,
        privacyLevel,
        acceptanceSource: 'guide_completed',
        healthSnapshot,
        nextActionState,
        healthProfile,
        addFromFlow,
        refreshHealthSnapshot,
      });

      if (result.status === 'success') {
        setFlowPlanAction(result.planAction);
        setDoctorDraftSaved(true);
      }

      return result;
    },
    [addFromFlow, healthProfile, healthSnapshot, nextActionState, privacyLevel, refreshHealthSnapshot],
  );

  const autoCompleteIfNeeded = useCallback(
    async (params: CompleteFlowParams): Promise<FlowCompletionResult | null> => {
      if (params.flowUrgentTerminal) return null;
      if (flowSummarySavedRef.current === params.flow.id) return null;
      flowSummarySavedRef.current = params.flow.id;
      return completeFlow(params);
    },
    [completeFlow],
  );

  const resetCompletion = useCallback(() => {
    setFlowPlanAction(null);
    setDoctorDraftSaved(false);
    setResultSaved(false);
    flowSummarySavedRef.current = null;
  }, []);

  const markResultSaved = useCallback(() => {
    setResultSaved(true);
    runMetaSystemCycle();
  }, []);

  return {
    flowPlanAction,
    doctorDraftSaved,
    resultSaved,
    privacyLevel,
    completeFlow,
    autoCompleteIfNeeded,
    resetCompletion,
    markResultSaved,
  };
}
