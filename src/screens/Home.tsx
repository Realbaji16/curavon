import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  Ban,
  SlidersHorizontal,
  ChevronRight,
  BellOff,
  FileText,
  Sparkles,
  Moon,
  Zap,
  Wind,
  MessageCircle,
  ClipboardCheck,
  CalendarDays,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useHealth } from '../context/HealthContext';
import { ScreenHeader, SensitiveBlur } from '../components/ScreenHeader';
import { TodayCheckIn } from '../components/TodayCheckIn';
import { HealthActionSheets } from '../components/HealthActionSheets';
import { staggerContainer, fadeUp, tapScale, cardEntrance } from '../motion/variants';

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

const RHYTHM_METRICS = [
  { key: 'sleepQuality' as const, label: 'Sleep', icon: Moon },
  { key: 'energyLevel' as const, label: 'Energy', icon: Zap },
  { key: 'stressLevel' as const, label: 'Stress', icon: Wind },
];

export function HomeScreen() {
  const {
    sensitiveMode,
    setActiveTab,
    openDoctorSummary,
  } = useApp();
  const {
    healthProfile,
    todayCheckIn,
    nextActionState,
    openCheckIn,
    markActionDone,
    openHealthBlockedSheet,
    openHealthAdjustSheet,
    smartSilenceLabel,
    recentConcerns,
  } = useHealth();

  const [showDoneMessage, setShowDoneMessage] = useState(false);
  const [donePressed, setDonePressed] = useState(false);

  const name = healthProfile.preferredName.trim();
  const greetingLine = name ? `${getGreeting()}, ${name}` : 'Welcome back';
  const hasCheckInToday = Boolean(todayCheckIn);
  const actionStatus = nextActionState?.status ?? 'pending';
  const isDone = actionStatus === 'done';
  const actionText = nextActionState?.currentAction ?? '';

  const handleDone = () => {
    if (isDone || !hasCheckInToday) return;
    setDonePressed(true);
    markActionDone();
    setShowDoneMessage(true);
    if (navigator.vibrate) navigator.vibrate(10);
    setTimeout(() => setDonePressed(false), 280);
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

        <AnimatePresence mode="wait">
          <motion.section
            key={hasCheckInToday ? actionText : 'no-checkin'}
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
                  <span className="hero-label">Today&apos;s next best action</span>
                  <p className="home-hero-sub">One clear step — calm and safe.</p>
                </div>
              </div>
              <span className={`home-status-pill ${hasCheckInToday ? 'home-status-pill--ready' : ''}`}>
                {hasCheckInToday ? 'Check-in saved' : 'Check-in pending'}
              </span>
            </div>

            {!hasCheckInToday ? (
              <div className="home-hero-empty">
                <div className="home-hero-empty-icon" aria-hidden="true">
                  <ClipboardCheck size={28} strokeWidth={1.5} />
                </div>
                <p className="hero-task hero-task--prompt">
                  Start today&apos;s check-in to help Curavon suggest one clearer next step.
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
                <p className="hero-task hero-task--action">
                  <SensitiveBlur sensitive={sensitiveMode}>{actionText}</SensitiveBlur>
                </p>
                {nextActionState?.source && (
                  <p className="hero-source">
                    <span className="hero-source-dot" aria-hidden="true" />
                    From {nextActionState.source}
                  </p>
                )}

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
                  <motion.button
                    type="button"
                    className={`action-btn btn-health-done done-btn ${isDone ? 'completed' : ''} ${donePressed ? 'done-btn--pressed' : ''}`}
                    whileTap={isDone ? undefined : { scale: 0.94 }}
                    onClick={handleDone}
                    disabled={isDone}
                  >
                    <CheckCircle2 size={18} />
                    Done
                  </motion.button>
                  <motion.button
                    type="button"
                    className="action-btn btn-health-blocked blocked-btn"
                    {...tapScale}
                    onClick={openHealthBlockedSheet}
                    disabled={isDone}
                  >
                    <Ban size={18} />
                    Blocked
                  </motion.button>
                  <motion.button
                    type="button"
                    className="action-btn btn-health-adjust adjust-btn"
                    {...tapScale}
                    onClick={openHealthAdjustSheet}
                    disabled={isDone}
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
          At a glance
        </motion.p>

        <motion.div className="home-glance-grid" variants={fadeUp}>
          <section className="home-support-card health-rhythm-card warm-card glass-card-inner">
            <div className="home-card-head">
              <span className="home-card-icon home-card-icon--teal" aria-hidden="true">
                <Moon size={18} />
              </span>
              <div>
                <h3>Your health rhythm</h3>
                <p className="home-card-sub">How today feels so far</p>
              </div>
            </div>
            {todayCheckIn ? (
              <div className="health-rhythm-metrics">
                {RHYTHM_METRICS.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="rhythm-metric">
                    <span className="rhythm-metric-icon" aria-hidden="true">
                      <Icon size={15} />
                    </span>
                    <span className="rhythm-metric-label">{label}</span>
                    <strong className="rhythm-metric-value">{todayCheckIn[key]}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <div className="health-rhythm-empty">
                {RHYTHM_METRICS.map(({ label, icon: Icon }) => (
                  <div key={label} className="rhythm-metric rhythm-metric--empty">
                    <span className="rhythm-metric-icon" aria-hidden="true">
                      <Icon size={15} />
                    </span>
                    <span className="rhythm-metric-label">{label}</span>
                    <span className="rhythm-metric-placeholder">—</span>
                  </div>
                ))}
                <p className="home-card-footnote">No check-in yet today.</p>
              </div>
            )}
          </section>

          <section className="home-support-card recent-concerns-card warm-card glass-card-inner">
            <div className="home-card-head">
              <span className="home-card-icon home-card-icon--warm" aria-hidden="true">
                <MessageCircle size={18} />
              </span>
              <div>
                <h3>Recent concerns</h3>
                <p className="home-card-sub">Symptoms &amp; notes Curavon remembers</p>
              </div>
            </div>
            {recentConcerns.length > 0 ? (
              <ul className="recent-concerns-list recent-concerns-list--today">
                {recentConcerns.map((concern, i) => (
                  <li key={`${concern}-${i}`} className="recent-concern-item">
                    <span className="recent-concern-dot" aria-hidden="true" />
                    <span className="recent-concern-label">
                      <SensitiveBlur sensitive={sensitiveMode}>{concern}</SensitiveBlur>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="home-card-empty-copy">
                Symptoms and notes from check-ins will appear here.
              </p>
            )}
          </section>
        </motion.div>

        <motion.p className="home-section-label" variants={fadeUp}>
          Support tools
        </motion.p>

        <motion.button
          type="button"
          className="home-support-card home-feature-card doctor-shortcut-card warm-card glass-card-inner"
          variants={fadeUp}
          {...tapScale}
          onClick={openDoctorSummary}
        >
          <span className="home-feature-accent" aria-hidden="true" />
          <span className="home-card-icon home-card-icon--teal home-feature-icon" aria-hidden="true">
            <FileText size={20} />
          </span>
          <div className="doctor-shortcut-text">
            <span className="doctor-shortcut-title">Doctor-ready summary</span>
            <span className="doctor-shortcut-desc">
              Turn recent notes, symptoms, and actions into a clear summary.
            </span>
          </div>
          <ChevronRight size={18} className="icon-muted home-feature-chevron" />
        </motion.button>

        <motion.section
          className="home-support-card smart-silence-card warm-card glass-card-inner"
          variants={fadeUp}
        >
          <div className="smart-silence-row">
            <span className="home-card-icon home-card-icon--accent" aria-hidden="true">
              <BellOff size={18} />
            </span>
            <div className="smart-silence-copy">
              <h3>Smart Silence</h3>
              <p>No random reminders. Only useful nudges.</p>
            </div>
          </div>
          <div className="smart-silence-footer">
            <span className="smart-silence-badge">{smartSilenceLabel}</span>
            <button
              type="button"
              className="home-text-link"
              onClick={() => setActiveTab('settings')}
            >
              Manage in Profile
            </button>
          </div>
        </motion.section>
      </motion.div>

      <TodayCheckIn />
      <HealthActionSheets />
    </div>
  );
}
