import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Clock, Brain, HelpCircle, TrendingDown, MoreHorizontal, Timer, Calendar, FileText, RefreshCw } from 'lucide-react';
import { useHealth } from '../context/useHealth';
import type { AdjustOption, HealthBlockedReason } from '../types/health';
import { sheetSlide, staggerContainer, fadeUp, tapScale } from '../motion/variants';

const BLOCKED_REASONS: { id: HealthBlockedReason; label: string; icon: typeof Clock }[] = [
  { id: 'tired', label: 'Too tired', icon: TrendingDown },
  { id: 'time', label: 'Not enough time', icon: Clock },
  { id: 'unsure', label: 'Unsure what to do', icon: HelpCircle },
  { id: 'symptoms', label: 'Symptoms changed', icon: Brain },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

const ADJUST_OPTIONS: { id: AdjustOption; label: string; icon: typeof Timer }[] = [
  { id: 'two-minutes', label: 'Make it 2 minutes', icon: Timer },
  { id: 'later-today', label: 'Save it for later today', icon: Calendar },
  { id: 'note', label: 'Turn it into a note', icon: FileText },
  { id: 'different-step', label: 'Pick a different gentle step', icon: RefreshCw },
];

export function HealthActionSheets() {
  const {
    showHealthBlockedSheet,
    closeHealthBlockedSheet,
    markActionBlocked,
    showHealthAdjustSheet,
    closeHealthAdjustSheet,
    markActionAdjusted,
  } = useHealth();
  const [selectedBlocked, setSelectedBlocked] = useState<HealthBlockedReason | null>(null);
  const [selectedAdjust, setSelectedAdjust] = useState<AdjustOption | null>(null);

  const handleBlocked = (id: HealthBlockedReason) => {
    setSelectedBlocked(id);
    setTimeout(() => {
      markActionBlocked(id);
      setSelectedBlocked(null);
    }, 220);
  };

  const handleAdjust = (id: AdjustOption) => {
    setSelectedAdjust(id);
    setTimeout(() => {
      markActionAdjusted(id);
      setSelectedAdjust(null);
    }, 220);
  };

  return (
    <>
      <AnimatePresence>
        {showHealthBlockedSheet && (
          <>
            <motion.div
              className="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={closeHealthBlockedSheet}
            />
            <motion.div
              className="bottom-sheet glass-card"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={sheetSlide}
            >
              <div className="sheet-handle" />
              <h3 className="sheet-title">What got in the way?</h3>
              <p className="sheet-subtitle">No judgment — we&apos;ll adjust gently.</p>
              <motion.div
                className="reason-grid"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {BLOCKED_REASONS.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    type="button"
                    className={`reason-chip ${selectedBlocked === id ? 'reason-chip--selected' : ''}`}
                    variants={fadeUp}
                    {...tapScale}
                    onClick={() => handleBlocked(id)}
                  >
                    <Icon size={20} className="reason-chip-icon" />
                    <span>{label}</span>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHealthAdjustSheet && (
          <>
            <motion.div
              className="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={closeHealthAdjustSheet}
            />
            <motion.div
              className="bottom-sheet glass-card"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={sheetSlide}
            >
              <div className="sheet-handle" />
              <h3 className="sheet-title">Choose a smaller version</h3>
              <p className="sheet-subtitle">A gentler step still counts.</p>
              <motion.div
                className="reason-grid"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                {ADJUST_OPTIONS.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    type="button"
                    className={`reason-chip ${selectedAdjust === id ? 'reason-chip--selected' : ''}`}
                    variants={fadeUp}
                    {...tapScale}
                    onClick={() => handleAdjust(id)}
                  >
                    <Icon size={20} className="reason-chip-icon" />
                    <span>{label}</span>
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
