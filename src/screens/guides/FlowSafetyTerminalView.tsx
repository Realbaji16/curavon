import { motion } from 'framer-motion';

type FlowSafetyTerminalViewProps = {
  guidesSafetyBody: string;
  onOpenDoctorSummary: () => void;
  onBackToBrowse: () => void;
  onReturnToToday: () => void;
  onRestartFlow: () => void;
};

export function FlowSafetyTerminalView({
  guidesSafetyBody,
  onOpenDoctorSummary,
  onBackToBrowse,
  onReturnToToday,
  onRestartFlow,
}: FlowSafetyTerminalViewProps) {
  return (
    <motion.section
      className="guides-result-panel warm-card glass-card-inner"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3>Safety check</h3>
      <p className="guides-result-sub">{guidesSafetyBody || 'This concern may need urgent support.'}</p>
      <p className="guides-result-sub">
        Curavon will not suggest a normal self-care step for this flow until you restart or exit.
      </p>
      <div className="guides-safety-actions">
        <button type="button" className="btn btn-primary btn-pill" onClick={onOpenDoctorSummary}>
          Prepare doctor-ready note
        </button>
        <button type="button" className="btn btn-secondary btn-glass" onClick={onBackToBrowse}>
          Return to Guides
        </button>
        <button type="button" className="btn btn-secondary btn-glass" onClick={onReturnToToday}>
          Return to Today
        </button>
        <button type="button" className="btn btn-secondary btn-glass" onClick={onRestartFlow}>
          Restart flow
        </button>
      </div>
    </motion.section>
  );
}
