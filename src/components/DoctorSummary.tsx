import { motion } from 'framer-motion';
import { FileText, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { BlockedReason } from '../context/AppContext';
import { themes } from '../theme/themes';
import { SensitiveBlur } from './ScreenHeader';
import { staggerContainer, fadeUp, tapScale } from '../motion/variants';

const PLACEHOLDER_SUMMARY = {
  mainConcern: 'Low energy in the evenings',
  timeline: [
    { when: 'Past 2 weeks', note: 'Energy dips after 4pm most days' },
    { when: 'This week', note: 'Started logging water and sleep' },
    { when: 'Today', note: 'Noticed improvement after morning walk' },
  ],
  questionsAsked: [
    'When does your energy feel lowest?',
    'How is your sleep lately?',
    'Any recent changes to routine?',
  ],
  redFlagsChecked: ['Chest pain — none reported', 'Breathing difficulty — none reported'],
  actionsTried: ['Drink water + log energy', '5-minute morning stretch'],
  blockers: ['Busy workdays'],
  clinicianQuestions: [
    'Could my evening fatigue relate to sleep quality?',
    'Are there simple habits worth tracking before my visit?',
    'When should I seek care if this pattern continues?',
  ],
};

const BLOCKER_LABELS: Record<NonNullable<BlockedReason>, string> = {
  time: 'No time',
  forgot: 'Forgot',
  hard: 'Too hard',
  confusing: 'Confusing',
  worse: 'Felt worse',
  cost: 'Cost',
  work: 'Work / school',
  other: 'Other',
};

interface DoctorSummaryProps {
  variant?: 'card' | 'full';
  onClose?: () => void;
  concern?: string;
  loading?: boolean;
}

export function DoctorSummary({ variant = 'card', onClose, concern, loading }: DoctorSummaryProps) {
  const { theme, blockedReason } = useApp();
  const tokens = themes[theme];
  const data = {
    ...PLACEHOLDER_SUMMARY,
    mainConcern: concern ?? PLACEHOLDER_SUMMARY.mainConcern,
    blockers: blockedReason
      ? [...PLACEHOLDER_SUMMARY.blockers, BLOCKER_LABELS[blockedReason]]
      : PLACEHOLDER_SUMMARY.blockers,
  };

  const sections = [
    { label: 'Main concern', content: <SensitiveBlur sensitive>{data.mainConcern}</SensitiveBlur> },
    {
      label: 'Timeline',
      content: data.timeline.map((t) => (
        <div key={t.when} className="timeline-row">
          <span className="timeline-date" style={{ color: tokens.teal }}>{t.when}</span>
          <span style={{ color: tokens.textSecondary }}>{t.note}</span>
        </div>
      )),
    },
    {
      label: 'Questions asked',
      content: (
        <ul className="summary-list">
          {data.questionsAsked.map((q) => (
            <li key={q} style={{ color: tokens.textSecondary }}>{q}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Red flags checked',
      content: (
        <ul className="summary-list">
          {data.redFlagsChecked.map((r) => (
            <li key={r} style={{ color: tokens.textSecondary }}>{r}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Actions tried',
      content: (
        <ul className="summary-list">
          {data.actionsTried.map((a) => (
            <li key={a} style={{ color: tokens.textSecondary }}>{a}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Blockers',
      content: (
        <ul className="summary-list">
          {data.blockers.map((b) => (
            <li key={b} style={{ color: tokens.textSecondary }}>{b}</li>
          ))}
        </ul>
      ),
    },
    {
      label: 'Questions for your clinician',
      content: (
        <ul className="summary-list">
          {data.clinicianQuestions.map((q) => (
            <li key={q} style={{ color: tokens.textSecondary }}>{q}</li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <motion.div
      className={`doctor-summary ${variant === 'full' ? 'doctor-summary--full' : ''} warm-card glass-card-inner`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      style={{
        background: tokens.cardGradient,
        border: `1px solid ${tokens.glassBorder}`,
        boxShadow: tokens.shadowSoft,
      }}
    >
      {onClose && (
        <motion.button
          type="button"
          className="summary-close-btn"
          onClick={onClose}
          aria-label="Close"
          {...tapScale}
        >
          <X size={20} style={{ color: tokens.textMuted }} />
        </motion.button>
      )}

      <div className="summary-header">
        <FileText size={22} style={{ color: tokens.primary }} />
        <div>
          <h3 style={{ color: tokens.text, margin: 0 }}>Doctor Summary</h3>
          <p className="summary-sub" style={{ color: tokens.textMuted }}>
            For your next visit — not a diagnosis
          </p>
        </div>
      </div>

      {loading ? (
        <motion.div
          className="summary-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ color: tokens.textMuted, padding: '24px 0', textAlign: 'center' }}
        >
          <motion.div
            className="summary-loading-bar"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ background: tokens.tealSoft, height: 4, borderRadius: 2, marginBottom: 12 }}
          />
          Preparing your summary…
        </motion.div>
      ) : (
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          {sections.map((s) => (
            <motion.div key={s.label} className="summary-section" variants={fadeUp}>
              <h4 style={{ color: tokens.textMuted }}>{s.label}</h4>
              <div style={{ color: tokens.text }}>{s.content}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <motion.div
        className="disclaimer-box safety-card"
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        style={{
          background: tokens.accentSoft,
          borderLeft: `4px solid ${tokens.warning}`,
          color: tokens.textSecondary,
        }}
      >
        This summary is not a diagnosis. It helps you organize what you have noticed and share it with a clinician.
      </motion.div>
    </motion.div>
  );
}
