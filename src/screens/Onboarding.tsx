import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, ChevronRight, Lock, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CuravonIcon, CuravonWordmark } from '../components/CuravonBrand';

const STEPS = [
  {
    id: 'welcome',
    title: 'Meet Curavon',
    subtitle: 'Your next-best-action health companion',
    body: 'Move from health confusion to one clear, safe next step — without overwhelm.',
    icon: null,
  },
  {
    id: 'action',
    title: 'One safe next action at a time',
    subtitle: 'Small steps, steady progress',
    body: 'Each day you get one meaningful action — done, blocked, or adjusted. No long lists. No guilt.',
    icon: Target,
  },
  {
    id: 'privacy',
    title: 'Private by design',
    subtitle: 'Your data stays with you',
    body: 'Health flows live on your device. You choose what to share. Sensitive Mode hides details on screen.',
    icon: Lock,
  },
  {
    id: 'goals',
    title: 'Choose your goals',
    subtitle: 'What matters most right now?',
    body: null,
    icon: null,
  },
];

const GOAL_OPTIONS = [
  'Sleep',
  'Energy',
  'Stress',
  'Eating habits',
  'Movement',
  'Skin care',
  'General wellness',
];

const SAFETY_COPY =
  'Curavon does not diagnose or replace a clinician. It helps you organize concerns and choose safer next steps.';

export function Onboarding() {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>(['Sleep', 'Energy']);
  const [sensitiveMode, setSensitiveModeLocal] = useState(false);

  const toggleGoal = (g: string) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const finish = () => {
    completeOnboarding({
      ageRange: '25-34',
      sex: 'Prefer not to say',
      goals,
      sensitiveMode,
    });
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="onboarding">
      <header className="onboarding-header">
        <span className="onboarding-status-pill">
          <CuravonIcon size={18} compact className="onboarding-status-brand-icon" />
          Gentle health companion
        </span>
      </header>

      <div className="onboarding-step">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className="onboarding-main"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: [0.4, 0, 0.2, 1] }}
          >
            {current.id !== 'goals' ? (
              <div className="onboarding-card onboarding-card--premium warm-card glass-card-inner">
                {current.id === 'welcome' ? (
                  <div className="onboarding-icon-wrap onboarding-icon-wrap--brand">
                    <CuravonIcon size={60} className="onboarding-hero-brand-icon" />
                  </div>
                ) : current.icon ? (
                  <div className="onboarding-icon-wrap">
                    <current.icon size={36} className="onboarding-icon" />
                  </div>
                ) : null}
                <h1 className="onboarding-title">
                  {current.id === 'welcome' ? (
                    <>
                      <span className="onboarding-title-lead">Meet</span>{' '}
                      <CuravonWordmark className="curavon-wordmark--hero" />
                    </>
                  ) : (
                    current.title
                  )}
                </h1>
                <p className={`onboarding-subtitle ${current.id === 'welcome' ? 'curavon-tagline' : ''}`}>
                  {current.subtitle}
                </p>
                <p className="onboarding-body">{current.body}</p>
              </div>
            ) : (
              <div className="onboarding-card onboarding-card--premium warm-card glass-card-inner setup-form">
                <h1 className="onboarding-title">{current.title}</h1>
                <p className="onboarding-subtitle">{current.subtitle}</p>
                <div className="goal-chips">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`goal-chip ${goals.includes(g) ? 'selected' : ''}`}
                      onClick={() => toggleGoal(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
                <div className="sensitive-toggle-row">
                  <div>
                    <p className="toggle-label">Sensitive Mode</p>
                    <p className="toggle-desc">Blur personal health details on screen</p>
                  </div>
                  <button
                    type="button"
                    className={`native-switch ${sensitiveMode ? 'on' : ''}`}
                    onClick={() => setSensitiveModeLocal(!sensitiveMode)}
                    aria-pressed={sensitiveMode}
                  >
                    <span className="switch-thumb" />
                  </button>
                </div>
              </div>
            )}

            <div className="privacy-notice safety-card onboarding-safety">
              <Shield size={17} aria-hidden="true" />
              <span>{SAFETY_COPY}</span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="onboarding-actions">
        <div className="onboarding-indicators" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`indicator-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
              aria-current={i === step ? 'step' : undefined}
            />
          ))}
        </div>

        {!isLast ? (
          <motion.button
            type="button"
            className="btn btn-primary btn-pill onboarding-continue-btn"
            onClick={next}
            whileTap={{ scale: 0.98 }}
          >
            <span className="button-label">Continue</span>
            <ChevronRight size={20} strokeWidth={2.4} />
          </motion.button>
        ) : (
          <motion.button
            type="button"
            className="btn btn-primary btn-pill onboarding-continue-btn"
            onClick={finish}
            disabled={goals.length === 0}
            whileTap={{ scale: 0.98 }}
          >
            <span className="button-label">Get started</span>
            <Sparkles size={18} />
          </motion.button>
        )}
      </footer>
    </div>
  );
}
