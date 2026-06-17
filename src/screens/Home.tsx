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
    why: 'This helps Curavon understand whether your energy pattern is improving.',
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

const RECENT_CONCERNS = [
  { label: 'Afternoon energy dips', updated: '2 days ago' },
  { label: 'Sleep routine', updated: 'This week' },
];

export function HomeScreen() {
  const {
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
          <p className="greeting-time">{getGreeting()}, Alex</p>
          <h2 className="greeting-name">Today&apos;s next best action</h2>
          <p className="greeting-status">
            {actionDone
              ? 'You completed today\'s action — well done.'
              : 'One clear, safe step is ready when you are.'}
          </p>
          {onboardingData.goals.length > 0 && (
            <p className="greeting-goals">
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
          >
            <div className="hero-card-glow" aria-hidden="true" />
            <div className="hero-card-header">
              <ActionIcon size={22} className="hero-card-icon" />
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
                className={`action-btn btn-health-done done-btn ${actionDone ? 'completed' : ''} ${donePressed ? 'done-btn--pressed' : ''}`}
                whileTap={actionDone ? undefined : { scale: 0.94 }}
                onClick={handleDone}
                disabled={actionDone}
              >
                <CheckCircle2 size={18} />
                Done
              </motion.button>
              <motion.button
                type="button"
                className="action-btn btn-health-blocked blocked-btn"
                {...tapScale}
                onClick={openBlockedSheet}
              >
                <Ban size={18} />
                Blocked
              </motion.button>
              <motion.button
                type="button"
                className="action-btn btn-health-adjust adjust-btn"
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
        >
          <div className="flow-preview-head">
            <GitBranch size={20} className="icon-teal" />
            <div>
              <p className="flow-preview-label">Active health flow</p>
              <p className="flow-preview-title">{FLOW_PREVIEW.title}</p>
            </div>
            <ChevronRight size={18} className="icon-muted" />
          </div>
          <div className="flow-preview-bar">
            <motion.div
              className="flow-preview-fill"
              initial={{ width: 0 }}
              animate={{ width: `${(FLOW_PREVIEW.progress / FLOW_PREVIEW.total) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.25 }}
            />
          </div>
          <p className="flow-preview-stage">
            Stage {FLOW_PREVIEW.progress} of {FLOW_PREVIEW.total} · {FLOW_PREVIEW.stage}
          </p>
        </motion.button>

        <motion.div
          className="recent-concerns-card warm-card glass-card-inner"
          variants={fadeUp}
        >
          <div className="section-header">
            <h3>Recent concerns</h3>
          </div>
          <ul className="recent-concerns-list">
            {RECENT_CONCERNS.map((concern) => (
              <li key={concern.label} className="recent-concern-item">
                <span className="recent-concern-label">
                  <SensitiveBlur sensitive>{concern.label}</SensitiveBlur>
                </span>
                <span className="recent-concern-meta">{concern.updated}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div variants={fadeUp}>
          <StreakCard streakCount={streak} todayDone={actionDone} />
        </motion.div>

        <motion.div
          className="smart-silence-card warm-card glass-card-inner"
          variants={fadeUp}
        >
          <div className="section-header">
            <BellOff size={20} className="icon-accent" />
            <h3>Smart Silence</h3>
          </div>
          <ul className="silence-bullets">
            <li>No random reminders — only useful nudges.</li>
            <li>Sensitive details stay hidden when you need privacy.</li>
            <li>
              {smartSilence.dailyDigest ? 'Daily digest on' : 'Daily digest off'} — calm, not noisy.
            </li>
          </ul>
          <button
            type="button"
            className="btn btn-secondary btn-glass ghost-button text-link-warm"
            onClick={() => setActiveTab('settings')}
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
        >
          <FileText size={20} className="icon-warm" />
          <div className="doctor-shortcut-text">
            <span>Doctor Summary</span>
            <span>
              Prepare for your next visit
            </span>
          </div>
          <ChevronRight size={18} className="icon-muted" />
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
