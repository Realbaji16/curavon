import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useHealth } from '../context/useHealth';
import { themes } from '../theme/themes';
import { SensitiveBlur } from './ScreenHeader';
import { buildDoctorSummaryData } from '../utils/doctorSummaryBuilder';
import { staggerContainer, fadeUp } from '../motion/variants';

interface DoctorSummaryProps {
  variant?: 'card' | 'full';
  onClose?: () => void;
  concern?: string;
  loading?: boolean;
}

function SummaryList({ items, color }: { items: string[]; color: string }) {
  if (items.length === 0) {
    return <p style={{ color, margin: 0, fontSize: '0.88rem' }}>Nothing logged yet.</p>;
  }
  return (
    <ul className="summary-list">
      {items.map((item) => (
        <li key={item} style={{ color }}>
          <SensitiveBlur sensitive>{item}</SensitiveBlur>
        </li>
      ))}
    </ul>
  );
}

export function DoctorSummary({ variant = 'card', concern, loading }: DoctorSummaryProps) {
  const { theme } = useApp();
  const { healthProfile, dailyCheckins, nextActionState } = useHealth();
  const tokens = themes[theme];

  const data = buildDoctorSummaryData({
    healthProfile,
    dailyCheckins,
    nextActionState,
    concernOverride: concern,
  });

  const sections: { label: string; content: React.ReactNode }[] = [
    {
      label: 'Main concern',
      content: <SensitiveBlur sensitive>{data.mainConcern}</SensitiveBlur>,
    },
    {
      label: 'Timeline',
      content:
        data.timeline.length > 0 ? (
          data.timeline.map((t) => (
            <div key={`${t.when}-${t.note}`} className="timeline-row">
              <span className="timeline-date" style={{ color: tokens.teal }}>
                {t.when}
              </span>
              <span style={{ color: tokens.textSecondary }}>
                <SensitiveBlur sensitive>{t.note}</SensitiveBlur>
              </span>
            </div>
          ))
        ) : (
          <p style={{ color: tokens.textSecondary, margin: 0 }}>No check-ins yet.</p>
        ),
    },
    ...data.profileSections.map((section) => ({
      label: section.label,
      content: <SummaryList items={section.items} color={tokens.textSecondary} />,
    })),
    {
      label: 'Actions tried',
      content: <SummaryList items={data.actionsTried} color={tokens.textSecondary} />,
    },
    {
      label: 'Blockers',
      content: <SummaryList items={data.blockers} color={tokens.textSecondary} />,
    },
    {
      label: 'Red flags checked',
      content: <SummaryList items={data.redFlagsChecked} color={tokens.textSecondary} />,
    },
    {
      label: 'Questions for your clinician',
      content: <SummaryList items={data.clinicianQuestions} color={tokens.textSecondary} />,
    },
  ];

  return (
    <motion.div
      className={`doctor-summary ${variant === 'full' ? 'doctor-summary--full' : ''} warm-card glass-card-inner`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="summary-header">
        <FileText size={22} style={{ color: tokens.primary }} />
        <div>
          <h3 style={{ color: tokens.text, margin: 0 }}>Doctor-ready summary</h3>
          <p className="summary-sub" style={{ color: tokens.textMuted }}>
            Built from your check-ins and health profile — not a diagnosis
          </p>
        </div>
      </div>

      {!data.hasUserData && !loading && (
        <p className="summary-empty-hint" style={{ color: tokens.textMuted }}>
          Complete a daily check-in or add health profile details to enrich this summary.
        </p>
      )}

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
        This summary is not a diagnosis. It helps you organize what you have noticed and share it
        with a clinician.
      </motion.div>
    </motion.div>
  );
}
