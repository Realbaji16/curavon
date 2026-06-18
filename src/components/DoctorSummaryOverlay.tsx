import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useDoctorSummary } from '../context/DoctorSummaryContext';
import { DoctorSummaryHub } from './DoctorSummaryHub';
import { tapScale } from '../motion/variants';
export function DoctorSummaryOverlay() {
  const { showDoctorSummary, closeDoctorSummary } = useApp();
  const { refreshFromStorage } = useDoctorSummary();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showDoctorSummary) return;
    refreshFromStorage();

    const wrapper = document.querySelector('.screen-wrapper');
    if (wrapper instanceof HTMLElement) {
      wrapper.scrollTo({ top: 0, behavior: 'auto' });
      wrapper.style.overflow = 'hidden';
    }

    requestAnimationFrame(() => {
      panelRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    });

    return () => {
      if (wrapper instanceof HTMLElement) {
        wrapper.style.overflow = '';
      }
    };
  }, [showDoctorSummary, refreshFromStorage]);

  return (
    <AnimatePresence>
      {showDoctorSummary && (
        <motion.div
          className="summary-overlay summary-overlay--full summary-overlay--frame"
          role="dialog"
          aria-modal="true"
          aria-label="Doctor-ready summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="summary-overlay-backdrop" onClick={closeDoctorSummary} aria-hidden="true" />
          <motion.div
            ref={panelRef}
            className="summary-overlay-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="summary-screen-topbar">
              <motion.button
                type="button"
                className="summary-back-btn"
                onClick={closeDoctorSummary}
                aria-label="Go back"
                {...tapScale}
              >
                <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" />
                Back
              </motion.button>
            </div>
            <DoctorSummaryHub />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
