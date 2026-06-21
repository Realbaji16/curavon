import { motion } from 'framer-motion';
import {
  ChevronRight,
  GitBranch,
  Heart,
  Lock,
  Search,
  Shield,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { FLOW_CARDS, type FlowId } from '../../data/guides/flowCatalog';
import { BASIC_GUIDES, MIND_GUIDES } from '../../data/guides/guideCatalog';
import { CARE_CIRCLE_LOCKED_COPY } from '../../lib/privacy/careCirclePrivacy';
import { fadeUp, staggerContainer, tapScale } from '../../motion/variants';
import { FILTERS, includesSearch, type FilterId } from './types';

type GuidesBrowseViewProps = {
  onOpenFlowDetail: (flowId: FlowId) => void;
  onOpenGuideDetail: (guideId: string) => void;
};

export function GuidesBrowseView({ onOpenFlowDetail, onOpenGuideDetail }: GuidesBrowseViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFlows = useMemo(
    () =>
      FLOW_CARDS.filter(
        (flow) =>
          (activeFilter === 'all' ||
            activeFilter === 'flows' ||
            flow.categories.includes(activeFilter as 'flows' | 'mind' | 'symptoms' | 'doctor-prep' | 'basics')) &&
          (searchQuery.trim() === '' ||
            includesSearch(flow.title, searchQuery) ||
            includesSearch(flow.description, searchQuery) ||
            includesSearch(flow.tag, searchQuery)),
      ),
    [activeFilter, searchQuery],
  );

  const filteredMindGuides = useMemo(
    () =>
      MIND_GUIDES.filter(
        (guide) =>
          (activeFilter === 'all' ||
            (activeFilter === 'mind' && guide.categories.includes('mind')) ||
            (activeFilter === 'basics' && guide.categories.includes('basics')) ||
            (activeFilter === 'doctor-prep' && guide.categories.includes('doctor-prep')) ||
            (activeFilter === 'symptoms' && guide.categories.includes('symptoms'))) &&
          (searchQuery.trim() === '' ||
            includesSearch(guide.title, searchQuery) ||
            includesSearch(guide.description, searchQuery)),
      ),
    [activeFilter, searchQuery],
  );

  const filteredBasicGuides = useMemo(
    () =>
      BASIC_GUIDES.filter(
        (guide) =>
          (activeFilter === 'all' ||
            (activeFilter === 'mind' && guide.categories.includes('mind')) ||
            (activeFilter === 'basics' && guide.categories.includes('basics')) ||
            (activeFilter === 'doctor-prep' && guide.categories.includes('doctor-prep')) ||
            (activeFilter === 'symptoms' && guide.categories.includes('symptoms'))) &&
          (searchQuery.trim() === '' ||
            includesSearch(guide.title, searchQuery) ||
            includesSearch(guide.description, searchQuery)),
      ),
    [activeFilter, searchQuery],
  );

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="visible">
      <motion.section className="guides-hero-card warm-card glass-card-inner" variants={fadeUp}>
        <h2>Guides</h2>
        <p>
          Follow simple paths to organize what&apos;s happening, learn what matters, and choose
          one safer next step.
        </p>
        <div className="guides-trust-note">
          <Lock size={15} aria-hidden="true" />
          <span>{CARE_CIRCLE_LOCKED_COPY}</span>
        </div>
        <div className="guides-trust-note">
          <Shield size={15} aria-hidden="true" />
          <span>Guided support — not a diagnosis.</span>
        </div>
      </motion.section>

      <motion.div className="guides-search-wrap" variants={fadeUp}>
        <Search size={16} className="guides-search-icon" />
        <input
          type="text"
          className="guides-search-input"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search guides and flows"
          aria-label="Search guides and flows"
        />
      </motion.div>

      <motion.div className="guides-filters" variants={fadeUp}>
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            className={`guides-filter-chip ${activeFilter === filter.id ? 'guides-filter-chip--active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </motion.div>

      {filteredFlows.length > 0 ? (
        <motion.section className="guides-section" variants={fadeUp}>
          <div className="section-header guides-section-header">
            <GitBranch size={18} className="icon-teal" />
            <h3>Start a guided flow</h3>
          </div>
          <p className="guides-section-subtitle">Choose a path when something needs structure.</p>

          <div className="guides-flow-grid">
            {filteredFlows.map((flow) => (
              <motion.button
                key={flow.id}
                type="button"
                className="guides-flow-card warm-card glass-card-inner"
                variants={fadeUp}
                {...tapScale}
                onClick={() => onOpenFlowDetail(flow.id)}
              >
                <div className="guides-flow-head">
                  <h4>{flow.title}</h4>
                  <span className="progress-pill progress-pill--teal">{flow.estimatedTime}</span>
                </div>
                <p>{flow.description}</p>
                <div className="guides-flow-footer">
                  <span className="guides-trust-tag">{flow.tag}</span>
                  <span className="guides-flow-start">
                    Start
                    <ChevronRight size={16} aria-hidden="true" />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.section>
      ) : null}

      {filteredMindGuides.length > 0 ? (
        <motion.section className="guides-section" variants={fadeUp}>
          <div className="section-header guides-section-header">
            <Heart size={18} className="icon-warm" />
            <h3>For your mind</h3>
          </div>
          <p className="guides-section-subtitle">
            Small guides for stress, worry, sleep, and explaining what you feel.
          </p>

          <div className="guides-mind-grid">
            {filteredMindGuides.map((guide) => (
              <motion.article
                key={guide.id}
                className="guides-mind-card warm-card glass-card-inner"
                variants={fadeUp}
              >
                <h4>{guide.title}</h4>
                <p>{guide.description}</p>
                <div className="guides-mind-actions">
                  <motion.button
                    type="button"
                    className="guides-guide-link"
                    {...tapScale}
                    onClick={() => onOpenGuideDetail(guide.id)}
                  >
                    Read guide
                    <ChevronRight size={16} aria-hidden="true" />
                  </motion.button>
                  <button
                    type="button"
                    className="guides-inline-action"
                    onClick={() => onOpenFlowDetail('mood-stress-checkin')}
                  >
                    Start Mood Check-In
                  </button>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.section>
      ) : null}

      {filteredBasicGuides.length > 0 ? (
        <motion.section className="guides-section" variants={fadeUp}>
          <div className="section-header guides-section-header">
            <Stethoscope size={18} className="icon-muted" />
            <h3>Health basics</h3>
          </div>

          <div className="guides-basic-list">
            {filteredBasicGuides.map((guide) => (
              <motion.button
                key={guide.id}
                type="button"
                className="guides-basic-card glass-card"
                variants={fadeUp}
                {...tapScale}
                onClick={() => onOpenGuideDetail(guide.id)}
              >
                <div>
                  <p className="guides-basic-title">{guide.title}</p>
                  <p className="guides-basic-desc">{guide.description}</p>
                </div>
                <span className="guides-guide-link guides-guide-link--inline">
                  Read guide
                  <ChevronRight size={16} aria-hidden="true" />
                </span>
              </motion.button>
            ))}
          </div>
        </motion.section>
      ) : null}

      {filteredFlows.length === 0 && filteredMindGuides.length === 0 && filteredBasicGuides.length === 0 ? (
        <motion.div className="guides-empty-state warm-card glass-card-inner" variants={fadeUp}>
          <p>No matches yet. Try a different search or filter.</p>
        </motion.div>
      ) : null}

      <motion.section className="guides-safety-banner warm-card glass-card-inner" variants={fadeUp}>
        <Sparkles size={16} className="icon-muted" aria-hidden="true" />
        <p>
          Curavon helps you organize concerns and choose next steps. It does not diagnose or
          replace a clinician.
        </p>
      </motion.section>
    </motion.div>
  );
}
