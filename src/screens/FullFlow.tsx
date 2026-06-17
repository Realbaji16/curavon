import { motion } from 'framer-motion';
import { CheckCircle2, Circle, AlertCircle, FileText, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ScreenHeader } from '../components/ScreenHeader';
import { DoctorSummary } from '../components/DoctorSummary';
import { staggerContainer, fadeUp, tapScale } from '../motion/variants';

const FLOW = {
  title: 'Energy & Sleep Flow',
  stage: 'Tracking patterns',
  reviewDate: 'Review in 5 days',
  nextAction: 'Drink a glass of water and log your energy tonight.',
  completed: ['Morning check-in', 'Evening wind-down'],
  blockers: ['Busy workdays'],
  escalation: 'If energy drops sharply or you feel unwell, seek care promptly.',
  progress: 2,
  total: 4,
};

const SECTIONS = [
  {
    id: 'today',
    label: 'Today',
    items: ['Log energy after water', 'Note sleep quality tonight'],
    active: true,
  },
  {
    id: 'week',
    label: 'This week',
    items: ['Track evening energy pattern', 'Gentle movement 3×', 'Review weekly rhythm'],
    active: false,
  },
  {
    id: 'worse',
    label: 'If it gets worse',
    items: ['Pause new habits', 'Use Doctor Summary', 'Contact a clinician if concerned'],
    active: false,
  },
  {
    id: 'clinician',
    label: 'For your clinician',
    items: ['Share timeline from Doctor Summary', 'Bring list of actions tried'],
    active: false,
  },
];

export function FullFlowScreen() {
  const { theme, blockedReason, openDoctorSummary, showDoctorSummary, closeDoctorSummary } = useApp();
  const tokens = themes[theme];
  const progressPct = (FLOW.progress / FLOW.total) * 100;

  return (
    <div className="screen flow-screen">
      <ScreenHeader title="Health Flow" subtitle="Your gentle health journey" />

      <motion.div variants={staggerContainer} initial="hidden" animate="visible">
        <motion.div className="flow-hero warm-card glass-card-inner" variants={fadeUp}>
          <p className="flow-hero-label">Current flow</p>
          <h2 className="flow-hero-title">{FLOW.title}</h2>
          <span className="progress-pill progress-pill--teal">{FLOW.stage}</span>
          <p className="flow-review">{FLOW.reviewDate}</p>
          <div className="flow-timeline-bar">
            <motion.div
              className="flow-timeline-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
            />
          </div>
        </motion.div>

        <motion.div className="flow-next-action hero-card" variants={fadeUp}>
          <p className="hero-label">Current next action</p>
          <p className="hero-task" style={{ fontSize: 18 }}>{FLOW.nextAction}</p>
        </motion.div>

        <motion.div className="flow-section warm-card glass-card-inner" variants={fadeUp}>
          <h3>Completed</h3>
          <ul className="flow-list">
            {FLOW.completed.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.24 }}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <CheckCircle2 size={16} className="icon-success" />
                </motion.span>
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div className="flow-section warm-card glass-card-inner" variants={fadeUp}>
          <h3>Blockers logged</h3>
          <ul className="flow-list">
            {FLOW.blockers.map((item) => (
              <li key={item}>
                <Circle size={8} fill="var(--text-label-warm)" stroke="none" />
                {item}
              </li>
            ))}
          </ul>
          <AnimatePresenceBlocker blockedReason={blockedReason} />
        </motion.div>

        {SECTIONS.map((section) => (
          <motion.div
            key={section.id}
            className={`flow-section warm-card glass-card-inner ${section.active ? 'flow-section--active' : ''}`}
            variants={fadeUp}
          >
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>{section.label}</h3>
            <ul className="flow-list">
              {section.items.map((item) => (
                <li key={item}>
                  <ChevronRight size={14} className="icon-teal" />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        <motion.div
          className="flow-escalation safety-card"
          variants={fadeUp}
        >
          <AlertCircle size={18} style={{ color: tokens.warning, flexShrink: 0 }} />
          <span>{FLOW.escalation}</span>
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
            <span>Share with your clinician</span>
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
    </div>
  );
}

function AnimatePresenceBlocker({
  blockedReason,
}: {
  blockedReason: import('../context/AppContext').BlockedReason;
}) {
  if (!blockedReason) return null;

  const labels: Record<NonNullable<typeof blockedReason>, string> = {
    time: 'No time',
    forgot: 'Forgot',
    hard: 'Too hard',
    confusing: 'Confusing',
    worse: 'Felt worse',
    cost: 'Cost',
    work: 'Work / school',
    other: 'Other',
  };

  return (
    <motion.p
      className="flow-blocker-note"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{ fontSize: 13, marginTop: 10 }}
    >
      Latest blocker: {labels[blockedReason]}
    </motion.p>
  );
}
