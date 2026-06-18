import { useState, useCallback, useEffect, type Dispatch, type SetStateAction, type KeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  FileText,
  ChevronRight,
  BookOpen,
  CheckCircle2,
  EyeOff,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDoctorSummary } from '../context/DoctorSummaryContext';
import { useHealth } from '../context/HealthContext';
import { useScreenBack } from '../hooks/useScreenBack';
import { URGENT_SAFETY_MESSAGE } from '../utils/healthSafety';
import {
  ASK_GOAL_OPTIONS,
  ASK_INTAKE_STEP_COUNT,
  ASK_QUICK_STARTS,
  CONCERN_TYPE_OPTIONS,
  EMPTY_ASK_INTAKE,
  RED_FLAG_OPTIONS,
  TIMELINE_OPTIONS,
  type AskHistoryEntry,
  type AskIntakeData,
} from '../types/askIntake';
import {
  addAskHistoryEntry,
  loadAskHistory,
  markAskHistorySaved,
} from '../utils/askIntakeStorage';
import {
  generateNextSafeStep,
  hasSelfHarmRedFlag,
  hasUrgentRedFlags,
  MENTAL_HEALTH_SAFETY_MESSAGE,
  recommendGuideFlow,
  WATCH_POINTS,
} from '../utils/askIntakeRules';
import { ScreenHeader, SensitiveBlur } from '../components/ScreenHeader';

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

export function AskCuravonScreen() {
  const { setActiveTab, openDoctorSummary, openGuidesWithFlow, showToast } = useApp();
  const { healthProfile, setNextActionFromSource } = useHealth();
  const { addFromAsk, logRedFlag } = useDoctorSummary();

  const [mode, setMode] = useState<AskMode>('landing');
  const [intakeStep, setIntakeStep] = useState(0);
  const [intake, setIntake] = useState<AskIntakeData>(EMPTY_ASK_INTAKE);
  const [landingInput, setLandingInput] = useState('');
  const [savedToSummary, setSavedToSummary] = useState(false);
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);
  const [history, setHistory] = useState<AskHistoryEntry[]>(() => loadAskHistory());
  const [revealedHistoryIds, setRevealedHistoryIds] = useState<Set<string>>(new Set());

  const redFlags = effectiveRedFlags(intake);
  const nextSafeStep = generateNextSafeStep(intake);
  const recommendedGuide = recommendGuideFlow(intake);
  const sensitive = healthProfile.sensitiveMode;

  const resetToLanding = useCallback(() => {
    setMode('landing');
    setIntakeStep(0);
    setIntake(EMPTY_ASK_INTAKE);
    setLandingInput('');
    setSavedToSummary(false);
    setHistoryEntryId(null);
    setHistory(loadAskHistory());
  }, []);

  const startIntake = (prefill = '') => {
    setIntake({ ...EMPTY_ASK_INTAKE, mainConcern: prefill || landingInput.trim() });
    setIntakeStep(0);
    setSavedToSummary(false);
    setHistoryEntryId(null);
    setMode('intake');
  };

  const finishIntake = useCallback(() => {
    const flags = effectiveRedFlags(intake);
    const entry = addAskHistoryEntry({
      concern: intake.mainConcern,
      concernType: intake.concernType || 'Not sure',
      nextStep: nextSafeStep,
    });
    setHistoryEntryId(entry.id);
    setHistory(loadAskHistory());

    if (hasUrgentRedFlags(flags)) {
      const guidance = hasSelfHarmRedFlag(flags)
        ? MENTAL_HEALTH_SAFETY_MESSAGE
        : URGENT_SAFETY_MESSAGE;
      logRedFlag({
        source: 'Ask Curavon',
        userText: flags.filter((f) => f !== 'None of these').join(', '),
        guidanceShown: guidance,
        matchedConcern: flags.find((f) => f !== 'None of these') ?? 'urgent concern',
      });
      setMode('safety');
    } else {
      setMode('result');
    }
  }, [intake, nextSafeStep, logRedFlag]);

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
    finishIntake();
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
    addFromAsk({
      mainConcern: intake.mainConcern,
      concernType: intake.concernType || 'Not sure',
      timeline: intake.timeline,
      intensity: intake.intensity,
      whatChanged: intake.whatChanged,
      triedSoFar: intake.triedSoFar,
      redFlags,
      nextSafeStep,
    });
    if (historyEntryId) {
      markAskHistorySaved(historyEntryId);
      setHistory(loadAskHistory());
    }
    setSavedToSummary(true);
    showToast('Saved to your doctor summary.');
  };

  const markAsNextAction = () => {
    setNextActionFromSource(nextSafeStep, 'Ask Curavon');
    showToast('Added to Today.');
    setActiveTab('home');
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

  if (mode === 'safety') {
    const showMentalHealth = hasSelfHarmRedFlag(redFlags);
    return (
      <AskFitShell className="ask-fit-shell--safety">
        <div className="screen ask-safety-screen ask-screen-no-scroll">
          <ScreenHeader title="Safety check" subtitle="Stay calm" showThemeToggle={false} compact />
          <div className="ask-fit-body">
            <div className="ask-safety-card warm-card glass-card-inner">
              <h2 className="ask-safety-title">This may need urgent support</h2>
              <p className="ask-safety-body">{URGENT_SAFETY_MESSAGE}</p>
              {showMentalHealth ? (
                <p className="ask-safety-body ask-safety-body--mental">{MENTAL_HEALTH_SAFETY_MESSAGE}</p>
              ) : null}
            </div>
          </div>
          <div className="ask-fit-footer ask-safety-actions">
            <button type="button" className="btn btn-primary btn-pill" onClick={openDoctorSummary}>
              <FileText size={18} />
              Prepare summary
            </button>
            <button type="button" className="btn btn-secondary btn-glass" onClick={() => setMode('result')}>
              I understand
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
          <ScreenHeader title="One safe next step" subtitle="Organized — not a diagnosis" showThemeToggle={false} compact />

          <div className="ask-fit-body ask-result-body">
            <div className="ask-result-card warm-card glass-card-inner">
              <h3 className="ask-result-heading">What Curavon organized</h3>
              <div className="ask-result-grid">
                <div><span>Concern</span><SensitiveBlur sensitive={sensitive}>{intake.mainConcern}</SensitiveBlur></div>
                {intake.concernType ? <div><span>Type</span>{intake.concernType}</div> : null}
                {intake.timeline ? <div><span>Timeline</span>{intake.timeline}</div> : null}
                <div><span>Intensity</span>{intake.intensity}/10</div>
              </div>

              <h3 className="ask-result-heading">What to watch</h3>
              <ul className="ask-watch-list ask-watch-list--compact">
                {WATCH_POINTS.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>

              <h3 className="ask-result-heading ask-result-heading--accent">Your next safe step</h3>
              <p className="ask-next-step-text">{nextSafeStep}</p>
            </div>
          </div>

          <div className="ask-fit-footer ask-result-actions ask-result-actions--grid">
            <button type="button" className="btn btn-primary btn-pill" onClick={saveToDoctorSummary} disabled={savedToSummary}>
              <FileText size={16} />
              {savedToSummary ? 'Saved' : 'Save summary'}
            </button>
            <button type="button" className="btn btn-secondary btn-glass" onClick={startRelatedGuide}>
              <BookOpen size={16} />
              Guide
            </button>
            <button type="button" className="btn btn-secondary btn-glass" onClick={markAsNextAction}>
              <CheckCircle2 size={16} />
              Today action
            </button>
            <button type="button" className="btn btn-secondary btn-glass" onClick={resetToLanding}>
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
            <div className="intake-progress-bar">
              <motion.div className="intake-progress-fill" animate={{ width: `${progress}%` }} transition={{ duration: 0.35 }} />
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
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="ask-fit-footer intake-nav">
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
        <ScreenHeader title="Ask Curavon" subtitle="Organize a concern · one safe next step" compact />

        <div className="ask-fit-body ask-landing-body">
          <div className="ask-trust-note">
            <Shield size={14} />
            <span>Guided support — not a diagnosis.</span>
          </div>

          <div className="ask-primary-card warm-card glass-card-inner">
            <h2 className="ask-primary-title">What do you want help with today?</h2>
            <div className="ask-quick-starts ask-quick-starts--grid">
              {ASK_QUICK_STARTS.map((item) => (
                <button key={item.label} type="button" className="ask-quick-start-btn" onClick={() => startIntake(item.prefill)}>
                  {item.label}
                </button>
              ))}
            </div>

            <div className="intake-custom-field">
              <label className="intake-custom-label" htmlFor="ask-landing-input">Or describe in your own words</label>
              <textarea
                id="ask-landing-input"
                className="intake-visible-input intake-visible-input--area"
                placeholder="Type what's happening..."
                value={landingInput}
                onChange={(e) => setLandingInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && landingInput.trim()) {
                    e.preventDefault();
                    startIntake();
                  }
                }}
                rows={2}
              />
              <button
                type="button"
                className="btn btn-primary btn-pill ask-inline-action"
                onClick={() => startIntake()}
                disabled={!landingInput.trim()}
              >
                Continue
              </button>
            </div>
          </div>

          {history.length > 0 ? (
            <div className="ask-history-compact warm-card glass-card-inner">
              <span className="ask-history-compact-label">Recent</span>
              {(() => {
                const entry = history[0];
                const hidden = sensitive && !revealedHistoryIds.has(entry.id);
                return (
                  <>
                    <p className="ask-history-compact-text">
                      {hidden ? (
                        <button type="button" className="ask-history-reveal" onClick={() => setRevealedHistoryIds((p) => new Set(p).add(entry.id))}>
                          <EyeOff size={12} /> Hidden — tap to reveal
                        </button>
                      ) : (
                        <SensitiveBlur sensitive={sensitive}>{entry.concern}</SensitiveBlur>
                      )}
                    </p>
                    <span className="ask-history-date">{formatHistoryDate(entry.createdAt)}</span>
                  </>
                );
              })()}
            </div>
          ) : null}
        </div>

        <div className="ask-fit-footer ask-landing-footer">
          <button type="button" className="ask-browse-guides-btn ask-browse-guides-btn--full" onClick={() => setActiveTab('circle')}>
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
}: {
  step: number;
  intake: AskIntakeData;
  setIntake: Dispatch<SetStateAction<AskIntakeData>>;
  toggleRedFlag: (option: string) => void;
  redFlags: string[];
  onSubmit: () => void;
  canContinue: boolean;
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

  switch (step) {
    case 0:
      return (
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
        </>
      );
    case 1:
      return (
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
        />
      );
    case 2:
      return (
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
        />
      );
    case 3:
      return (
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
        </>
      );
    case 4:
      return (
        <>
          <h2 className="intake-question intake-question--compact">Did anything change around the time it started?</h2>
          <IntakeVisibleInput
            id="ask-changed"
            label="Type what changed"
            value={intake.whatChanged}
            onChange={(v) => setIntake((p) => ({ ...p, whatChanged: v }))}
            placeholder="Sleep, food, stress, medication, activity..."
            multiline
            onSubmit={onSubmit}
            continueDisabled={!canContinue}
          />
        </>
      );
    case 5:
      return (
        <>
          <h2 className="intake-question intake-question--compact">What have you already tried?</h2>
          <IntakeVisibleInput
            id="ask-tried"
            label="Type what you've tried"
            value={intake.triedSoFar}
            onChange={(v) => setIntake((p) => ({ ...p, triedSoFar: v }))}
            placeholder="Rest, water, medication, talking to someone..."
            multiline
            onSubmit={onSubmit}
            continueDisabled={!canContinue}
          />
        </>
      );
    case 6:
      return (
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
        />
      );
    case 7:
      return (
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
        />
      );
    case 8:
      return (
        <>
          <h2 className="intake-question intake-question--compact">Review your intake</h2>
          <div className="ask-review-grid">
            <div><span>Concern</span><SensitiveBlur sensitive>{intake.mainConcern || '—'}</SensitiveBlur></div>
            <div><span>Type</span>{intake.concernType || '—'}</div>
            <div><span>Timeline</span>{intake.timeline || '—'}</div>
            <div><span>Intensity</span>{intake.intensity}/10</div>
            <div><span>Changes</span>{intake.whatChanged || '—'}</div>
            <div><span>Tried</span>{intake.triedSoFar || '—'}</div>
            <div className="ask-review-grid--wide"><span>Red flags</span>{redFlags.length ? redFlags.join(', ') : '—'}</div>
            <div><span>Help wanted</span>{intake.goal || '—'}</div>
          </div>
        </>
      );
    default:
      return null;
  }
}

export function SafetyEscalation() {
  return null;
}
