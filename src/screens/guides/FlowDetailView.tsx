import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { FlowCard } from '../../data/guides/flowCatalog';

type FlowDetailViewProps = {
  flow: FlowCard;
  onStartFlow: () => void;
};

export function FlowDetailView({ flow, onStartFlow }: FlowDetailViewProps) {
  return (
    <motion.section
      className="guides-detail-panel warm-card glass-card-inner"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3>{flow.title}</h3>
      <p className="guides-detail-time">{flow.estimatedTime}</p>
      <p className="guides-detail-description">{flow.description}</p>

      <div className="guides-detail-block">
        <h4>What this helps organize</h4>
        <p>{flow.helpsOrganize}</p>
      </div>

      <div className="guides-detail-block guides-detail-safety">
        <h4>Safety note</h4>
        <p>
          Curavon helps organize concerns and next steps. It does not diagnose or replace a
          clinician.
        </p>
      </div>

      <div className="guides-detail-actions">
        <button type="button" className="btn btn-primary btn-pill" onClick={onStartFlow}>
          Start Flow
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.section>
  );
}
