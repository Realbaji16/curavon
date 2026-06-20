import { useState, useCallback, useEffect, type Dispatch, type SetStateAction, type KeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  FileText,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  EyeOff,
  MessageCircle,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { useDoctorSummary } from '../context/useDoctorSummary';
import { useHealth } from '../context/useHealth';
import { useScreenBack } from '../hooks/useScreenBack';
import {
  CALM_URGENT_BODY,
  CALM_URGENT_TITLE,
  SELF_HARM_URGENT_BODY,
  SELF_HARM_URGENT_TITLE,
} from '../utils/healthSafety';
import {
  ASK_GOAL_OPTIONS,
  ASK_INTAKE_STEP_COUNT,
  ASK_QUICK_STARTS,
  ASK_STEP_HELPERS,
  CONCERN_TYPE_OPTIONS,
  EMPTY_ASK_INTAKE,
  RED_FLAG_OPTIONS,
  TIMELINE_OPTIONS,
  type AskHistoryEntry,
  type AskIntakeData,
} from '../types/askIntake';
import {
  addAskHistoryEntry,
  markAskHistorySaved,
} from '../utils/askIntakeStorage';
import {
  createAskIntakeSession,
  updateAskIntakeSession,
} from '../utils/askIntakeSessionStorage';
import {
  generateNextSafeStep,
  hasSelfHarmRedFlag,
  hasUrgentRedFlags,
  MENTAL_HEALTH_SAFETY_MESSAGE,
  recommendGuideFlow,
  WATCH_POINTS,
} from '../utils/askIntakeRules';
import { ScreenHeader, SensitiveBlur } from '../components/ScreenHeader';
import { collectAskCompletion, runMetaSystemCycle } from '../utils/metaSystem';
import { runAIOrchestrator } from '../lib/ai/orchestrator/aiOrchestrator';
import { generateCuravonNextAction } from '../lib/plan/nextActionAdapter';
import type { PlanAction } from '../lib/plan/planTypes';

type AskMode = 'landing' | 'intake' | 'safety' | 'result';

function formatHistoryDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function effectiveRedFlags(intake: AskIntakeData): string[] {
  const flags = [...intake.redFlags];
  const other = intake.redFlagOther.trim();
  if (other && !flags.includes('None of these')) {
    flags.push(other);
  }
  return flags;
}

function AskFitShell({ children, className = '' }: { children: ReactNode; className?: string }) {
  useEffect(() => {
    const wrapper = document.querySelector('.screen-wrapper');
    if (wrapper instanceof HTMLElement) {
      wrapper.classList.add('screen-wrapper--ask-locked');
      return () => wrapper.classList.remove('screen-wrapper--ask-locked');
    }
  }, []);

  return <div className={`ask-fit-shell ${className}`.trim()}>{children}</div>;
}

function AskHistorySection({
  history,
  sensitive,
  revealedHistoryIds,
  onReveal,
  onSaveEntry,
  onViewSummary,
  compact = false,
}: {
  history: AskHistoryEntry[];
  sensitive: boolean;
  revealedHistoryIds: Set<string>;
  onReveal: (id: string) => void;
  onSaveEntry: (entry: AskHistoryEntry) => void;
  onViewSummary: () => void;
  compact?: boolean;
}) {
  if (history.length === 0) return null;

  return (
    <section className={`ask-history-section ${compact ? 'ask-history-section--compact' : ''}`}>
      <h3 className="ask-history-title">Recent intakes</h3>
      <ul className="ask-history-list">
        {history.slice(0, compact ? 1 : 3).map((entry) => {
          const hidden = sensitive && !revealedHistoryIds.has(entry.id);
          return (
            <li key={entry.id} className="ask-history-card warm-card glass-card-inner ask-history-card--premium">
              <div className="ask-history-head">
                <p className="ask-history-concern">
                  {hidden ? (
                    <button type="button" className="ask-history-reveal" onClick={() => onReveal(entry.id)}>
                      <EyeOff size={12} />
                      Sensitive detail hidden — tap to reveal
                    </button>
                  ) : (
                    <SensitiveBlur sensitive={sensitive}>{entry.concern}</SensitiveBlur>
                  )}
                </p>
                <span className="ask-history-date">{formatHistoryDate(entry.createdAt)}</span>
              </div>
              <p className="ask-history-preview">
                {hidden ? 'Next step hidden' : entry.nextStep.slice(0, 72)}
                {!hidden && entry.nextStep.length > 72 ? '…' : ''}
              </p>
              <div className="ask-history-actions">
                {entry.savedToDoctorSummary ? (
                  <button type="button" className="btn btn-secondary btn-glass btn-sm" onClick={onViewSummary}>
                    View Summary
                  </button>
                ) : (
                  <button type="button" className="btn btn-secondary btn-glass btn-sm" onClick={() => onSaveEntry(entry)}>
                    Save to Summary
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AskCuravonScreen() {
  const { setActiveTab, openDoctorSummary, openGuidesWithFlow, showToast } = useApp();
  const {
    healthProfile,
    acceptNextAction,
    refreshHealthSnapshot,
    refreshAskHistory,
    healthSnapshot,
    nextActionState,
    askHistory,
  } = useHealth();
  const { addFromAsk, logRedFlag } = useDoctorSummary();

  const [mode, setMode] = useState<AskMode>('landing');
  const [intakeStep, setIntakeStep] = useState(0);
  const [intake, setIntake] = useState<AskIntakeData>(EMPTY_ASK_INTAKE);
  const [landingInput, setLandingInput] = useState('');
  const [savedToSummary, setSavedToSummary] = useState(false);
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);
  const [revealedHistoryIds, setRevealedHistoryIds] = useState<Set<string>>(new Set());
  const [safetyTitle, setSafetyTitle] = useState(CALM_URGENT_TITLE);
  const [safetyBody, setSafetyBody] = useState(CALM_URGENT_BODY);
  const [aiRefinedConcern, setAiRefinedConcern] = useState('');
  const [aiMissingQuestions, setAiMissingQuestions] = useState<string[]>([]);
  const [askFinalAction, setAskFinalAction] = useState<PlanAction | null>(null);
  const [isAcceptingAction, setIsAcceptingAction] = useState(false);
  const [intakeSessionId, setIntakeSessionId] = useState<string | null>(null);

  const redFlags = effectiveRedFlags(intake);
  const nextSafeStep = generateNextSafeStep(intake);
  const recommendedGuide = recommendGuideFlow(intake);
  const sensitive = healthProfile.sensitiveMode;

  const history = askHistory;

  const resetToLanding = useCallback(() => {
    setMode('landing');
    setIntakeStep(0);
    setIntake(EMPTY_ASK_INTAKE);
    setLandingInput('');
    setSavedToSummary(false);
    setHistoryEntryId(null);
    void refreshAskHistory();
    setAiRefinedConcern('');
    setAiMissingQuestions([]);
    setAskFinalAction(null);
    setIntakeSessionId(null);
  }, [refreshAskHistory]);

  const startIntake = (prefill = '') => {
    setIntake({ ...EMPTY_ASK_INTAKE, mainConcern: prefill || landingInput.trim() });
    setIntakeStep(0);
    setSavedToSummary(false);
    setHistoryEntryId(null);
    setMode('intake');
    void createAskIntakeSession({
      status: 'open',
      stage: 'intake',
      riskLevel: 'low',
      privacyLevel: 'private',
      payload: { source: 'ask_curavon' },
    })
      .then((session) => setIntakeSessionId(session.id))
      .catch(() => setIntakeSessionId(null));
  };

  const finishIntake = useCallback(async () => {
    const flags = effectiveRedFlags(intake);

    if (hasUrgentRedFlags(flags)) {
      const selfHarm = hasSelfHarmRedFlag(flags);
      const guidance = selfHarm ? SELF_HARM_URGENT_BODY : CALM_URGENT_BODY;
      setSafetyTitle(selfHarm ? SELF_HARM_URGENT_TITLE : CALM_URGENT_TITLE);
      setSafetyBody(guidance);
      await logRedFlag({
        source: 'Ask Curavon',
        userText: flags.filter((f) => f !== 'None of these').join(', '),
        guidanceShown: guidance,
        matchedConcern: flags.find((f) => f !== 'None of these') ?? 'urgent concern',
      });
      const entry = await addAskHistoryEntry({
        concern: intake.mainConcern,
        concernType: intake.concernType || 'Not sure',
        nextStep: 'Safety guidance shown — no self-care plan generated.',
      });
      setHistoryEntryId(entry.id);
      await refreshAskHistory();
      refreshHealthSnapshot();
      setMode('safety');
      runMetaSystemCycle();
      if (intakeSessionId) {
        void updateAskIntakeSession(intakeSessionId, {
          status: 'closed',
          stage: 'safety',
          riskLevel: 'urgent',
          payload: { outcome: 'red_flag', stepCount: intakeStep + 1 },
        });
      }
      return;
    }

    const aiEnhancement = await runAIOrchestrator({
      userInput: intake.mainConcern,
      contextSnapshot: {
        concernType: intake.concernType,
        timeline: intake.timeline,
      },
      safetyLevel: 'normal',
      stageHint: 'ask_input',
      source: 'ask',
    });
    const aiResult = aiEnhancement.result as {
      refinedConcern?: string;
      missingQuestions?: string[];
    };
    const refinedConcern = (aiResult.refinedConcern ?? '').trim() || intake.mainConcern;
    setAiRefinedConcern(refinedConcern);
    setAiMissingQuestions((aiResult.missingQuestions ?? []).slice(0, 2));
    const entry = await addAskHistoryEntry({
      concern: refinedConcern,
      concernType: intake.concernType || 'Not sure',
      nextStep: nextSafeStep,
    });
    const nextAskHistory = [entry, ...askHistory].slice(0, 20);
    collectAskCompletion();
    await refreshAskHistory();
    refreshHealthSnapshot();
    setHistoryEntryId(entry.id);
    setMode('result');
    const plan = await generateCuravonNextAction({
        source: 'ask',
        snapshot: healthSnapshot,
        intakeResult: {
          concern: refinedConcern,
          concernType: intake.concernType,
          redFlags: flags,
        },
        latestCheckIn: null,
        askHistory: nextAskHistory,
        nextActionState,
        redFlagLogs: [],
        profile: healthProfile,
        currentConcern: refinedConcern,
      });
      setAskFinalAction({
        id: plan.actionId.replace(/^ask-v2-/, ''),
        title: plan.title,
        actionText: plan.actionText,
        reason: plan.reason,
        category: plan.category,
        safetyLevel: plan.safetyLevel,
        relatedGuide: plan.relatedGuide,
        followUpPrompt: plan.followUpPrompt,
        watchFor: plan.watchFor,
        sourceSignals: plan.sourceSignals,
        selectedBy: plan.selectedBy,
        aiReasoned: plan.aiReasoned,
        fallbackUsed: plan.fallbackUsed,
      });
      // Ask result is preview-only until user adds it to Today.
    runMetaSystemCycle();
    if (intakeSessionId) {
      void updateAskIntakeSession(intakeSessionId, {
        status: 'closed',
        stage: 'result',
        payload: { outcome: 'completed', stepCount: ASK_INTAKE_STEP_COUNT },
      });
    }
  }, [intake, intakeStep, intakeSessionId, nextSafeStep, logRedFlag, refreshHealthSnapshot, refreshAskHistory, healthSnapshot, askHistory, nextActionState, healthProfile]);

  const canContinueStep = (): boolean => {
    switch (intakeStep) {
      case 0:
        return intake.mainConcern.trim().length > 0;
      case 1:
        return intake.concernType.trim().length > 0;
      case 2:
        return intake.timeline.trim().length > 0;
      case 3:
        return intake.intensity >= 1;
      case 4:
      case 5:
        return true;
      case 6:
        return intake.redFlags.length > 0 || intake.redFlagOther.trim().length > 0;
      case 7:
        return intake.goal.trim().length > 0;
      case 8:
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    if (intakeStep < ASK_INTAKE_STEP_COUNT - 1) {
      setIntakeStep((s) => s + 1);
      return;
    }
    void finishIntake();
  };

  const goBack = () => {
    if (intakeStep > 0) setIntakeStep((s) => s - 1);
    else resetToLanding();
  };

  const handleScreenBack = useCallback(() => {
    if (mode === 'safety' || mode === 'result') {
      resetToLanding();
      return;
    }
    if (mode === 'intake') {
      if (intakeStep > 0) setIntakeStep((s) => s - 1);
      else resetToLanding();
      return;
    }
    setActiveTab('home');
  }, [mode, intakeStep, resetToLanding, setActiveTab]);

  useScreenBack(handleScreenBack, mode !== 'landing');

  const saveToDoctorSummary = () => {
    // Doctor Summary save does not imply user accepted this as Today's action.
    const concernForSummary = aiRefinedConcern || intake.mainConcern;
    const actionForSummary = askFinalAction?.actionText || nextSafeStep;
    addFromAsk({
      mainConcern: concernForSummary,
      concernType: intake.concernType || 'Not sure',
      timeline: intake.timeline,
      intensity: intake.intensity,
      whatChanged: intake.whatChanged,
      triedSoFar: intake.triedSoFar,
      redFlags,
      nextSafeStep: actionForSummary,
    });
    if (historyEntryId) {
      void markAskHistorySaved(historyEntryId).then(async () => {
        await refreshAskHistory();
        refreshHealthSnapshot();
      });
    }
    setSavedToSummary(true);
    showToast('Saved to your doctor summary.');
  };

  const markAsNextAction = () => {
    if (isAcceptingAction) return;
    setIsAcceptingAction(true);
    try {
      const actionText = askFinalAction?.actionText || nextSafeStep;
      acceptNextAction({
        actionText,
        acceptanceSource: 'ask_promoted',
        actionId: askFinalAction?.id ? `ask-v2-${askFinalAction.id}` : undefined,
        title: askFinalAction?.title,
        category: askFinalAction?.category,
        safetyLevel: askFinalAction?.safetyLevel,
        reason: askFinalAction?.reason,
        sourceLabel: 'Ask Curavon',
        sourceSignals: askFinalAction?.sourceSignals,
        followUpContext: historyEntryId ? { entryId: historyEntryId } : undefined,
      });
      showToast('Added to Today.');
      setActiveTab('home');
    } finally {
      setIsAcceptingAction(false);
    }
  };

  const startRelatedGuide = () => {
    openGuidesWithFlow(recommendedGuide.id);
  };

  const toggleRedFlag = (option: string) => {
    setIntake((prev) => {
      if (option === 'None of these') {
        return { ...prev, redFlags: ['None of these'], redFlagOther: '' };
      }
      const withoutNone = prev.redFlags.filter((f) => f !== 'None of these');
      if (withoutNone.includes(option)) {
        return { ...prev, redFlags: withoutNone.filter((f) => f !== option) };
      }
      return { ...prev, redFlags: [...withoutNone, option] };
    });
  };

  const saveHistoryEntryToSummary = (entry: AskHistoryEntry) => {
    addFromAsk({
      mainConcern: entry.concern,
      concernType: entry.concernType,
      timeline: '',
      intensity: 0,
      whatChanged: '',
      triedSoFar: '',
      redFlags: [],
      nextSafeStep: entry.nextStep,
    });
    void markAskHistorySaved(entry.id).then(async () => {
      await refreshAskHistory();
      refreshHealthSnapshot();
    });
    showToast('Saved to your doctor summary.');
  };

  const revealHistory = (id: string) => {
    setRevealedHistoryIds((prev) => new Set(prev).add(id));
  };

  if (mode === 'safety') {
    const showMentalHealth = hasSelfHarmRedFlag(redFlags);
    return (
      <AskFitShell className="ask-fit-shell--safety">
        <div className="screen ask-safety-screen ask-screen-no-scroll">
          <ScreenHeader title="Safety check" subtitle="Stay calm" showThemeToggle={false} compact />
          <div className="ask-fit-body">
            <div className="ask-safety-card warm-card glass-card-inner ask-safety-card--premium">
              <h2 className="ask-safety-title">{safetyTitle}</h2>
              <p className="ask-safety-body">{safetyBody}</p>
              {showMentalHealth ? <p className="ask-safety-body ask-safety-body--mental">{MENTAL_HEALTH_SAFETY_MESSAGE}</p> : null}
            </div>
          </div>
          <div className="ask-fit-footer ask-fit-footer--dock ask-safety-actions">
            <button type="button" className="btn btn-primary btn-pill" onClick={openDoctorSummary}>
              <FileText size={18} />
              Prepare summary
            </button>
            <button type="button" className="btn btn-secondary btn-glass" onClick={() => setActiveTab('home')}>
              Return to Today
            </button>
            <button type="button" className="btn btn-secondary btn-glass" onClick={resetToLanding}>
              Edit concern / start over
            </button>
          </div>
        </div>
      </AskFitShell>
    );
  }

  if (mode === 'result') {
    return (
      <AskFitShell className="ask-fit-shell--result">
        <div className="screen ask-result-screen ask-screen-no-scroll">
          <ScreenHeader title="Here's one safe next step" subtitle="Organized — not a diagnosis" showThemeToggle={false} compact />

          <div className="ask-fit-body ask-result-body">
            <div className="ask-result-card warm-card glass-card-inner">
              <h3 className="ask-result-heading">What Curavon organized</h3>
              <div className="ask-result-grid">
                <div><span>Concern</span><SensitiveBlur sensitive={sensitive}>{intake.mainConcern}</SensitiveBlur></div>
                {aiRefinedConcern ? (
                  <div className="ask-result-grid--wide">
                    <span>Refined concern</span>
                    <SensitiveBlur sensitive={sensitive}>{aiRefinedConcern}</SensitiveBlur>
                  </div>
                ) : null}
                {intake.concernType ? <div><span>Type</span>{intake.concernType}</div> : null}
                {intake.timeline ? <div><span>Timeline</span>{intake.timeline}</div> : null}
                <div><span>Intensity</span>{intake.intensity}/10</div>
                {intake.whatChanged ? (
                  <div className="ask-result-grid--wide">
                    <span>Changes</span>
                    <SensitiveBlur sensitive={sensitive}>{intake.whatChanged}</SensitiveBlur>
                  </div>
                ) : null}
                {intake.triedSoFar ? (
                  <div className="ask-result-grid--wide">
                    <span>Tried so far</span>
                    <SensitiveBlur sensitive={sensitive}>{intake.triedSoFar}</SensitiveBlur>
                  </div>
                ) : null}
              </div>

              <h3 className="ask-result-heading">What to watch</h3>
              <ul className="ask-watch-list ask-watch-list--compact">
                {WATCH_POINTS.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <div className="ask-result-highlight">
                <h3 className="ask-result-heading ask-result-heading--accent">
                  {askFinalAction?.title || 'Your next safe step'}
                </h3>
                <p className="ask-next-step-text">{askFinalAction?.actionText || nextSafeStep}</p>
                <p className="ask-result-guide-hint">{askFinalAction?.reason || 'One safe, simple next action for now.'}</p>
                <p className="ask-result-guide-hint">
                  Suggested guide: {askFinalAction?.relatedGuide || recommendedGuide.title}
                </p>
              </div>
              {aiRefinedConcern || aiMissingQuestions.length ? (
                <div className="ask-result-highlight">
                  <h3 className="ask-result-heading">Intake clarity</h3>
                  {aiRefinedConcern ? <p className="ask-next-step-text">{aiRefinedConcern}</p> : null}
                  {aiMissingQuestions.length ? (
                    <ul className="ask-watch-list ask-watch-list--compact">
                      {aiMissingQuestions.map((question) => (
                        <li key={question}>{question}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>

            <AskHistorySection
              history={history}
              sensitive={sensitive}
              revealedHistoryIds={revealedHistoryIds}
              onReveal={revealHistory}
              onSaveEntry={saveHistoryEntryToSummary}
              onViewSummary={openDoctorSummary}
              compact
            />
          </div>

          <div className="ask-fit-footer ask-fit-footer--dock ask-result-actions">
            <button type="button" className="btn btn-primary btn-pill" onClick={saveToDoctorSummary} disabled={savedToSummary}>
              <FileText size={16} />
              {savedToSummary ? 'Saved to Doctor Summary' : 'Save to Doctor Summary'}
            </button>
            {savedToSummary ? (
              <button type="button" className="btn btn-secondary btn-glass" onClick={openDoctorSummary}>
                View Doctor Summary
              </button>
            ) : null}
            <button type="button" className="btn btn-secondary btn-glass" onClick={startRelatedGuide}>
              <BookOpen size={16} />
              Start related Guide
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-glass"
              onClick={markAsNextAction}
              disabled={isAcceptingAction}
            >
              <CheckCircle2 size={16} />
              Mark as Today&apos;s next action
            </button>
            <button type="button" className="btn btn-ghost ask-done-btn" onClick={resetToLanding}>
              Done
            </button>
          </div>
        </div>
      </AskFitShell>
    );
  }

  if (mode === 'intake') {
    const progress = ((intakeStep + 1) / ASK_INTAKE_STEP_COUNT) * 100;
    return (
      <AskFitShell className="ask-fit-shell--intake">
        <div className="screen ask-intake-screen ask-screen-no-scroll">
          <ScreenHeader title="Guided intake" subtitle={`Step ${intakeStep + 1} of ${ASK_INTAKE_STEP_COUNT}`} showThemeToggle={false} compact />

          <div className="intake-progress intake-progress--compact">
            <div className="intake-progress-bar intake-progress-bar--premium">
              <motion.div className="intake-progress-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
            </div>
            <div className="ask-step-dots" aria-hidden>
              {Array.from({ length: ASK_INTAKE_STEP_COUNT }, (_, i) => (
                <span
                  key={i}
                  className={`ask-step-dot${i < intakeStep ? ' ask-step-dot--done' : ''}${i === intakeStep ? ' ask-step-dot--current' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="ask-fit-body ask-intake-body">
            <AnimatePresence mode="wait">
              <motion.div
                key={intakeStep}
                className="intake-card warm-card glass-card-inner intake-card--fit"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                <IntakeStepContent
                  step={intakeStep}
                  intake={intake}
                  setIntake={setIntake}
                  toggleRedFlag={toggleRedFlag}
                  redFlags={redFlags}
                  onSubmit={goNext}
                  canContinue={canContinueStep()}
                  helperText={ASK_STEP_HELPERS[intakeStep]}
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="ask-fit-footer ask-fit-footer--dock intake-nav">
            <button type="button" className="btn btn-secondary btn-glass" onClick={goBack}>Back</button>
            <button type="button" className="btn btn-primary btn-pill" onClick={goNext} disabled={!canContinueStep()}>
              {intakeStep === ASK_INTAKE_STEP_COUNT - 1 ? 'Get next step' : 'Continue'}
            </button>
          </div>
        </div>
      </AskFitShell>
    );
  }

  return (
    <AskFitShell className="ask-fit-shell--landing">
      <div className="screen ask-landing-screen ask-screen-no-scroll">
        <ScreenHeader
          title="Ask Curavon"
          subtitle="Tell Curavon what's going on. It will help organize the concern and suggest one safe next step."
          compact
        />

        <div className="ask-fit-body ask-landing-body">
          <div className="ask-trust-note">
            <Shield size={14} />
            <span>Guided support — not a diagnosis.</span>
          </div>

          <h2 className="ask-landing-title">What do you want help with today?</h2>

          <div className="ask-primary-card ask-primary-card--premium warm-card glass-card-inner">
            <div className="ask-hero-accent" aria-hidden />
            <div className="ask-hero-header">
              <div className="ask-hero-icon" aria-hidden>
                <MessageCircle size={20} strokeWidth={2.25} />
              </div>
              <p className="ask-hero-kicker">Quick starts</p>
            </div>
            <div className="ask-quick-starts ask-quick-starts--grid">
              {ASK_QUICK_STARTS.map((item) => (
                <button key={item.label} type="button" className="ask-quick-start-btn" onClick={() => startIntake(item.prefill)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ask-input-card warm-card glass-card-inner">
            <div className="intake-custom-field">
              <label className="intake-custom-label" htmlFor="ask-landing-input">Describe briefly</label>
              <input
                id="ask-landing-input"
                type="text"
                className="intake-visible-input ask-landing-input"
                placeholder="Briefly describe what's happening"
                value={landingInput}
                onChange={(e) => setLandingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && landingInput.trim()) {
                    e.preventDefault();
                    startIntake();
                  }
                }}
              />
            </div>
          </div>

          <AskHistorySection
            history={history}
            sensitive={sensitive}
            revealedHistoryIds={revealedHistoryIds}
            onReveal={revealHistory}
            onSaveEntry={saveHistoryEntryToSummary}
            onViewSummary={openDoctorSummary}
            compact
          />
        </div>

        <div className="ask-fit-footer ask-fit-footer--dock ask-landing-footer">
          <button
            type="button"
            className="btn btn-primary btn-pill"
            onClick={() => startIntake()}
            disabled={!landingInput.trim()}
          >
            Start guided intake
          </button>
          <button type="button" className="ask-browse-guides-btn" onClick={() => setActiveTab('circle')}>
            <BookOpen size={16} />
            Browse Guides
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </AskFitShell>
  );
}

function IntakeVisibleInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  onSubmit,
  showContinue = false,
  continueDisabled = false,
  continueLabel = 'Continue',
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  onSubmit?: () => void;
  showContinue?: boolean;
  continueDisabled?: boolean;
  continueLabel?: string;
}) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && onSubmit && !continueDisabled) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="intake-custom-field">
      <label className="intake-custom-label" htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          className="intake-visible-input intake-visible-input--area"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={2}
        />
      ) : (
        <input
          id={id}
          type="text"
          className="intake-visible-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      )}
      {showContinue ? (
        <button
          type="button"
          className="btn btn-primary btn-pill ask-inline-action"
          onClick={onSubmit}
          disabled={continueDisabled}
        >
          {continueLabel}
        </button>
      ) : null}
    </div>
  );
}

function OptionStepWithCustom({
  question,
  options,
  selected,
  onSelect,
  customValue,
  onCustomChange,
  customLabel,
  customPlaceholder,
  inputId,
  multi = false,
  selectedMulti = [],
  onToggleMulti,
  onSubmit,
  canSubmit,
}: {
  question: string;
  options: readonly string[] | string[];
  selected?: string;
  onSelect?: (opt: string) => void;
  customValue: string;
  onCustomChange: (v: string) => void;
  customLabel: string;
  customPlaceholder: string;
  inputId: string;
  multi?: boolean;
  selectedMulti?: string[];
  onToggleMulti?: (opt: string) => void;
  onSubmit?: () => void;
  canSubmit?: boolean;
}) {
  return (
    <>
      <h2 className="intake-question intake-question--compact">{question}</h2>
      <div className={`intake-options intake-options--compact ${multi ? 'intake-options--grid' : ''}`}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`intake-option soft-button ${
              multi
                ? selectedMulti.includes(opt) ? 'intake-option--selected' : ''
                : selected === opt ? 'intake-option--selected' : ''
            }`}
            onClick={() => (multi ? onToggleMulti?.(opt) : onSelect?.(opt))}
          >
            {opt}
          </button>
        ))}
      </div>
      <IntakeVisibleInput
        id={inputId}
        label={customLabel}
        value={customValue}
        onChange={onCustomChange}
        placeholder={customPlaceholder}
        onSubmit={onSubmit}
        continueDisabled={!canSubmit}
      />
    </>
  );
}

function IntakeStepContent({
  step,
  intake,
  setIntake,
  toggleRedFlag,
  redFlags,
  onSubmit,
  canContinue,
  helperText,
}: {
  step: number;
  intake: AskIntakeData;
  setIntake: Dispatch<SetStateAction<AskIntakeData>>;
  toggleRedFlag: (option: string) => void;
  redFlags: string[];
  onSubmit: () => void;
  canContinue: boolean;
  helperText: string;
}) {
  const presetConcern = CONCERN_TYPE_OPTIONS.includes(intake.concernType as (typeof CONCERN_TYPE_OPTIONS)[number])
    ? intake.concernType
    : '';
  const customConcern = presetConcern ? '' : intake.concernType;

  const presetTimeline = TIMELINE_OPTIONS.includes(intake.timeline as (typeof TIMELINE_OPTIONS)[number])
    ? intake.timeline
    : '';
  const customTimeline = presetTimeline ? '' : intake.timeline;

  const presetGoal = ASK_GOAL_OPTIONS.includes(intake.goal as (typeof ASK_GOAL_OPTIONS)[number])
    ? intake.goal
    : '';
  const customGoal = presetGoal ? '' : intake.goal;

  const renderWithHelper = (content: ReactNode) => (
    <>
      {content}
      <p className="intake-helper">{helperText}</p>
    </>
  );

  switch (step) {
    case 0:
      return renderWithHelper(
        <>
          <h2 className="intake-question intake-question--compact">What feels most important right now?</h2>
          <IntakeVisibleInput
            id="ask-concern"
            label="Type your main concern"
            value={intake.mainConcern}
            onChange={(v) => setIntake((p) => ({ ...p, mainConcern: v }))}
            placeholder="Describe what's on your mind..."
            multiline
            onSubmit={onSubmit}
            continueDisabled={!canContinue}
          />
        </>,
      );
    case 1:
      return renderWithHelper(
        <OptionStepWithCustom
          question="What kind of concern is this?"
          options={CONCERN_TYPE_OPTIONS}
          selected={presetConcern}
          onSelect={(opt) => setIntake((p) => ({ ...p, concernType: opt }))}
          customValue={customConcern}
          onCustomChange={(v) => setIntake((p) => ({ ...p, concernType: v }))}
          customLabel="Or type your own"
          customPlaceholder="Describe the type of concern..."
          inputId="ask-concern-type"
          onSubmit={onSubmit}
          canSubmit={canContinue}
        />,
      );
    case 2:
      return renderWithHelper(
        <OptionStepWithCustom
          question="How long has this been happening?"
          options={TIMELINE_OPTIONS}
          selected={presetTimeline}
          onSelect={(opt) => setIntake((p) => ({ ...p, timeline: opt }))}
          customValue={customTimeline}
          onCustomChange={(v) => setIntake((p) => ({ ...p, timeline: v }))}
          customLabel="Or type your own"
          customPlaceholder="e.g. a few weeks, on and off..."
          inputId="ask-timeline"
          onSubmit={onSubmit}
          canSubmit={canContinue}
        />,
      );
    case 3:
      return renderWithHelper(
        <>
          <h2 className="intake-question intake-question--compact">How intense does it feel?</h2>
          <div className="intake-scale intake-scale--compact">
            <input
              type="range"
              min={1}
              max={10}
              value={intake.intensity}
              onChange={(e) => setIntake((p) => ({ ...p, intensity: Number(e.target.value) }))}
              className="intake-scale-slider"
            />
            <div className="intake-scale-labels">
              <span>Mild</span>
              <strong>{intake.intensity}/10</strong>
              <span>Strong</span>
            </div>
          </div>
          <IntakeVisibleInput
            id="ask-intensity-note"
            label="Add a note in your own words (optional)"
            value={intake.intensityNote}
            onChange={(v) => setIntake((p) => ({ ...p, intensityNote: v }))}
            placeholder="What does the intensity feel like?"
            onSubmit={onSubmit}
            continueDisabled={!canContinue}
          />
        </>,
      );
    case 4:
      return renderWithHelper(
        <>
          <h2 className="intake-question intake-question--compact">Did anything change around the time it started?</h2>
          <IntakeVisibleInput
            id="ask-changed"
            label="Type what changed"
            value={intake.whatChanged}
            onChange={(v) => setIntake((p) => ({ ...p, whatChanged: v }))}
            placeholder="Sleep, food, stress, medication, activity, illness, anything unusual..."
            multiline
            onSubmit={onSubmit}
            continueDisabled={!canContinue}
          />
        </>,
      );
    case 5:
      return renderWithHelper(
        <>
          <h2 className="intake-question intake-question--compact">What have you already tried?</h2>
          <IntakeVisibleInput
            id="ask-tried"
            label="Type what you've tried"
            value={intake.triedSoFar}
            onChange={(v) => setIntake((p) => ({ ...p, triedSoFar: v }))}
            placeholder="Rest, water, medication, talking to someone, nothing yet..."
            multiline
            onSubmit={onSubmit}
            continueDisabled={!canContinue}
          />
        </>,
      );
    case 6:
      return renderWithHelper(
        <OptionStepWithCustom
          question="Are any of these happening?"
          options={RED_FLAG_OPTIONS}
          multi
          selectedMulti={intake.redFlags}
          onToggleMulti={toggleRedFlag}
          customValue={intake.redFlagOther}
          onCustomChange={(v) => setIntake((p) => ({ ...p, redFlagOther: v }))}
          customLabel="Or describe something else"
          customPlaceholder="Type any other urgent sign..."
          inputId="ask-red-flag-other"
          onSubmit={onSubmit}
          canSubmit={canContinue}
        />,
      );
    case 7:
      return renderWithHelper(
        <OptionStepWithCustom
          question="What would help most right now?"
          options={ASK_GOAL_OPTIONS}
          selected={presetGoal}
          onSelect={(opt) => setIntake((p) => ({ ...p, goal: opt }))}
          customValue={customGoal}
          onCustomChange={(v) => setIntake((p) => ({ ...p, goal: v }))}
          customLabel="Or type your own"
          customPlaceholder="What would feel most helpful?"
          inputId="ask-goal"
          onSubmit={onSubmit}
          canSubmit={canContinue}
        />,
      );
    case 8:
      return renderWithHelper(
        <>
          <h2 className="intake-question intake-question--compact">Review your intake</h2>
          <div className="ask-review-grid">
            <div><span>Concern</span><SensitiveBlur sensitive>{intake.mainConcern || '—'}</SensitiveBlur></div>
            <div><span>Type</span>{intake.concernType || '—'}</div>
            <div><span>Timeline</span>{intake.timeline || '—'}</div>
            <div><span>Intensity</span>{intake.intensity}/10</div>
            <div><span>Changes noticed</span>{intake.whatChanged || '—'}</div>
            <div><span>Tried so far</span>{intake.triedSoFar || '—'}</div>
            <div className="ask-review-grid--wide"><span>Red flags</span>{redFlags.length ? redFlags.join(', ') : '—'}</div>
            <div><span>Desired help</span>{intake.goal || '—'}</div>
          </div>
        </>,
      );
    default:
      return null;
  }
}

export function SafetyEscalation() {
  // Legacy placeholder. Active Ask safety is handled by the guided-intake safety screen above.
  return null;
}
