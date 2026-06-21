/**
 * Legacy sheet components — not mounted in the active app shell.
 * Health action sheets live in HealthActionSheets.tsx (HealthContext).
 */
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
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
  const [showBlockedSheet, setShowBlockedSheet] = useState(false);
  const [selected, setSelected] = useState<BlockedReason | null>(null);

  const handleSelect = (id: BlockedReason) => {
    setSelected(id);
    setShowBlockedSheet(false);
  };

  return (
    <AnimatePresence>
      {showBlockedSheet && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowBlockedSheet(false)}
        >
          <motion.div
            className="bottom-sheet warm-card glass-card-inner"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSlide}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div variants={staggerContainer} initial="hidden" animate="visible">
              <motion.h3 variants={fadeUp}>What got in the way?</motion.h3>
              <motion.div className="reason-grid" variants={fadeUp}>
                {REASONS.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    type="button"
                    className={`reason-chip ${selected === id ? 'reason-chip--selected' : ''}`}
                    variants={fadeUp}
                    {...tapScale}
                    onClick={() => handleSelect(id)}
                  >
                    <Icon size={16} />
                    {label}
                  </motion.button>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ShareSheet() {
  const [showShareSheet, setShowShareSheet] = useState(false);

  return (
    <AnimatePresence>
      {showShareSheet && (
        <motion.div
          className="sheet-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowShareSheet(false)}
        >
          <motion.div
            className="bottom-sheet warm-card glass-card-inner"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSlide}
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Share with care circle</h3>
            <p className="sheet-desc">
              Care Circle sharing is permission-based and not enabled for health details yet.
            </p>
            <button type="button" className="btn btn-secondary btn-glass" onClick={() => setShowShareSheet(false)}>
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
