import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import type { BlockedReason } from '../context/AppContext';
import {
  Clock,
  Brain,
  HelpCircle,
  TrendingDown,
  DollarSign,
  Briefcase,
  MoreHorizontal,
  RotateCcw,
} from 'lucide-react';
import { sheetSlide, staggerContainer, fadeUp, tapScale } from '../motion/variants';

const REASONS: { id: BlockedReason; label: string; icon: typeof Clock }[] = [
  { id: 'time', label: 'No time', icon: Clock },
  { id: 'forgot', label: 'Forgot', icon: RotateCcw },
  { id: 'hard', label: 'Too hard', icon: TrendingDown },
  { id: 'confusing', label: 'Confusing', icon: HelpCircle },
  { id: 'worse', label: 'Felt worse', icon: Brain },
  { id: 'cost', label: 'Cost', icon: DollarSign },
  { id: 'work', label: 'Work / school', icon: Briefcase },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

export function BlockedReasonSheet() {
  const { showBlockedSheet, closeBlockedSheet, selectBlockedReason, theme } = useApp();
  const tokens = themes[theme];
  const [selected, setSelected] = useState<BlockedReason | null>(null);

  const handleSelect = (id: BlockedReason) => {
    setSelected(id);
    setTimeout(() => {
      selectBlockedReason(id);
      setSelected(null);
    }, 220);
  };

  return (
    <AnimatePresence>
      {showBlockedSheet && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closeBlockedSheet}
          />
          <motion.div
            className="bottom-sheet glass-card"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSlide}
            style={{
              background: tokens.glass,
              borderTop: `1px solid ${tokens.glassBorder}`,
              backdropFilter: 'blur(24px)',
            }}
          >
            <div className="sheet-handle" style={{ background: tokens.border }} />
            <h3 className="sheet-title" style={{ color: tokens.text }}>
              What got in the way?
            </h3>
            <p className="sheet-subtitle" style={{ color: tokens.textMuted }}>
              No judgment — we&apos;ll find something easier.
            </p>
            <motion.div
              className="reason-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {REASONS.map(({ id, label, icon: Icon }) => (
                <motion.button
                  key={id}
                  type="button"
                  className={`reason-chip ${selected === id ? 'reason-chip--selected' : ''}`}
                  variants={fadeUp}
                  {...tapScale}
                  onClick={() => handleSelect(id)}
                  style={{
                    background: selected === id ? tokens.primarySoft : tokens.surfaceElevated,
                    border: `1.5px solid ${selected === id ? tokens.primary : tokens.border}`,
                    color: tokens.text,
                  }}
                >
                  <Icon size={20} style={{ color: tokens.primary }} />
                  <span>{label}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function ShareSheet() {
  const { showShareSheet, closeShareSheet, theme } = useApp();
  const tokens = themes[theme];

  const options = [
    { label: 'Messages', icon: '💬' },
    { label: 'Mail', icon: '✉️' },
    { label: 'Notes', icon: '📝' },
    { label: 'Copy Link', icon: '🔗' },
    { label: 'AirDrop', icon: '📡' },
    { label: 'More', icon: '•••' },
  ];

  return (
    <AnimatePresence>
      {showShareSheet && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closeShareSheet}
          />
          <motion.div
            className="bottom-sheet share-sheet glass-card"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSlide}
            style={{ background: tokens.glass }}
          >
            <div className="sheet-handle" style={{ background: tokens.border }} />
            <h3 className="sheet-title" style={{ color: tokens.text }}>
              Share Summary
            </h3>
            <motion.div
              className="share-grid"
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {options.map((opt) => (
                <motion.button
                  key={opt.label}
                  type="button"
                  className="share-option"
                  variants={fadeUp}
                  {...tapScale}
                  onClick={closeShareSheet}
                  style={{ color: tokens.text }}
                >
                  <span className="share-icon">{opt.icon}</span>
                  <span className="share-label">{opt.label}</span>
                </motion.button>
              ))}
            </motion.div>
            <motion.button
              type="button"
              className="share-cancel"
              {...tapScale}
              onClick={closeShareSheet}
              style={{ background: tokens.surface, color: tokens.primary }}
            >
              Cancel
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
