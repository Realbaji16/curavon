import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Ban,
  SlidersHorizontal,
  ChevronDown,
  Clock,
  GitBranch,
  BellOff,
  FileText,
  ChevronRight,
  Droplets,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { BlockedReason } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ScreenHeader, SensitiveBlur } from '../components/ScreenHeader';
import { BlockedReasonSheet } from '../components/BottomSheets';
import { DoctorSummary } from '../components/DoctorSummary';
import { StreakCard } from '../components/StreakCard';
import { staggerContainer, fadeUp, tapScale, cardEntrance } from '../motion/variants';

const ACTIONS = {
  default: {
    title: "Today's Next Best Action",
    task: 'Drink a glass of water and log your energy tonight.',
    timeframe: '2 minutes',
    why: 'This helps Healthy.AI understand whether your energy pattern is improving.',
    icon: Droplets,
  },
  adjusted: {
    title: 'Gentler alternative',
    task: 'Take three slow sips of water and note how you feel.',
    timeframe: '1 minute',
    why: 'When energy is low, micro-actions still count. Small wins build momentum.',
    icon: Droplets,
  },
};

const BLOCKED_MESSAGES: Record<NonNullable<BlockedReason>, string> = {
  time: 'Set a 2-minute timer — stand up and take five slow breaths.',
  forgot: 'Leave a glass of water where you\'ll see it tonight.',
  hard: 'Just one sip of water counts. That\'s enough for today.',
  confusing: 'Skip logging tonight — we\'ll keep it simpler next time.',
  worse: 'Rest first. When you\'re ready, a brief note about how you feel helps.',
  cost: 'Drink tap water and take a free 3-minute walk indoors.',
  work: 'Do ten desk stretches while something brews — no extra time needed.',
  other: 'Try the smallest version: one sip, one breath, one minute.',
};

const FLOW_PREVIEW = {
  title: 'Energy & Sleep Flow',
  stage: 'Tracking patterns',
  progress: 2,
  total: 4,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const {
    theme,
    onboardingData,
    actionDone,
    actionAdjusted,
    blockedReason,
    markActionDone,
    adjustAction,
    openBlockedSheet,
    whyExpanded,
    toggleWhyExpanded,
    streak,
    smartSilence,
    setActiveTab,
    openDoctorSummary,
    showDoctorSummary,
    closeDoctorSummary,
  } = useApp();
  const tokens = themes[theme];
  const [showDoneMessage, setShowDoneMessage] = useState(false);
  const [donePressed, setDonePressed] = useState(false);

  let action: {
    title: string;
    task: string;
    timeframe?: string;
    why: string;
    icon: typeof Droplets;
  } = { ...ACTIONS.default };

  if (actionAdjusted && !blockedReason) {
    action = { ...ACTIONS.adjusted, icon: ACTIONS.default.icon };
  }
  if (blockedReason) {
    action = {
      ...ACTIONS.default,
      task: BLOCKED_MESSAGES[blockedReason],
      title: 'Adjusted for today',
      why: 'When something gets in the way, a smaller step still keeps you moving forward.',
    };
  }

  const heroKey = `${actionAdjusted}-${blockedReason}-${action.title}`;

  const handleDone = () => {
    if (actionDone) return;
    setDonePressed(true);
    markActionDone();
    setShowDoneMessage(true);
    if (navigator.vibrate) navigator.vibrate(10);
    setTimeout(() => setDonePressed(false), 280);
  };

  const handleAdjust = () => {
    adjustAction();
  };

  const ActionIcon = action.icon;

  return (
    <div className="screen home-screen">
      <ScreenHeader showThemeToggle />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="home-greeting" variants={fadeUp}>
          <p className="greeting-time" style={{ color: tokens.textMuted }}>{getGreeting()}</p>
          <h2 className="greeting-name" style={{ color: tokens.text }}>
            One step at a time
          </h2>
          <p className="greeting-status" style={{ color: tokens.textSecondary }}>
            {actionDone
              ? 'You completed today\'s action — well done.'
              : 'Your next best action is ready below.'}
          </p>
          {onboardingData.goals.length > 0 && (
            <p className="greeting-goals" style={{ color: tokens.textMuted }}>
              Focus:{' '}
              <SensitiveBlur sensitive>{onboardingData.goals.join(' · ')}</SensitiveBlur>
            </p>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={heroKey}
            className="hero-action-card hero-card hero-action-card--premium"
            variants={cardEntrance}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.2 } }}
            style={{ background: tokens.heroGradient, boxShadow: tokens.shadow }}
          >
            <div className="hero-card-glow" aria-hidden="true" />
            <div className="hero-card-header">
              <ActionIcon size={22} color="#fff" />
              <span className="hero-label">{action.title}</span>
            </div>

            <AnimatePresence mode="wait">
              {actionAdjusted && !blockedReason && (
                <motion.div
                  key="adjust-hint"
                  className="adjust-hint"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <p className="adjust-hint-title">Let&apos;s make this smaller.</p>
                  <p className="adjust-hint-sub">A smaller step still counts.</p>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="hero-task">
              <SensitiveBlur sensitive>{action.task}</SensitiveBlur>
            </p>
            <div className="hero-timeframe">
              <Clock size={14} />
              <span>{action.timeframe ?? '2 minutes'}</span>
            </div>

            <button
              type="button"
              className="hero-why-toggle"
              onClick={toggleWhyExpanded}
            >
              <span>Why this matters</span>
              <motion.span animate={{ rotate: whyExpanded ? 180 : 0 }} transition={{ duration: 0.22 }}>
                <ChevronDown size={16} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {whyExpanded && (
                <motion.p
                  className="hero-why-body"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 0.92 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <SensitiveBlur sensitive>{action.why}</SensitiveBlur>
                </motion.p>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {actionDone && (
                <motion.div
                  className="done-badge"
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 22 }}
                >
                  <motion.span
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.08, type: 'spring', stiffness: 420, damping: 18 }}
                  >
                    <CheckCircle2 size={20} />
                  </motion.span>
                  Completed
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showDoneMessage && actionDone && (
                <motion.p
                  className="done-success-message"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, delay: 0.12 }}
                >
                  Nice. We&apos;ll use this to shape your next step.
                </motion.p>
              )}
            </AnimatePresence>

            <div className="action-buttons">
              <motion.button
                type="button"
                className={`action-btn done-btn ${actionDone ? 'completed' : ''} ${donePressed ? 'done-btn--pressed' : ''}`}
                whileTap={actionDone ? undefined : { scale: 0.94 }}
                onClick={handleDone}
                disabled={actionDone}
              >
                <CheckCircle2 size={18} />
                Done
              </motion.button>
              <motion.button
                type="button"
                className="action-btn blocked-btn"
                {...tapScale}
                onClick={openBlockedSheet}
              >
                <Ban size={18} />
                Blocked
              </motion.button>
              <motion.button
                type="button"
                className="action-btn adjust-btn"
                {...tapScale}
                onClick={handleAdjust}
              >
                <SlidersHorizontal size={18} />
                Adjust
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>

        <motion.button
          type="button"
          className="flow-preview-card warm-card glass-card-inner"
          variants={fadeUp}
          {...tapScale}
          onClick={() => setActiveTab('flow')}
          style={{
            background: tokens.cardGradient,
            border: `1px solid ${tokens.glassBorder}`,
            boxShadow: tokens.shadowSoft,
          }}
        >
          <div className="flow-preview-head">
            <GitBranch size={20} style={{ color: tokens.teal }} />
            <div>
              <p className="flow-preview-label" style={{ color: tokens.textMuted }}>Active health flow</p>
              <p className="flow-preview-title" style={{ color: tokens.text }}>{FLOW_PREVIEW.title}</p>
            </div>
            <ChevronRight size={18} style={{ color: tokens.textMuted }} />
          </div>
          <div className="flow-preview-bar">
            <motion.div
              className="flow-preview-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(FLOW_PREVIEW.progress / FLOW_PREVIEW.total) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
              style={{ background: tokens.teal }}
            />
          </div>
          <p className="flow-preview-stage" style={{ color: tokens.textSecondary }}>
            Stage {FLOW_PREVIEW.progress} of {FLOW_PREVIEW.total} · {FLOW_PREVIEW.stage}
          </p>
        </motion.button>

        <motion.div variants={fadeUp}>
          <StreakCard streakCount={streak} todayDone={actionDone} theme={theme} />
        </motion.div>

        <motion.div
          className="smart-silence-card warm-card glass-card-inner"
          variants={fadeUp}
          style={{
            background: tokens.cardGradient,
            border: `1px solid ${tokens.glassBorder}`,
            boxShadow: tokens.shadowSoft,
          }}
        >
          <div className="section-header">
            <BellOff size={20} style={{ color: tokens.accent }} />
            <h3 style={{ color: tokens.text, margin: 0 }}>Smart Silence</h3>
          </div>
          <ul className="silence-bullets" style={{ color: tokens.textSecondary }}>
            <li>No random reminders — only useful nudges.</li>
            <li>Sensitive details stay hidden when you need privacy.</li>
            <li>
              {smartSilence.dailyDigest ? 'Daily digest on' : 'Daily digest off'} — calm, not noisy.
            </li>
          </ul>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setActiveTab('settings')}
            style={{ color: tokens.primary, marginTop: 8 }}
          >
            Manage in Profile
          </button>
        </motion.div>

        <motion.button
          type="button"
          className="doctor-shortcut-card warm-card glass-card-inner"
          variants={fadeUp}
          {...tapScale}
          onClick={openDoctorSummary}
          style={{
            background: tokens.cardGradient,
            border: `1px solid ${tokens.glassBorder}`,
            boxShadow: tokens.shadowSoft,
          }}
        >
          <FileText size={20} style={{ color: tokens.primary }} />
          <div className="doctor-shortcut-text">
            <span style={{ color: tokens.text, fontWeight: 700 }}>Doctor Summary</span>
            <span style={{ color: tokens.textMuted, fontSize: 13 }}>
              Prepare for your next visit
            </span>
          </div>
          <ChevronRight size={18} style={{ color: tokens.textMuted }} />
        </motion.button>
      </motion.div>

      {showDoctorSummary && (
        <div className="summary-overlay">
          <div className="summary-overlay-backdrop" onClick={closeDoctorSummary} />
          <div className="summary-overlay-panel">
            <DoctorSummary variant="full" onClose={closeDoctorSummary} />
          </div>
        </div>
      )}

      <BlockedReasonSheet />
    </div>
  );
}
