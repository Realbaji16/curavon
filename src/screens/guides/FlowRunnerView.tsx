import { motion } from 'framer-motion';
import { ChevronRight, Shield } from 'lucide-react';
import type { FlowDefinition, FlowQuestion } from '../../data/guides/flowRunners';

type FlowRunnerViewProps = {
  runner: FlowDefinition;
  runnerStep: number;
  currentQuestion: FlowQuestion;
  currentAnswer: unknown;
  canContinue: boolean;
  showMoodSafetyMessage: boolean;
  showGuidesSafety: boolean;
  guidesSafetyTitle: string;
  guidesSafetyBody: string;
  onSetAnswer: (question: FlowQuestion, value: unknown) => void;
  onToggleMultiOption: (question: FlowQuestion, option: string) => void;
  onBack: () => void;
  onNext: () => void;
  onPrepareSummaryFromSafety: () => void;
  onContinueToSafetyTerminal: () => void;
};

export function FlowRunnerView({
  runner,
  runnerStep,
  currentQuestion,
  currentAnswer,
  canContinue,
  showMoodSafetyMessage,
  showGuidesSafety,
  guidesSafetyTitle,
  guidesSafetyBody,
  onSetAnswer,
  onToggleMultiOption,
  onBack,
  onNext,
  onPrepareSummaryFromSafety,
  onContinueToSafetyTerminal,
}: FlowRunnerViewProps) {
  const questions = runner.questions ?? [];

  return (
    <motion.section
      className="guides-runner-panel"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="guides-runner-head">
        <span className="guides-runner-step">
          Step {runnerStep + 1} of {questions.length}
        </span>
      </div>

      <div className="guides-runner-progress">
        <div
          className="guides-runner-progress-fill"
          style={{ width: `${((runnerStep + 1) / questions.length) * 100}%` }}
        />
      </div>

      <article className="guides-runner-card warm-card glass-card-inner">
        <h3>{currentQuestion.prompt}</h3>
        {currentQuestion.helper ? <p className="guides-runner-helper">{currentQuestion.helper}</p> : null}

        {currentQuestion.type === 'single' || currentQuestion.type === 'yesno' ? (
          <div className="guides-runner-options">
            {currentQuestion.options?.map((option) => (
              <button
                key={option}
                type="button"
                className={`guides-answer-chip ${currentAnswer === option ? 'guides-answer-chip--active' : ''}`}
                onClick={() => onSetAnswer(currentQuestion, option)}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {currentQuestion.type === 'multi' ? (
          <div className="guides-runner-options">
            {currentQuestion.options?.map((option) => {
              const values = Array.isArray(currentAnswer) ? (currentAnswer as string[]) : [];
              const active = values.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  className={`guides-answer-chip ${active ? 'guides-answer-chip--active' : ''}`}
                  onClick={() => onToggleMultiOption(currentQuestion, option)}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ) : null}

        {currentQuestion.type === 'scale' ? (
          <div className="guides-scale-grid">
            {Array.from(
              { length: (currentQuestion.max ?? 10) - (currentQuestion.min ?? 1) + 1 },
              (_, index) => (currentQuestion.min ?? 1) + index,
            ).map((score) => (
              <button
                key={score}
                type="button"
                className={`guides-scale-chip ${currentAnswer === score ? 'guides-scale-chip--active' : ''}`}
                onClick={() => onSetAnswer(currentQuestion, score)}
              >
                {score}
              </button>
            ))}
          </div>
        ) : null}

        {currentQuestion.type === 'shortText' ? (
          <textarea
            className="guides-short-text"
            placeholder="Type your note"
            value={typeof currentAnswer === 'string' ? currentAnswer : ''}
            onChange={(event) => onSetAnswer(currentQuestion, event.target.value)}
            rows={4}
          />
        ) : null}
      </article>

      {showMoodSafetyMessage ? (
        <div className="guides-safety-alert warm-card glass-card-inner">
          <Shield size={16} />
          <p>
            You deserve immediate support. If you may be in danger or might harm yourself, contact
            local emergency services or a trusted person now.
          </p>
        </div>
      ) : null}

      {showGuidesSafety ? (
        <div className="guides-safety-modal warm-card glass-card-inner">
          <h4>{guidesSafetyTitle}</h4>
          <p>{guidesSafetyBody}</p>
          <div className="guides-safety-actions">
            <button type="button" className="btn btn-primary btn-pill" onClick={onPrepareSummaryFromSafety}>
              Prepare summary
            </button>
            <button type="button" className="btn btn-secondary btn-glass" onClick={onContinueToSafetyTerminal}>
              Continue to safety options
            </button>
          </div>
        </div>
      ) : null}

      <div className="guides-runner-actions">
        <button type="button" className="btn btn-secondary btn-glass" onClick={onBack}>
          Back
        </button>
        <button type="button" className="btn btn-primary btn-pill" onClick={onNext} disabled={!canContinue}>
          Continue
          <ChevronRight size={16} />
        </button>
      </div>
    </motion.section>
  );
}
