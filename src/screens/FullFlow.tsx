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
        <motion.div
          className="flow-hero warm-card glass-card-inner"
          variants={fadeUp}
          style={{
            background: tokens.cardGradient,
            border: `1px solid ${tokens.glassBorder}`,
            boxShadow: tokens.shadowSoft,
          }}
        >
          <p className="flow-hero-label" style={{ color: tokens.textMuted }}>Current flow</p>
          <h2 className="flow-hero-title" style={{ color: tokens.text }}>{FLOW.title}</h2>
          <span
            className="progress-pill"
            style={{ background: tokens.tealSoft, color: tokens.teal }}
          >
            {FLOW.stage}
          </span>
          <p className="flow-review" style={{ color: tokens.textSecondary }}>{FLOW.reviewDate}</p>
          <div className="flow-timeline-bar">
            <motion.div
              className="flow-timeline-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1], delay: 0.2 }}
              style={{ background: tokens.teal }}
            />
          </div>
        </motion.div>

        <motion.div
          className="flow-next-action hero-card"
          variants={fadeUp}
          style={{ background: tokens.heroGradient, boxShadow: tokens.shadow }}
        >
          <p className="hero-label">Current next action</p>
          <p className="hero-task" style={{ fontSize: 18 }}>{FLOW.nextAction}</p>
        </motion.div>

        <motion.div
          className="flow-section warm-card glass-card-inner"
          variants={fadeUp}
          style={{
            background: tokens.cardGradient,
            border: `1px solid ${tokens.glassBorder}`,
            boxShadow: tokens.shadowSoft,
          }}
        >
          <h3 style={{ color: tokens.text, margin: '0 0 12px', fontSize: 16 }}>Completed</h3>
          <ul className="flow-list">
            {FLOW.completed.map((item, i) => (
              <motion.li
                key={item}
                style={{ color: tokens.textSecondary }}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08, duration: 0.24 }}
              >
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.35 + i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <CheckCircle2 size={16} style={{ color: tokens.success }} />
                </motion.span>
                {item}
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="flow-section warm-card glass-card-inner"
          variants={fadeUp}
          style={{
            background: tokens.cardGradient,
            border: `1px solid ${tokens.glassBorder}`,
            boxShadow: tokens.shadowSoft,
          }}
        >
          <h3 style={{ color: tokens.text, margin: '0 0 12px', fontSize: 16 }}>Blockers logged</h3>
          <ul className="flow-list">
            {FLOW.blockers.map((item) => (
              <li key={item} style={{ color: tokens.textSecondary }}>
                <Circle size={8} fill={tokens.primary} stroke="none" />
                {item}
              </li>
            ))}
          </ul>
          <AnimatePresenceBlocker blockedReason={blockedReason} tokens={tokens} />
        </motion.div>

        {SECTIONS.map((section) => (
          <motion.div
            key={section.id}
            className={`flow-section warm-card glass-card-inner ${section.active ? 'flow-section--active' : ''}`}
            variants={fadeUp}
            style={{
              background: tokens.cardGradient,
              border: `1px solid ${section.active ? tokens.teal : tokens.glassBorder}`,
              boxShadow: section.active ? tokens.shadowSoft : tokens.shadowSoft,
            }}
          >
            <h3 style={{ color: tokens.text, margin: '0 0 10px', fontSize: 15 }}>{section.label}</h3>
            <ul className="flow-list">
              {section.items.map((item) => (
                <li key={item} style={{ color: tokens.textMuted, fontSize: 14 }}>
                  <ChevronRight size={14} style={{ color: tokens.teal }} />
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}

        <motion.div
          className="flow-escalation safety-card"
          variants={fadeUp}
          style={{
            background: tokens.accentSoft,
            border: `1px solid ${tokens.border}`,
            color: tokens.textSecondary,
          }}
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
          style={{
            background: tokens.cardGradient,
            border: `1px solid ${tokens.glassBorder}`,
            boxShadow: tokens.shadowSoft,
          }}
        >
          <FileText size={20} style={{ color: tokens.primary }} />
          <div className="doctor-shortcut-text">
            <span style={{ color: tokens.text, fontWeight: 700 }}>Doctor Summary</span>
            <span style={{ color: tokens.textMuted, fontSize: 13 }}>Share with your clinician</span>
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
    </div>
  );
}

function AnimatePresenceBlocker({
  blockedReason,
  tokens,
}: {
  blockedReason: import('../context/AppContext').BlockedReason;
  tokens: (typeof themes)['sky'];
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
      style={{ color: tokens.textMuted, fontSize: 13, marginTop: 10 }}
    >
      Latest blocker: {labels[blockedReason]}
    </motion.p>
  );
}
