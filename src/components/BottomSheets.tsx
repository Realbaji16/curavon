import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import type { BlockedReason } from '../context/AppContext';
import { Clock, Heart, Zap, DollarSign, Briefcase } from 'lucide-react';

const REASONS: { id: BlockedReason; label: string; icon: typeof Clock }[] = [
  { id: 'time', label: 'Lack of Time', icon: Clock },
  { id: 'motivation', label: 'Low Motivation', icon: Heart },
  { id: 'stress', label: 'High Stress/Fatigue', icon: Zap },
  { id: 'cost', label: 'Financial Cost', icon: DollarSign },
  { id: 'work', label: 'Work/School Friction', icon: Briefcase },
];

export function BlockedReasonSheet() {
  const { showBlockedSheet, closeBlockedSheet, selectBlockedReason, theme } = useApp();
  const tokens = themes[theme];

  return (
    <AnimatePresence>
      {showBlockedSheet && (
        <>
          <motion.div
            className="sheet-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeBlockedSheet}
          />
          <motion.div
            className="bottom-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              background: tokens.surface,
              borderTop: `1px solid ${tokens.border}`,
            }}
          >
            <div className="sheet-handle" style={{ background: tokens.border }} />
            <h3 className="sheet-title" style={{ color: tokens.text }}>
              What got in the way?
            </h3>
            <p className="sheet-subtitle" style={{ color: tokens.textMuted }}>
              No judgment — we'll find something easier.
            </p>
            <div className="reason-grid">
              {REASONS.map(({ id, label, icon: Icon }) => (
                <motion.button
                  key={id}
                  className="reason-chip"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => selectBlockedReason(id)}
                  style={{
                    background: tokens.surfaceElevated,
                    border: `1.5px solid ${tokens.border}`,
                    color: tokens.text,
                  }}
                >
                  <Icon size={20} style={{ color: tokens.primary }} />
                  <span>{label}</span>
                </motion.button>
              ))}
            </div>
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
            onClick={closeShareSheet}
          />
          <motion.div
            className="bottom-sheet share-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{
              background: tokens.surfaceElevated,
            }}
          >
            <div className="sheet-handle" style={{ background: tokens.border }} />
            <h3 className="sheet-title" style={{ color: tokens.text }}>
              Share Summary
            </h3>
            <div className="share-grid">
              {options.map((opt) => (
                <button
                  key={opt.label}
                  className="share-option"
                  onClick={closeShareSheet}
                  style={{ color: tokens.text }}
                >
                  <span className="share-icon">{opt.icon}</span>
                  <span className="share-label">{opt.label}</span>
                </button>
              ))}
            </div>
            <button
              className="share-cancel"
              onClick={closeShareSheet}
              style={{
                background: tokens.surface,
                color: tokens.primary,
              }}
            >
              Cancel
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
