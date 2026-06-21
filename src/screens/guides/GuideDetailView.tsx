import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import type { FlowId } from '../../data/guides/flowCatalog';
import type { GuideCard } from '../../data/guides/guideCatalog';

type GuideDetailViewProps = {
  guide: GuideCard;
  saved: boolean;
  onSaveGuide: (guideId: string) => void;
  onOpenRelatedFlow: (flowId: FlowId) => void;
};

export function GuideDetailView({
  guide,
  saved,
  onSaveGuide,
  onOpenRelatedFlow,
}: GuideDetailViewProps) {
  return (
    <motion.section
      className="guides-detail-panel warm-card glass-card-inner"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3>{guide.title}</h3>
      <p className="guides-detail-description">{guide.intro}</p>

      <ul className="guides-detail-points">
        {guide.bullets.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>

      <div className="guides-detail-actions">
        <button type="button" className="btn btn-secondary btn-glass" onClick={() => onSaveGuide(guide.id)}>
          {saved ? 'Saved' : 'Save for later'}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-pill"
          onClick={() => onOpenRelatedFlow(guide.relatedFlowId)}
        >
          Related flow
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.section>
  );
}
