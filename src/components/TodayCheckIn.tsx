import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useHealth } from '../context/HealthContext';
import { useApp } from '../context/AppContext';
import { useDoctorSummary } from '../context/DoctorSummaryContext';
import { useScreenBack } from '../hooks/useScreenBack';
import {
  CALM_URGENT_TITLE,
  detectUrgentConcern,
} from '../utils/healthSafety';
import { STEPS_BAND_OPTIONS, stepsBandToCount } from '../utils/stepsUtils';
import type { CheckInDraft } from '../types/health';
import { fadeUp, tapScale } from '../motion/variants';

const STEPS = [
  { key: 'sleepQuality', question: 'How was your sleep?', type: 'choice' as const, options: ['Restful', 'Okay', 'Poor', 'Very poor'] },
  { key: 'energyLevel', question: 'How is your energy today?', type: 'choice' as const, options: ['High', 'Steady', 'Low', 'Drained'] },
  { key: 'stepsBand', question: 'About how many steps today?', type: 'choice' as const, options: [...STEPS_BAND_OPTIONS] },
  { key: 'stressLevel', question: 'How stressed do you feel?', type: 'choice' as const, options: ['Calm', 'A little tense', 'Stressed', 'Overwhelmed'] },
  { key: 'mood', question: 'What feels closest today?', type: 'choice' as const, options: ['Clear', 'Worried', 'Low', 'Irritable', 'Numb', 'Not sure'] },
  { key: 'symptoms', question: 'Any symptoms you want Curavon to remember?', type: 'text' as const, placeholder: 'Headache, stomach pain, fatigue, worry, etc.' },
  { key: 'painLevel', question: 'If there\'s pain or discomfort, how strong is it?', type: 'scale' as const },
  { key: 'hydration', question: 'Have you had enough water today?', type: 'choice' as const, options: ['Yes', 'Some', 'Not yet'] },
  { key: 'medicationTaken', question: 'Any medication you needed to take today?', type: 'choice' as const, options: ['Yes, taken', 'Needed but not yet', 'Not applicable'] },
  { key: 'notes', question: 'Anything else worth remembering?', type: 'text' as const, placeholder: 'Triggers, timing, worries, or anything you noticed.' },
  { key: 'review', question: 'Review your check-in', type: 'review' as const },
];

const INITIAL_DRAFT: CheckInDraft = {
  sleepQuality: '',
  energyLevel: '',
  stressLevel: '',
  mood: '',
  symptoms: '',
  painLevel: 0,
  hydration: '',
  medicationTaken: '',
  notes: '',
  steps: 0,
  stepsBand: '',
};

export function TodayCheckIn() {
  const { showCheckIn, closeCheckIn, saveCheckIn, dailySteps, openUrgentSafety, showUrgentSafety, closeUrgentSafety } = useHealth();
  const { openDoctorSummary } = useApp();
  const { logRedFlag } = useDoctorSummary();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<CheckInDraft>(INITIAL_DRAFT);
  const [textInput, setTextInput] = useState('');
  const [urgentSafetyContext, setUrgentSafetyContext] = useState<{
    title: string;
    body: string;
  } | null>(null);

  useEffect(() => {
    if (!showCheckIn) {
      setStep(0);
      setDraft(INITIAL_DRAFT);
      setTextInput('');
      setUrgentSafetyContext(null);
      return;
    }
    if (dailySteps.steps > 0) {
      setDraft((d) => ({ ...d, steps: dailySteps.steps }));
    }
  }, [showCheckIn, dailySteps.steps]);

  useScreenBack(
    () => {
      if (step > 0) setStep((s) => s - 1);
      else closeCheckIn();
    },
    showCheckIn,
  );

  if (!showCheckIn) return null;

  const current = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  const setChoice = (value: string | number) => {
    setDraft((d) => ({ ...d, [current.key]: value }));
  };

  const advance = () => {
    if (current.type === 'text') {
      setDraft((d) => ({ ...d, [current.key]: textInput }));
      setTextInput('');
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleContinue = () => {
    if (current.type === 'choice' && !draft[current.key as keyof CheckInDraft]) return;
    if (current.type === 'scale' && draft.painLevel === undefined) return;
    if (current.key === 'symptoms' || current.key === 'notes') {
      const value = current.type === 'text' ? textInput : String(draft[current.key as keyof CheckInDraft] ?? '');
      const urgent = detectUrgentConcern(value);
      if (urgent.hasUrgent) {
        if (current.type === 'text') {
          setDraft((d) => ({ ...d, [current.key]: textInput }));
        }
        logRedFlag({
          source: 'Today Check-In',
          userText: value,
          guidanceShown: urgent.body,
          matchedConcern: urgent.matches[0] ?? 'urgent concern',
        });
        setUrgentSafetyContext({
          title: urgent.title,
          body: urgent.body,
        });
        openUrgentSafety();
        return;
      }
    }
    advance();
  };

  const handleSave = () => {
    const band = draft.stepsBand ?? '';
    const steps = stepsBandToCount(band, dailySteps.steps);
    saveCheckIn({
      sleepQuality: draft.sleepQuality ?? '',
      energyLevel: draft.energyLevel ?? '',
      stressLevel: draft.stressLevel ?? '',
      mood: draft.mood ?? '',
      symptoms: draft.symptoms ?? '',
      painLevel: draft.painLevel ?? 0,
      hydration: draft.hydration ?? '',
      medicationTaken: draft.medicationTaken ?? '',
      notes: draft.notes ?? '',
      steps,
      stepsBand: band,
    });
  };

  const canContinue =
    current.type === 'review' ||
    current.type === 'scale' ||
    (current.type === 'text' && textInput.trim().length > 0) ||
    (current.type === 'choice' && Boolean(draft[current.key as keyof CheckInDraft]));

  return (
    <div className="checkin-overlay">
      <div className="checkin-overlay-backdrop" onClick={closeCheckIn} aria-hidden="true" />
      <motion.div
        className="checkin-panel warm-card glass-card-inner"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
      >
        <div className="checkin-progress">
          <div className="checkin-progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <p className="checkin-step-label">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="checkin-question">{current.question}</h2>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.key}
            className="checkin-step-body"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -6 }}
          >
            {current.type === 'choice' && (
              <div className="checkin-choices">
                {current.options?.map((opt) => (
                  <motion.button
                    key={opt}
                    type="button"
                    className={`checkin-choice ${draft[current.key as keyof CheckInDraft] === opt ? 'checkin-choice--selected' : ''}`}
                    {...tapScale}
                    onClick={() => {
                      setChoice(opt);
                      setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 180);
                    }}
                  >
                    {opt}
                  </motion.button>
                ))}
              </div>
            )}

            {current.type === 'text' && (
              <textarea
                className="checkin-text-input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={current.placeholder}
                rows={3}
              />
            )}

            {current.type === 'scale' && (
              <div className="checkin-scale">
                {Array.from({ length: 11 }, (_, i) => i).map((n) => (
                  <motion.button
                    key={n}
                    type="button"
                    className={`checkin-scale-btn ${draft.painLevel === n ? 'checkin-scale-btn--selected' : ''}`}
                    {...tapScale}
                    onClick={() => {
                      setChoice(n);
                      setTimeout(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 180);
                    }}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            )}

            {current.type === 'review' && (
              <ul className="checkin-review-list">
                <li><span>Sleep</span><strong>{draft.sleepQuality}</strong></li>
                <li><span>Energy</span><strong>{draft.energyLevel}</strong></li>
                <li><span>Steps</span><strong>{draft.stepsBand || (draft.steps ? `${draft.steps.toLocaleString()} steps` : '—')}</strong></li>
                <li><span>Stress</span><strong>{draft.stressLevel}</strong></li>
                <li><span>Mood</span><strong>{draft.mood}</strong></li>
                <li><span>Symptoms</span><strong>{draft.symptoms || '—'}</strong></li>
                <li><span>Pain</span><strong>{draft.painLevel}/10</strong></li>
                <li><span>Hydration</span><strong>{draft.hydration}</strong></li>
                <li><span>Medication</span><strong>{draft.medicationTaken}</strong></li>
                <li><span>Notes</span><strong>{draft.notes || '—'}</strong></li>
              </ul>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="checkin-nav">
          <button
            type="button"
            className="checkin-nav-btn checkin-nav-btn--back"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : closeCheckIn())}
          >
            <ChevronLeft size={18} />
            Back
          </button>
          {current.type === 'review' ? (
            <motion.button
              type="button"
              className="btn btn-primary checkin-save-btn"
              {...tapScale}
              onClick={handleSave}
            >
              <Sparkles size={18} />
              Save check-in
            </motion.button>
          ) : (
            <button
              type="button"
              className="checkin-nav-btn checkin-nav-btn--continue"
              disabled={!canContinue}
              onClick={handleContinue}
            >
              Continue
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence>
        {showUrgentSafety && (
          <>
            <motion.div
              className="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeUrgentSafety}
            />
            <motion.div
              className="safety-calm-modal warm-card glass-card-inner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
            >
              <h3 className="safety-calm-title">{urgentSafetyContext?.title ?? CALM_URGENT_TITLE}</h3>
              <p className="safety-calm-message">{urgentSafetyContext?.body}</p>
              <div className="safety-calm-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-glass"
                  onClick={() => {
                    closeUrgentSafety();
                    setUrgentSafetyContext(null);
                    if (current.type === 'text') {
                      setDraft((d) => ({ ...d, [current.key]: textInput }));
                      setTextInput('');
                    }
                    if (step < STEPS.length - 1) setStep((s) => s + 1);
                  }}
                >
                  I understand
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    closeUrgentSafety();
                    setUrgentSafetyContext(null);
                    if (current.type === 'text') {
                      setDraft((d) => ({ ...d, [current.key]: textInput }));
                      setTextInput('');
                    }
                    if (step < STEPS.length - 1) setStep((s) => s + 1);
                    openDoctorSummary();
                  }}
                >
                  Prepare summary
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
