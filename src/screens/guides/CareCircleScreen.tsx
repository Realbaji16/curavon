import { useMemo, useState, useCallback, useEffect } from 'react';
import { useApp } from '../../context/useApp';
import { useDoctorSummary } from '../../context/useDoctorSummary';
import { useHealth } from '../../context/useHealth';
import { ScreenHeader } from '../../components/ScreenHeader';
import { useScreenBack } from '../../hooks/useScreenBack';
import { CALM_URGENT_TITLE } from '../../utils/healthSafety';
import { collectFlowBehavior } from '../../utils/metaSystem';
import { useFlowRunner } from '../../hooks/guides/useFlowRunner';
import { useFlowCompletion } from '../../hooks/guides/useFlowCompletion';
import { showMoodSafetyInlineMessage } from '../../lib/guides/flowRunnerUtils';
import {
  FLOW_CARDS,
  type FlowId,
} from '../../data/guides/flowCatalog';
import { BASIC_GUIDES, MIND_GUIDES } from '../../data/guides/guideCatalog';
import { FLOW_RUNNERS } from '../../data/guides/flowRunners';
import { FlowDetailView } from './FlowDetailView';
import { FlowResultView } from './FlowResultView';
import { FlowRunnerView } from './FlowRunnerView';
import { FlowSafetyTerminalView } from './FlowSafetyTerminalView';
import { GuideDetailView } from './GuideDetailView';
import { GuidesBrowseView } from './GuidesBrowseView';
import type { ViewMode } from './types';

export function CareCircleScreen() {
  const { openDoctorSummary, pendingGuideFlowId, clearPendingGuideFlow, setActiveTab, showToast } = useApp();
  const { logRedFlag } = useDoctorSummary();
  const { openUrgentSafety, closeUrgentSafety } = useHealth();
  const [viewMode, setViewMode] = useState<ViewMode>('browse');
  const [selectedFlowId, setSelectedFlowId] = useState<FlowId | null>(null);
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null);
  const [savedGuides, setSavedGuides] = useState<Record<string, boolean>>({});
  const [showGuidesSafety, setShowGuidesSafety] = useState(false);
  const [guidesSafetyTitle, setGuidesSafetyTitle] = useState(CALM_URGENT_TITLE);
  const [guidesSafetyBody, setGuidesSafetyBody] = useState('');
  const [guidesSafetyAcknowledged, setGuidesSafetyAcknowledged] = useState(false);
  const [lastSafetySignature, setLastSafetySignature] = useState('');

  const {
    flowPlanAction,
    doctorDraftSaved,
    resultSaved,
    completeFlow,
    autoCompleteIfNeeded,
    resetCompletion,
    markResultSaved,
  } = useFlowCompletion();

  const selectedFlow = useMemo(
    () => FLOW_CARDS.find((flow) => flow.id === selectedFlowId) ?? null,
    [selectedFlowId],
  );
  const selectedGuide = useMemo(
    () => [...MIND_GUIDES, ...BASIC_GUIDES].find((guide) => guide.id === selectedGuideId) ?? null,
    [selectedGuideId],
  );
  const selectedFlowRunner = selectedFlowId ? FLOW_RUNNERS[selectedFlowId] : null;
  const flowRunner = useFlowRunner({ runner: selectedFlowRunner });
  const {
    stepIndex: runnerStep,
    answers: runnerAnswers,
    currentQuestion,
    currentAnswer,
    canContinue,
    flowUrgentTerminal,
    setAnswer,
    toggleMultiOption,
    goNext: goRunnerNextStep,
    goBack: goRunnerBackStep,
    reset: resetFlowRunner,
    setFlowUrgentTerminal,
  } = flowRunner;

  const openFlowDetail = useCallback(
    (flowId: FlowId) => {
      setSelectedFlowId(flowId);
      setFlowUrgentTerminal(false);
      setGuidesSafetyAcknowledged(false);
      setViewMode('flowDetail');
    },
    [setFlowUrgentTerminal],
  );

  const handlePendingGuideFlow = useCallback(
    (flowId: FlowId, flowTitle: string) => {
      openFlowDetail(flowId);
      showToast(`Recommended guide: ${flowTitle}`);
    },
    [openFlowDetail, showToast],
  );

  useEffect(() => {
    if (!pendingGuideFlowId) return;
    const flow = FLOW_CARDS.find((f) => f.id === pendingGuideFlowId);
    if (flow) {
      // Deep-link from AppContext pendingGuideFlowId into Guides detail view.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync external navigation request into local view state
      handlePendingGuideFlow(pendingGuideFlowId as FlowId, flow.title);
    }
    clearPendingGuideFlow();
  }, [pendingGuideFlowId, clearPendingGuideFlow, handlePendingGuideFlow]);

  const openGuideDetail = (guideId: string) => {
    setSelectedGuideId(guideId);
    setViewMode('guideDetail');
  };

  const openRelatedFlow = (flowId: FlowId) => {
    setSelectedGuideId(null);
    setSelectedFlowId(flowId);
    setViewMode('flowDetail');
  };

  const startSelectedFlow = () => {
    if (!selectedFlowId) return;
    resetCompletion();
    setGuidesSafetyAcknowledged(false);
    setLastSafetySignature('');
    resetFlowRunner();
    setViewMode('flowRunner');
    collectFlowBehavior({
      flowId: selectedFlowId,
      event: 'start',
      stepIndex: 0,
      totalSteps: selectedFlowRunner?.questions?.length,
    });
  };

  const backToBrowse = useCallback(() => {
    setViewMode('browse');
    setSelectedGuideId(null);
    setSelectedFlowId(null);
  }, []);

  const saveGuide = (guideId: string) => {
    setSavedGuides((prev) => ({ ...prev, [guideId]: true }));
    showToast('Saved for later');
  };

  const openGuidesSafety = useCallback(
    (title: string, body: string) => {
      setGuidesSafetyTitle(title);
      setGuidesSafetyBody(body);
      setShowGuidesSafety(true);
      openUrgentSafety();
    },
    [openUrgentSafety],
  );

  const closeGuidesSafety = useCallback(() => {
    setShowGuidesSafety(false);
    closeUrgentSafety();
  }, [closeUrgentSafety]);

  const goRunnerBack = useCallback(() => {
    if (!selectedFlowRunner?.questions) return;
    const result = goRunnerBackStep();
    if (result.outcome === 'exit') {
      if (selectedFlowId) {
        collectFlowBehavior({
          flowId: selectedFlowId,
          event: 'abandon',
          stepIndex: 0,
          totalSteps: selectedFlowRunner.questions.length,
        });
      }
      setViewMode('flowDetail');
      return;
    }
    if (selectedFlowId) {
      collectFlowBehavior({
        flowId: selectedFlowId,
        event: 'back',
        stepIndex: runnerStep,
        totalSteps: selectedFlowRunner.questions.length,
      });
    }
  }, [runnerStep, selectedFlowId, selectedFlowRunner, goRunnerBackStep]);

  const goRunnerNext = () => {
    if (!selectedFlowRunner?.questions || !currentQuestion || !canContinue) return;
    const result = goRunnerNextStep({ safetyAcknowledged: guidesSafetyAcknowledged });
    if (result.outcome === 'blocked') return;
    if (result.outcome === 'urgent-interrupt') {
      const { urgent, text, signature } = result.urgent;
      if (signature && signature !== lastSafetySignature) {
        logRedFlag({
          source: 'Guides',
          userText: text,
          matchedConcern: urgent.matches[0] ?? 'urgent concern',
          guidanceShown: urgent.body,
        });
        setLastSafetySignature(signature);
      }
      if (selectedFlowId) {
        collectFlowBehavior({
          flowId: selectedFlowId,
          event: 'skip',
          stepIndex: runnerStep,
          totalSteps: selectedFlowRunner.questions.length,
        });
      }
      openGuidesSafety(urgent.title, urgent.body);
      return;
    }
    if (result.outcome === 'urgent-terminal') {
      setViewMode('flowSafetyTerminal');
      return;
    }
    if (selectedFlowId) {
      collectFlowBehavior({
        flowId: selectedFlowId,
        event: result.outcome === 'completed' ? 'complete' : 'step',
        stepIndex: runnerStep,
        totalSteps: selectedFlowRunner.questions.length,
      });
    }
    if (result.outcome === 'completed') {
      setViewMode('flowResult');
    }
  };

  const saveResult = () => {
    markResultSaved();
    showToast('Result saved');
  };

  useEffect(() => {
    if (viewMode !== 'flowResult' || !selectedFlow || !selectedFlowRunner || flowUrgentTerminal) return;
    void autoCompleteIfNeeded({
      flow: selectedFlow,
      runner: selectedFlowRunner,
      answers: runnerAnswers,
      flowUrgentTerminal,
    });
  }, [viewMode, selectedFlow, selectedFlowRunner, runnerAnswers, flowUrgentTerminal, autoCompleteIfNeeded]);

  const restartFlow = useCallback(() => {
    resetFlowRunner();
    setGuidesSafetyAcknowledged(false);
    setShowGuidesSafety(false);
    resetCompletion();
    setViewMode('flowRunner');
  }, [resetFlowRunner, resetCompletion]);

  const saveDoctorDraft = () => {
    if (!selectedFlow || !selectedFlowRunner) return;
    void completeFlow({
      flow: selectedFlow,
      runner: selectedFlowRunner,
      answers: runnerAnswers,
      flowUrgentTerminal,
    }).then((result) => {
      if (result.status === 'success') {
        showToast('Saved to Doctor Summary');
      }
    });
  };

  const showMoodSafetyMessage = showMoodSafetyInlineMessage(selectedFlowId, runnerAnswers);

  const handlePrepareSummaryFromSafety = () => {
    setGuidesSafetyAcknowledged(true);
    closeGuidesSafety();
    openDoctorSummary();
    setViewMode('flowSafetyTerminal');
  };

  const handleContinueToSafetyTerminal = () => {
    setGuidesSafetyAcknowledged(true);
    closeGuidesSafety();
    setViewMode('flowSafetyTerminal');
  };

  const handleGuidesBack = useCallback(() => {
    if (viewMode === 'flowSafetyTerminal') {
      backToBrowse();
      return;
    }
    if (viewMode === 'flowRunner') {
      goRunnerBack();
      return;
    }
    if (viewMode !== 'browse') {
      backToBrowse();
    }
  }, [viewMode, goRunnerBack, backToBrowse]);

  useScreenBack(handleGuidesBack, viewMode !== 'browse');

  return (
    <div className="screen learn-screen guides-screen">
      <ScreenHeader title="Guides" subtitle="Guided paths, gentle learning, and one clearer next step." />

      {viewMode === 'browse' ? (
        <GuidesBrowseView onOpenFlowDetail={openFlowDetail} onOpenGuideDetail={openGuideDetail} />
      ) : null}

      {viewMode === 'flowDetail' && selectedFlow && selectedFlowRunner ? (
        <FlowDetailView flow={selectedFlow} onStartFlow={startSelectedFlow} />
      ) : null}

      {viewMode === 'flowRunner' && selectedFlow && selectedFlowRunner?.questions && currentQuestion ? (
        <FlowRunnerView
          runner={selectedFlowRunner}
          runnerStep={runnerStep}
          currentQuestion={currentQuestion}
          currentAnswer={currentAnswer}
          canContinue={canContinue}
          showMoodSafetyMessage={showMoodSafetyMessage}
          showGuidesSafety={showGuidesSafety}
          guidesSafetyTitle={guidesSafetyTitle}
          guidesSafetyBody={guidesSafetyBody}
          onSetAnswer={setAnswer}
          onToggleMultiOption={toggleMultiOption}
          onBack={goRunnerBack}
          onNext={goRunnerNext}
          onPrepareSummaryFromSafety={handlePrepareSummaryFromSafety}
          onContinueToSafetyTerminal={handleContinueToSafetyTerminal}
        />
      ) : null}

      {viewMode === 'flowSafetyTerminal' && selectedFlow ? (
        <FlowSafetyTerminalView
          guidesSafetyBody={guidesSafetyBody}
          onOpenDoctorSummary={openDoctorSummary}
          onBackToBrowse={backToBrowse}
          onReturnToToday={() => setActiveTab('home')}
          onRestartFlow={restartFlow}
        />
      ) : null}

      {viewMode === 'flowResult' && selectedFlow && selectedFlowRunner && !flowUrgentTerminal ? (
        <FlowResultView
          flow={selectedFlow}
          runner={selectedFlowRunner}
          runnerAnswers={runnerAnswers}
          flowPlanAction={flowPlanAction}
          resultSaved={resultSaved}
          doctorDraftSaved={doctorDraftSaved}
          onSaveResult={saveResult}
          onSaveDoctorDraft={saveDoctorDraft}
          onOpenDoctorSummary={openDoctorSummary}
        />
      ) : null}

      {viewMode === 'guideDetail' && selectedGuide ? (
        <GuideDetailView
          guide={selectedGuide}
          saved={Boolean(savedGuides[selectedGuide.id])}
          onSaveGuide={saveGuide}
          onOpenRelatedFlow={openRelatedFlow}
        />
      ) : null}
    </div>
  );
}
