import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Ban,
  SlidersHorizontal,
  BookOpen,
  FileText,
  Sparkles,
  ClipboardCheck,
  CalendarDays,
  AlertTriangle,
  Info,
  GitBranch,
} from 'lucide-react';
import { useApp } from '../context/useApp';
import { useHealth } from '../context/useHealth';
import { useDoctorSummary } from '../context/useDoctorSummary';
import { ScreenHeader, SensitiveBlur } from '../components/ScreenHeader';
import {
  getDiscreetActionPreview,
  getDiscreetActionTitle,
  getDiscreetReasonPreview,
  shouldUseDiscreetDisplay,
} from '../lib/privacy/discreetDisplay';
import { TodayCheckIn } from '../components/TodayCheckIn';
import { HealthActionSheets } from '../components/HealthActionSheets';
import { FullFlowOverlay } from '../components/FullFlowOverlay';
import { buildFullFlowModel } from '../lib/plan/fullFlowBuilder';
import { staggerContainer, fadeUp, tapScale, cardEntrance } from '../motion/variants';
import { buildNextBestActionPlan } from '../utils/nextBestActionEngine';
import { readCuravonMemorySnapshot } from '../utils/nextBestActionMemory';

function formatFocusArea(area: string): string {
  return area.replace(/_/g, ' ');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatTodayLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function categoryLabel(category: string | undefined): string {
  if (!category) return 'stabilize';
  switch (category) {
    case 'stabilize':
      return 'stabilize';
    case 'track':
      return 'track';
    case 'prepare':
      return 'prepare';
    case 'reduce_friction':
      return 'reduce friction';
    case 'escalate':
      return 'escalate';
    default:
      return 'stabilize';
  }
}

export function HomeScreen() {
  const {
    setActiveTab,
    openDoctorSummary,
    openGuidesWithFlow,
    showToast,
  } = useApp();
  const {
    healthProfile,
    dailyCheckins,
    todayCheckIn,
    nextActionState,
    healthSnapshot,
    askHistory,
    followUps,
    redFlagLogs,
    guideResults,
    dueFollowUp,
    openCheckIn,
    markActionDone,
    openHealthBlockedSheet,
    openHealthAdjustSheet,
    saveCurrentActionToSummary,
  } = useHealth();
  const { items: doctorSummaryItems } = useDoctorSummary();
  const [showDoneMessage, setShowDoneMessage] = useState(false);
  const [donePressed, setDonePressed] = useState(false);
  const [showFullFlow, setShowFullFlow] = useState(false);

  const fullFlowModel = useMemo(
    () =>
      buildFullFlowModel({
        nextActionState,
        healthSnapshot,
        healthProfile,
        recentCheckins: dailyCheckins,
        dueFollowUp,
      }),
    [nextActionState, healthSnapshot, healthProfile, dailyCheckins, dueFollowUp],
  );

  const hasCurrentAction = Boolean(nextActionState?.currentAction?.trim());
  const fullFlowLabel = hasCurrentAction ? 'See full flow' : 'How Curavon builds your flow';

  const handleOpenGuidesFromFlow = useCallback(() => {
    if (nextActionState?.relatedGuideFlowId) {
      openGuidesWithFlow(nextActionState.relatedGuideFlowId);
      return;
    }
    setActiveTab('circle');
  }, [nextActionState, openGuidesWithFlow, setActiveTab]);

  const name = healthProfile.preferredName.trim();
  const greetingLine = name ? `${getGreeting()}, ${name}` : 'Welcome back';
  const sensitiveMode = healthProfile.sensitiveMode;
  const actionText = nextActionState?.currentAction ?? '';
  const isDiscreetCompact = shouldUseDiscreetDisplay(sensitiveMode, nextActionState?.privacyLevel);
  const heroTitle = getDiscreetActionTitle(nextActionState?.title, isDiscreetCompact);
  const heroReason = getDiscreetReasonPreview(nextActionState?.reason, isDiscreetCompact);
  const heroAction = getDiscreetActionPreview(actionText, isDiscreetCompact);
  const hasCheckInToday = Boolean(todayCheckIn);
  const actionStatus = nextActionState?.status ?? 'pending';
  const isDone = actionStatus === 'done';

  const personalizationPlan = useMemo(() => {
    const snapshot = readCuravonMemorySnapshot(
      { healthProfile, dailyCheckins, nextActionState, askHistory },
      { doctorSummaryItems, redFlagLogs, followUps, askHistory, guideResults },
    );
    return buildNextBestActionPlan(snapshot, healthSnapshot);
  }, [healthProfile, dailyCheckins, nextActionState, askHistory, doctorSummaryItems, redFlagLogs, followUps, guideResults, healthSnapshot]);

  const noCheckInSignal = !hasCheckInToday && !hasCurrentAction;
  const canRespondToAction = hasCurrentAction;

  const safetyNote =
    nextActionState?.safetyLevel && nextActionState.safetyLevel !== 'normal'
      ? 'If symptoms are severe, sudden, or unsafe, seek local urgent or emergency support.'
      : null;
  const sourceChips = (nextActionState?.sourceSignals ?? []).slice(0, 3);

  const handleDone = () => {
    if (isDone || !canRespondToAction) return;
    setDonePressed(true);
    markActionDone();
    setShowDoneMessage(true);
    if (navigator.vibrate) navigator.vibrate(10);
    setTimeout(() => setDonePressed(false), 280);
  };

  const handleRelatedGuide = () => {
    if (nextActionState?.relatedGuideFlowId) {
      openGuidesWithFlow(nextActionState.relatedGuideFlowId);
      return;
    }
    setActiveTab('circle');
    const guideName = nextActionState?.relatedGuide;
    if (guideName) {
      showToast(`Recommended guide: ${guideName}`);
    }
  };

  return (
    <div className="screen home-screen home-screen--today">
      <ScreenHeader showThemeToggle compact />

      <motion.div className="home-today-stack" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.header className="home-greeting home-greeting--today" variants={fadeUp}>
          <span className="home-date-pill">
            <CalendarDays size={14} aria-hidden="true" />
            {formatTodayLabel()}
          </span>
          <h1 className="home-greeting-title">{greetingLine}</h1>
          <p className="home-greeting-lede">One safer next step based on what you&apos;ve shared.</p>
        </motion.header>

        <motion.section className="home-pattern-card warm-card glass-card-inner" variants={fadeUp}>
          <p className="home-pattern-label">Your current pattern</p>
          <p className="home-pattern-summary">{healthSnapshot.trendSummary}</p>
          <p className="home-pattern-focus">
            Focus area: <strong>{formatFocusArea(healthSnapshot.recommendedFocusArea)}</strong>
          </p>
        </motion.section>

        <AnimatePresence mode="wait">
          <motion.section
            key={nextActionState?.actionId ?? 'hero-action'}
            className="home-hero-card hero-action-card hero-card hero-action-card--premium"
            variants={cardEntrance}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.2 } }}
            aria-label="Today's next best action"
          >
            <div className="hero-card-glow" aria-hidden="true" />
            <div className="home-hero-top">
              <div className="hero-card-header">
                <span className="home-hero-icon-wrap" aria-hidden="true">
                  <Sparkles size={20} />
                </span>
                <div>
                  <span className="hero-label">{heroTitle}</span>
                  <p className="home-hero-sub">One clear step — calm and safe.</p>
                </div>
              </div>
              <span
                className={`home-status-pill ${hasCheckInToday ? 'home-status-pill--ready' : ''}`}
                title="Primary action category"
              >
                {categoryLabel(nextActionState?.category)}
              </span>
            </div>

            {noCheckInSignal ? (
              <div className="home-hero-empty">
                <div className="home-hero-empty-icon" aria-hidden="true">
                  <ClipboardCheck size={28} strokeWidth={1.5} />
                </div>
                <p className="hero-task hero-task--prompt">
                  Complete today&apos;s check-in to get your next safe step.
                </p>
                <motion.button
                  type="button"
                  className="btn btn-primary checkin-start-btn"
                  {...tapScale}
                  onClick={openCheckIn}
                >
                  Start check-in
                </motion.button>
                <div className="home-hero-flow-footer">
                  <button
                    type="button"
                    className="home-text-link home-fullflow-link"
                    onClick={() => setShowFullFlow(true)}
                  >
                    <GitBranch size={14} aria-hidden="true" />
                    {fullFlowLabel}
                  </button>
                </div>
              </div>
            ) : (
              <div className="home-hero-body">
                {!hasCheckInToday ? (
                  <p className="home-hero-note">
                    You can do this step now. A quick check-in later helps Curavon refine what comes next.
                  </p>
                ) : null}
                {actionStatus === 'adjusted' && (
                  <p className="home-hero-note">A smaller version of your step.</p>
                )}
                {actionStatus === 'blocked' && (
                  <p className="home-hero-note">We&apos;ll keep this gentle for today.</p>
                )}
                <p className="home-hero-why-label">Why this step</p>
                <p className="home-hero-why-text">{heroReason}</p>
                <p className="hero-task hero-task--action">
                  {isDiscreetCompact ? (
                    heroAction
                  ) : (
                    <SensitiveBlur sensitive={sensitiveMode}>
                      {nextActionState?.currentAction || actionText}
                    </SensitiveBlur>
                  )}
                </p>
                {safetyNote ? (
                  <p className="hero-safety-note">
                    <AlertTriangle size={14} />
                    {safetyNote}
                  </p>
                ) : null}

                {sourceChips.length ? (
                  <div className="hero-source-chips hero-source-chips--compact">
                    {sourceChips.map((chip) => (
                      <span key={chip} className="hero-source-chip">
                        {chip.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                ) : null}

                {nextActionState?.watchFor && !isDiscreetCompact ? (
                  <p className="home-hero-note home-hero-note--watch">Watch for: {nextActionState.watchFor}</p>
                ) : null}

                <div className="action-buttons action-buttons--today">
                  <motion.button
                    type="button"
                    className={`btn btn-primary action-btn action-btn--done ${isDone ? 'completed' : ''} ${donePressed ? 'done-btn--pressed' : ''}`}
                    whileTap={isDone ? undefined : { scale: 0.98 }}
                    onClick={handleDone}
                    disabled={isDone || !canRespondToAction}
                  >
                    <CheckCircle2 size={18} />
                    {isDone ? 'Completed' : 'Mark as done'}
                  </motion.button>

                  {!isDone && canRespondToAction ? (
                    <div className="action-btn-row action-btn-row--split">
                      <motion.button
                        type="button"
                        className="action-btn btn-health-blocked blocked-btn"
                        {...tapScale}
                        onClick={openHealthBlockedSheet}
                      >
                        <Ban size={16} />
                        Blocked
                      </motion.button>
                      <motion.button
                        type="button"
                        className="action-btn btn-health-adjust adjust-btn"
                        {...tapScale}
                        onClick={openHealthAdjustSheet}
                      >
                        <SlidersHorizontal size={16} />
                        Adjust
                      </motion.button>
                    </div>
                  ) : null}

                  <div className="action-btn-row action-btn-row--links">
                    {(nextActionState?.relatedGuide) ? (
                      <button
                        type="button"
                        className="action-link-btn"
                        onClick={handleRelatedGuide}
                      >
                        <BookOpen size={14} aria-hidden="true" />
                        Related guide
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="action-link-btn"
                      onClick={saveCurrentActionToSummary}
                    >
                      <FileText size={14} aria-hidden="true" />
                      Add to summary
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {showDoneMessage && isDone && (
                    <motion.p
                      className="done-success-message done-success-message--today"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                    >
                      <CheckCircle2 size={16} aria-hidden="true" />
                      Nice. Curavon will remember this as completed.
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="home-hero-flow-footer">
                  <button
                    type="button"
                    className="home-text-link home-fullflow-link"
                    onClick={() => setShowFullFlow(true)}
                  >
                    <GitBranch size={14} aria-hidden="true" />
                    {fullFlowLabel}
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        <motion.p className="home-section-label" variants={fadeUp}>
          Supporting insights
        </motion.p>
        <motion.p className="home-section-desc" variants={fadeUp}>
          Context from your data — read-only, to explain your next best action.
        </motion.p>

        <motion.div className="home-glance-grid" variants={fadeUp}>
          {personalizationPlan.supportingInsights.map((card) => (
            <section key={card.id} className="home-support-card warm-card glass-card-inner">
              <div className="home-card-head">
                <span className="home-card-icon home-card-icon--teal" aria-hidden="true">
                  <Info size={18} />
                </span>
                <div>
                  <h3>{card.title}</h3>
                  <p className="home-card-sub">
                    {card.subtitle ?? 'Context for your next best action.'}
                  </p>
                </div>
              </div>
              <ul className="home-insight-list">
                {card.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ))}

        </motion.div>
      </motion.div>

      <TodayCheckIn />
      <HealthActionSheets />
      <FullFlowOverlay
        isOpen={showFullFlow}
        onClose={() => setShowFullFlow(false)}
        model={fullFlowModel}
        onOpenDoctorSummary={openDoctorSummary}
        onOpenGuides={handleOpenGuidesFromFlow}
        onOpenAsk={() => setActiveTab('ask')}
      />
    </div>
  );
}
