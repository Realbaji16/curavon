import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Ban,
  SlidersHorizontal,
  ChevronDown,
  Flame,
  Star,
  Trophy,
  Droplets,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ScreenHeader, SensitiveBlur } from '../components/ScreenHeader';
import { BlockedReasonSheet } from '../components/BottomSheets';

const ACTIONS = {
  default: {
    title: 'One Next Best Action',
    task: 'Hydrate with 500ml of water and stretch for 5 minutes',
    why: 'Morning hydration kickstarts your metabolism and gentle stretching reduces overnight stiffness. This combo takes under 6 minutes and sets a calm tone for your day.',
    icon: Droplets,
  },
  adjusted: {
    title: 'Gentler Alternative',
    task: 'Take 3 slow sips of water and do one shoulder roll',
    why: 'When energy is low, micro-actions still count. Small wins build momentum without overwhelming you.',
    icon: Droplets,
  },
  blocked: {
    time: 'Set a 2-minute timer — just stand up and take 5 deep breaths',
    motivation: 'No action needed right now. Rest is valid. Check back when you feel ready.',
    stress: 'Try box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat twice.',
    cost: 'Drink tap water and do a free 3-minute walk around your space',
    work: 'Do 10 desk stretches while your coffee brews — no extra time needed',
  },
};

const WEEKLY_WINS = [
  { icon: '🌙', label: 'Sleep streak' },
  { icon: '💧', label: 'Hydration hero' },
  { icon: '🧘', label: 'Mindful moment' },
];

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
    healthPoints,
  } = useApp();
  const tokens = themes[theme];
  const [celebrating, setCelebrating] = useState(false);

  let action = ACTIONS.default;
  if (actionAdjusted && !blockedReason) {
    action = ACTIONS.adjusted;
  }
  if (blockedReason) {
    action = {
      ...ACTIONS.adjusted,
      task: ACTIONS.blocked[blockedReason],
    };
  }

  const handleDone = () => {
    if (actionDone) return;
    setCelebrating(true);
    markActionDone();
    if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    setTimeout(() => setCelebrating(false), 1200);
  };

  const ActionIcon = action.icon;

  return (
    <div className="screen home-screen">
      <ScreenHeader showThemeToggle />

      <div className="home-greeting">
        <p className="greeting-time" style={{ color: tokens.textMuted }}>
          {getGreeting()}, friend
        </p>
        <h2 className="greeting-name" style={{ color: tokens.text }}>
          Ready for today's step?
        </h2>
        {onboardingData.goals.length > 0 && (
          <p className="greeting-goals" style={{ color: tokens.textSecondary }}>
            Focusing on{' '}
            <SensitiveBlur sensitive>
              {onboardingData.goals.join(' & ')}
            </SensitiveBlur>
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={`${actionAdjusted}-${blockedReason}-${actionDone}`}
          className="hero-action-card"
          initial={{ opacity: 0, rotateY: actionAdjusted ? -90 : 0 }}
          animate={{ opacity: 1, rotateY: 0 }}
          exit={{ opacity: 0, rotateY: 90 }}
          transition={{ duration: 0.4 }}
          style={{
            background: tokens.heroGradient,
            boxShadow: tokens.shadow,
          }}
        >
          {celebrating && (
            <motion.div
              className="celebration-burst"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 2.5, opacity: 0 }}
              transition={{ duration: 1 }}
            />
          )}

          <div className="hero-card-header">
            <ActionIcon size={24} color="#fff" />
            <span className="hero-label">{action.title}</span>
          </div>

          <p className="hero-task">
            <SensitiveBlur sensitive>{action.task}</SensitiveBlur>
          </p>

          {actionDone && (
            <motion.div
              className="done-badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <CheckCircle2 size={20} />
              Completed!
            </motion.div>
          )}

          <div className="action-buttons">
            <motion.button
              className={`action-btn done-btn ${actionDone ? 'completed' : ''}`}
              whileTap={{ scale: 0.92 }}
              onClick={handleDone}
              disabled={actionDone}
            >
              <CheckCircle2 size={18} />
              Done
            </motion.button>
            <motion.button
              className="action-btn blocked-btn"
              whileTap={{ scale: 0.92 }}
              onClick={openBlockedSheet}
            >
              <Ban size={18} />
              Blocked
            </motion.button>
            <motion.button
              className="action-btn adjust-btn"
              whileTap={{ scale: 0.92 }}
              onClick={adjustAction}
            >
              <SlidersHorizontal size={18} />
              Adjust
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      <div
        className="accordion"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.border}`,
          boxShadow: tokens.shadow,
        }}
      >
        <button
          className="accordion-header"
          onClick={toggleWhyExpanded}
          style={{ color: tokens.text }}
        >
          <span>Why This Action</span>
          <motion.span
            animate={{ rotate: whyExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown size={20} style={{ color: tokens.textMuted }} />
          </motion.span>
        </button>
        <AnimatePresence>
          {whyExpanded && (
            <motion.div
              className="accordion-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ color: tokens.textMuted }}
            >
              <SensitiveBlur sensitive>{action.why}</SensitiveBlur>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className="progress-card"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.border}`,
          boxShadow: tokens.shadow,
        }}
      >
        <h3 className="progress-title" style={{ color: tokens.text }}>
          Your Progress
        </h3>
        <div className="progress-stats">
          <div className="stat-item">
            <div
              className="stat-icon-wrap"
              style={{ background: tokens.primarySoft }}
            >
              <Flame size={22} style={{ color: tokens.primary }} />
            </div>
            <span className="stat-value" style={{ color: tokens.text }}>
              {streak}
            </span>
            <span className="stat-label" style={{ color: tokens.textMuted }}>
              Day Streak
            </span>
          </div>
          <div className="stat-item">
            <div
              className="stat-icon-wrap"
              style={{ background: tokens.accentSoft }}
            >
              <Star size={22} style={{ color: tokens.accent }} />
            </div>
            <span className="stat-value" style={{ color: tokens.text }}>
              {healthPoints}
            </span>
            <span className="stat-label" style={{ color: tokens.textMuted }}>
              Health Points
            </span>
          </div>
          <div className="stat-item">
            <div
              className="stat-icon-wrap"
              style={{ background: tokens.primarySoft }}
            >
              <Trophy size={22} style={{ color: tokens.primary }} />
            </div>
            <span className="stat-value" style={{ color: tokens.text }}>
              {WEEKLY_WINS.length}
            </span>
            <span className="stat-label" style={{ color: tokens.textMuted }}>
              Weekly Wins
            </span>
          </div>
        </div>
        <div className="weekly-badges">
          {WEEKLY_WINS.map((w) => (
            <div
              key={w.label}
              className="win-badge"
              style={{
                background: tokens.surfaceElevated,
                border: `1px solid ${tokens.border}`,
              }}
            >
              <span className="badge-emoji">{w.icon}</span>
              <span style={{ color: tokens.textSecondary }}>{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      <BlockedReasonSheet />
    </div>
  );
}
