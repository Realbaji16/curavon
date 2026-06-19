import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft } from 'lucide-react';
import type { FullFlowModel, FullFlowSection } from '../types/fullFlow';
import { tapScale } from '../motion/variants';

export type FullFlowOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  model: FullFlowModel;
  onOpenDoctorSummary?: () => void;
  onOpenGuides?: () => void;
  onOpenAsk?: () => void;
};

function sectionToneClass(tone: FullFlowSection['tone']): string {
  switch (tone) {
    case 'urgent':
      return 'fullflow-section-card--urgent';
    case 'caution':
      return 'fullflow-section-card--caution';
    case 'supportive':
      return 'fullflow-section-card--supportive';
    default:
      return '';
  }
}

function handleSectionAction(
  section: FullFlowSection,
  props: Pick<FullFlowOverlayProps, 'onClose' | 'onOpenDoctorSummary' | 'onOpenGuides' | 'onOpenAsk'>,
) {
  const { onClose, onOpenDoctorSummary, onOpenGuides, onOpenAsk } = props;
  switch (section.actionTarget) {
    case 'doctor_summary':
      onClose();
      onOpenDoctorSummary?.();
      break;
    case 'guides':
      onClose();
      onOpenGuides?.();
      break;
    case 'ask':
      onClose();
      onOpenAsk?.();
      break;
    case 'today':
      onClose();
      break;
    default:
      break;
  }
}

export function FullFlowOverlay({
  isOpen,
  onClose,
  model,
  onOpenDoctorSummary,
  onOpenGuides,
  onOpenAsk,
}: FullFlowOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          className="summary-overlay summary-overlay--full summary-overlay--frame fullflow-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Full health flow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
        >
          <div className="summary-overlay-backdrop" onClick={onClose} aria-hidden="true" />
          <motion.div
            ref={panelRef}
            className="summary-overlay-panel fullflow-overlay-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          >
            <div className="summary-screen-topbar">
              <motion.button
                type="button"
                className="summary-back-btn"
                onClick={onClose}
                aria-label="Back to Today"
                {...tapScale}
              >
                <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" />
                Back to Today
              </motion.button>
            </div>

            <header className="fullflow-header">
              <h2 className="fullflow-title">{model.title}</h2>
              <p className="fullflow-subtitle">{model.subtitle}</p>
              <p className="fullflow-disclaimer">
                This is a guided pathway, not a medical report. Curavon does not diagnose.
              </p>
            </header>

            <div className="fullflow-sections">
              {model.sections.map((section) => (
                <article
                  key={section.id}
                  className={`fullflow-section-card warm-card glass-card-inner ${sectionToneClass(section.tone)}`}
                >
                  <h3 className="fullflow-section-title">{section.title}</h3>
                  <p className="fullflow-section-body">{section.body}</p>
                  {section.actionLabel && section.actionTarget ? (
                    <button
                      type="button"
                      className="btn btn-secondary btn-glass fullflow-section-action"
                      onClick={() =>
                        handleSectionAction(section, {
                          onClose,
                          onOpenDoctorSummary,
                          onOpenGuides,
                          onOpenAsk,
                        })
                      }
                    >
                      {section.actionLabel}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
