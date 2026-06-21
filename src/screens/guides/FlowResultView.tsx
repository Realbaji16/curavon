import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import type { FlowCard } from '../../data/guides/flowCatalog';
import type { FlowDefinition } from '../../data/guides/flowRunners';
import { formatAnswer } from '../../lib/guides/flowRunnerUtils';
import type { PlanAction } from '../../lib/plan/planTypes';

type FlowResultViewProps = {
  flow: FlowCard;
  runner: FlowDefinition;
  runnerAnswers: Record<string, unknown>;
  flowPlanAction: PlanAction | null;
  resultSaved: boolean;
  doctorDraftSaved: boolean;
  onSaveResult: () => void;
  onSaveDoctorDraft: () => void;
  onOpenDoctorSummary: () => void;
};

export function FlowResultView({
  flow,
  runner,
  runnerAnswers,
  flowPlanAction,
  resultSaved,
  doctorDraftSaved,
  onSaveResult,
  onSaveDoctorDraft,
  onOpenDoctorSummary,
}: FlowResultViewProps) {
  return (
    <motion.section
      className="guides-result-panel warm-card glass-card-inner"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3>{flow.title} — Result</h3>
      <p className="guides-result-sub">Here is a safe summary based on what you shared.</p>

      <div className="guides-result-block">
        <h4>What you shared</h4>
        <ul>
          {runner.questions?.map((question) => (
            <li key={question.id}>
              <strong>{question.prompt}</strong>: {formatAnswer(runnerAnswers[question.id])}
            </li>
          ))}
        </ul>
      </div>

      <div className="guides-result-block">
        <h4>What to watch</h4>
        <ul>
          {runner.watch.map((entry) => (
            <li key={entry}>{entry}</li>
          ))}
        </ul>
      </div>

      <div className="guides-result-block">
        <h4>{flowPlanAction?.title || 'Your next safe step'}</h4>
        <p>{flowPlanAction?.actionText || runner.nextStep}</p>
        {flowPlanAction?.reason ? <p>{flowPlanAction.reason}</p> : null}
      </div>

      <div className="guides-result-block">
        <h4>Doctor summary</h4>
        <p>
          {runner.doctorSummaryTemplate} This may be worth tracking and useful to
          mention to a clinician.
        </p>
      </div>

      <div className="guides-result-safety-footer">
        Curavon can help organize your notes, but severe, sudden, or unsafe symptoms should be
        handled by local emergency services or a clinician now.
      </div>

      <div className="guides-result-actions">
        <button type="button" className="btn btn-secondary btn-glass" onClick={onSaveResult}>
          Save result
        </button>
        <button type="button" className="btn btn-primary btn-pill" onClick={onSaveDoctorDraft}>
          Save to Doctor Summary
          <FileText size={16} />
        </button>
        <button type="button" className="btn btn-secondary btn-glass" onClick={onOpenDoctorSummary}>
          View Doctor Summary
        </button>
      </div>

      {resultSaved ? <p className="guides-result-note">Result saved.</p> : null}
      {doctorDraftSaved ? <p className="guides-result-note">Saved to Doctor Summary.</p> : null}
    </motion.section>
  );
}
