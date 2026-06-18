import { useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Copy, Download, Trash2, Plus } from 'lucide-react';
import { useDoctorSummary } from '../context/DoctorSummaryContext';
import { SensitiveBlur } from './ScreenHeader';
import { fadeUp, staggerContainer, tapScale } from '../motion/variants';

function formatItemDate(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function DoctorSummaryHub() {
  const {
    items,
    builtSummary,
    includedCount,
    toggleItemIncluded,
    clinicianQuestions,
    addClinicianQuestion,
    copySummary,
    downloadSummary,
    clearDraft,
  } = useDoctorSummary();
  const [questionInput, setQuestionInput] = useState('');

  const recentItems = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleAddQuestion = () => {
    if (!questionInput.trim()) return;
    addClinicianQuestion(questionInput);
    setQuestionInput('');
  };

  return (
    <motion.div
      className="doctor-summary-hub warm-card glass-card-inner"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div className="summary-hub-intro" variants={fadeUp}>
        <div className="summary-header">
          <FileText size={22} className="icon-teal" />
          <div>
            <h3>Doctor-ready summary</h3>
            <p className="summary-sub">
              Organize recent notes, symptoms, actions, and questions before speaking with a
              clinician.
            </p>
          </div>
        </div>
        <p className="summary-hub-safety">
          This summary is not a diagnosis or medical advice.
        </p>
      </motion.div>

      <motion.section className="summary-hub-section" variants={fadeUp}>
        <h4>Recent items</h4>
        {recentItems.length === 0 ? (
          <p className="summary-hub-empty">
            Items from check-ins, Guides, Ask, and next actions will appear here.
          </p>
        ) : (
          <ul className="summary-item-list">
            {recentItems.map((item) => (
              <li key={item.id} className="summary-item-card">
                <div className="summary-item-head">
                  <div>
                    <p className="summary-item-title">
                      <SensitiveBlur sensitive>{item.title}</SensitiveBlur>
                    </p>
                    <p className="summary-item-meta">
                      {item.source} · {formatItemDate(item.createdAt)}
                    </p>
                  </div>
                  <label className="summary-include-toggle">
                    <input
                      type="checkbox"
                      checked={item.includedInSummary}
                      onChange={() => toggleItemIncluded(item.id)}
                    />
                    <span>Include</span>
                  </label>
                </div>
                <div className="summary-item-tags">
                  {item.tags.map((tag) => (
                    <span key={tag} className="summary-tag-chip">
                      {tag}
                    </span>
                  ))}
                  {item.severity === 'urgent' && (
                    <span className="summary-tag-chip summary-tag-chip--attention">safety note</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.section>

      <motion.section className="summary-hub-section" variants={fadeUp}>
        <h4>Selected for summary ({includedCount})</h4>
        <div className="summary-built-preview">
          {builtSummary.sections.map((section) => (
            <div key={section.heading} className="summary-built-block">
              <h5>{section.heading}</h5>
              <p>
                <SensitiveBlur sensitive>{section.body}</SensitiveBlur>
              </p>
            </div>
          ))}
          <p className="summary-built-footer">{builtSummary.footer}</p>
        </div>
      </motion.section>

      <motion.section className="summary-hub-section" variants={fadeUp}>
        <h4>Questions for clinician</h4>
        <div className="summary-question-add">
          <input
            type="text"
            className="field-input"
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            placeholder="Add a question for your visit"
            onKeyDown={(e) => e.key === 'Enter' && handleAddQuestion()}
          />
          <button type="button" className="summary-question-add-btn" onClick={handleAddQuestion}>
            <Plus size={18} />
          </button>
        </div>
        {clinicianQuestions.length > 0 && (
          <ul className="summary-question-list">
            {clinicianQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        )}
      </motion.section>

      <motion.div className="summary-hub-actions" variants={fadeUp}>
        <motion.button
          type="button"
          className="btn btn-primary"
          {...tapScale}
          onClick={() => void copySummary()}
        >
          <Copy size={18} />
          Copy summary
        </motion.button>
        <motion.button
          type="button"
          className="btn btn-secondary btn-glass"
          {...tapScale}
          onClick={downloadSummary}
        >
          <Download size={18} />
          Download .txt
        </motion.button>
        <motion.button
          type="button"
          className="btn btn-secondary btn-glass"
          {...tapScale}
          onClick={clearDraft}
        >
          <Trash2 size={18} />
          Clear draft
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
