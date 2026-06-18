import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useHealth } from '../context/HealthContext';
import { ScreenHeader, SensitiveBlur } from '../components/ScreenHeader';
import { TodayCheckIn } from '../components/TodayCheckIn';
import { HealthActionSheets } from '../components/HealthActionSheets';
import { staggerContainer, fadeUp, tapScale, cardEntrance } from '../motion/variants';
import { buildNextBestActionPlan } from '../utils/nextBestActionEngine';
import { readCuravonMemorySnapshot } from '../utils/nextBestActionMemory';
import type { SupportingInsightCard } from '../types/nextBestAction';
import { buildNextBestAction, type ActionEngineCategory } from '../utils/actionEngineV2';

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

function categoryLabel(category: ActionEngineCategory | string | undefined): string {
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
    sensitiveMode,
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
    openCheckIn,
    markActionDone,
    openHealthBlockedSheet,
    openHealthAdjustSheet,
    saveCurrentActionToSummary,
  } = useHealth();
  const [showDoneMessage, setShowDoneMessage] = useState(false);
  const [donePressed, setDonePressed] = useState(false);

  const name = healthProfile.preferredName.trim();
  const greetingLine = name ? `${getGreeting()}, ${name}` : 'Welcome back';
  const hasCheckInToday = Boolean(todayCheckIn);
  const actionStatus = nextActionState?.status ?? 'pending';
  const isDone = actionStatus === 'done';
  const actionText = nextActionState?.currentAction ?? '';

  const personalizationPlan = useMemo(() => {
    const snapshot = readCuravonMemorySnapshot();
    const merged = {
      ...snapshot,
      healthProfile,
      dailyCheckins,
      nextActionState,
    };
    return buildNextBestActionPlan(merged);
  }, [healthProfile, dailyCheckins, nextActionState]);

  const activeRecommendation = useMemo(
    () => buildNextBestAction(healthSnapshot),
    [healthSnapshot, dailyCheckins, nextActionState],
  );

  const noCheckInSignal = personalizationPlan.signals.includes('no_checkin_today');
  const canRespondToAction = Boolean(nextActionState) && !noCheckInSignal;

  const safetyNote =
    activeRecommendation.primaryAction.safetyLevel === 'normal'
      ? null
      : 'If symptoms are severe, sudden, or unsafe, seek local urgent or emergency support.';

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
    const guideName = nextActionState?.relatedGuide ?? activeRecommendation.primaryAction.relatedGuide;
    if (guideName) {
      showToast(`Recommended guide: ${guideName}`);
    }
  };

  const handleInsightAction = (card: SupportingInsightCard) => {
    if (card.actionTarget === 'checkin') {
      openCheckIn();
      return;
    }
    if (card.actionTarget === 'summary') {
      openDoctorSummary();
      return;
    }
    if (card.actionTarget === 'profile') {
      setActiveTab('settings');
      return;
    }
    if (card.actionTarget === 'guides') {
      setActiveTab('circle');
    }
  };

  return (
    <div className="screen home-screen home-screen--today">
      <ScreenHeader showThemeToggle />

      <motion.div className="home-today-stack" variants={staggerContainer} initial="hidden" animate="visible">
        <motion.header className="home-greeting home-greeting--today" variants={fadeUp}>
          <span className="home-date-pill">
            <CalendarDays size={14} aria-hidden="true" />
            {formatTodayLabel()}
          </span>
          <h1 className="home-greeting-title">{greetingLine}</h1>
          <p className="home-greeting-lede">One gentle step based on what you&apos;ve shared.</p>
        </motion.header>

        <motion.section className="home-pattern-card warm-card glass-card-inner" variants={fadeUp}>
          <p className="home-pattern-label">Your current pattern</p>
          <p className="home-pattern-summary">{healthSnapshot.trendSummary}</p>
          <p className="home-pattern-focus">
            Focus area: <strong>{healthSnapshot.recommendedFocusArea}</strong>
          </p>
        </motion.section>

        <AnimatePresence mode="wait">
          <motion.section
            key={nextActionState?.actionId ?? activeRecommendation.primaryAction.title}
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
                  <span className="hero-label">{activeRecommendation.primaryAction.title}</span>
                  <p className="home-hero-sub">One clear step — calm and safe.</p>
                </div>
              </div>
              <span
                className={`home-status-pill ${hasCheckInToday ? 'home-status-pill--ready' : ''}`}
                title="Primary action category"
              >
                {categoryLabel(nextActionState?.category ?? activeRecommendation.primaryAction.category)}
              </span>
            </div>

            {noCheckInSignal ? (
              <div className="home-hero-empty">
                <div className="home-hero-empty-icon" aria-hidden="true">
                  <ClipboardCheck size={28} strokeWidth={1.5} />
                </div>
                <p className="hero-task hero-task--prompt">
                  {activeRecommendation.primaryAction.action}
                </p>
                <motion.button
                  type="button"
                  className="btn btn-primary checkin-start-btn"
                  {...tapScale}
                  onClick={openCheckIn}
                >
                  Start check-in
                </motion.button>
              </div>
            ) : (
              <div className="home-hero-body">
                {actionStatus === 'adjusted' && (
                  <p className="home-hero-note">A smaller version of your step.</p>
                )}
                {actionStatus === 'blocked' && (
                  <p className="home-hero-note">We&apos;ll keep this gentle for today.</p>
                )}
                <p className="home-hero-why-label">Why this step</p>
                <p className="home-hero-why-text">{activeRecommendation.primaryAction.reason}</p>
                <p className="hero-task hero-task--action">
                  <SensitiveBlur sensitive={sensitiveMode}>
                    {nextActionState?.currentAction || activeRecommendation.primaryAction.action || actionText}
                  </SensitiveBlur>
                </p>
                {activeRecommendation.supportingInsight ? (
                  <p className="home-hero-note">{activeRecommendation.supportingInsight}</p>
                ) : null}

                {safetyNote ? (
                  <p className="hero-safety-note">
                    <AlertTriangle size={14} />
                    {safetyNote}
                  </p>
                ) : null}

                <AnimatePresence>
                  {isDone && (
                    <motion.div
                      className="done-badge done-badge--today"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                    >
                      <CheckCircle2 size={20} />
                      Completed
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showDoneMessage && isDone && (
                    <motion.p
                      className="done-success-message done-success-message--today"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      Nice. Curavon will remember this as completed.
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="action-buttons action-buttons--today">
                  {(nextActionState?.relatedGuide || activeRecommendation.primaryAction.relatedGuide) ? (
                    <motion.button
                      type="button"
                      className="action-btn btn-health-adjust adjust-btn"
                      {...tapScale}
                      onClick={handleRelatedGuide}
                    >
                      <BookOpen size={18} />
                      Related guide
                    </motion.button>
                  ) : null}
                  <motion.button
                    type="button"
                    className="action-btn btn-health-blocked blocked-btn"
                    {...tapScale}
                    onClick={saveCurrentActionToSummary}
                  >
                    <FileText size={18} />
                    Add to summary
                  </motion.button>
                  <motion.button
                    type="button"
                    className={`action-btn btn-health-done done-btn ${isDone ? 'completed' : ''} ${donePressed ? 'done-btn--pressed' : ''}`}
                    whileTap={isDone ? undefined : { scale: 0.94 }}
                    onClick={handleDone}
                    disabled={isDone || !canRespondToAction}
                  >
                    <CheckCircle2 size={18} />
                    Done
                  </motion.button>
                  <motion.button
                    type="button"
                    className="action-btn btn-health-blocked blocked-btn"
                    {...tapScale}
                    onClick={openHealthBlockedSheet}
                    disabled={isDone || !canRespondToAction}
                  >
                    <Ban size={18} />
                    Blocked
                  </motion.button>
                  <motion.button
                    type="button"
                    className="action-btn btn-health-adjust adjust-btn"
                    {...tapScale}
                    onClick={openHealthAdjustSheet}
                    disabled={isDone || !canRespondToAction}
                  >
                    <SlidersHorizontal size={18} />
                    Adjust
                  </motion.button>
                </div>
              </div>
            )}
          </motion.section>
        </AnimatePresence>

        <motion.p className="home-section-label" variants={fadeUp}>
          Supporting insights
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
                  <p className="home-card-sub">Based on your latest check-ins and notes.</p>
                </div>
              </div>
              <ul className="home-insight-list">
                {card.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              {card.actionLabel ? (
                <button
                  type="button"
                  className="home-text-link"
                  onClick={() => handleInsightAction(card)}
                >
                  {card.actionLabel}
                </button>
              ) : null}
            </section>
          ))}

        </motion.div>
      </motion.div>

      <TodayCheckIn />
      <HealthActionSheets />
    </div>
  );
}
