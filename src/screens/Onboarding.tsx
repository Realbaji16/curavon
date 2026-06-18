import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Sparkles,
  ChevronRight,
  ListChecks,
  Route,
  CheckCircle2,
  Ban,
  SlidersHorizontal,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CuravonIcon, CuravonWordmark } from '../components/CuravonBrand';
import { useScreenBack } from '../hooks/useScreenBack';

const SLIDE_TRANSITION = { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const };

const STEPS = [
  {
    id: 'welcome',
    variant: 'welcome' as const,
    title: 'Meet Curavon',
    subtitle: 'Your next-best-action health companion',
    body: 'Move from health confusion to one clear, safe next step — without overwhelm.',
    safetyNote:
      'Curavon does not diagnose or replace a clinician. It helps you organize concerns and choose safer next steps.',
  },
  {
    id: 'symptoms',
    variant: 'symptoms' as const,
    title: 'Your symptoms, organized',
    body: "Tell Curavon what's happening, and it helps sort the details into a clearer picture.",
    safetyNote: 'Curavon helps organize concerns. It does not diagnose.',
  },
  {
    id: 'next-step',
    variant: 'next-step' as const,
    title: 'One clear next step',
    body: 'Get one practical action at a time, then mark it Done, Blocked, or Adjust.',
    safetyNote: 'Small steps help Curavon guide you without overwhelm.',
  },
  {
    id: 'signin',
    variant: 'signin' as const,
    title: 'One last step',
    body: 'Next, set up a private account so your notes, goals, and preferences stay with you.',
    safetyNote: 'Account setup comes right after this — it only takes a minute.',
  },
];

const DEMO_CONCERNS = [
  { label: 'Low energy', checked: true },
  { label: 'Poor sleep', checked: true },
  { label: 'Stress', checked: false },
  { label: 'Foggy focus', checked: false },
];

const DEMO_ACTION = {
  task: 'Drink a glass of water and note how you feel.',
  timeframe: '2 minutes',
};

export function Onboarding() {
  const { completeOnboarding } = useApp();
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
  };

  const finish = () => {
    completeOnboarding({
      ageRange: '25-34',
      sex: 'Prefer not to say',
      goals: [],
      goalNotes: undefined,
      sensitiveMode: false,
    });
  };

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isWelcome = current.variant === 'welcome';
  const isSignin = current.variant === 'signin';

  const goBack = useCallback(() => {
    setStep((currentStep) => Math.max(0, currentStep - 1));
  }, []);

  useScreenBack(goBack, step > 0);

  return (
    <div className={`onboarding onboarding--flo ${isWelcome ? 'onboarding--welcome' : ''}`}>
      <header className="onboarding-header">
        <span className="onboarding-status-pill">
          <CuravonIcon size={26} compact className="onboarding-status-brand-icon" />
          Gentle health companion
        </span>
      </header>

      <div className={`onboarding-step ${isWelcome ? 'onboarding-step--welcome' : ''}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            className={`onboarding-main ${isWelcome ? 'onboarding-main--welcome' : ''}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={SLIDE_TRANSITION}
          >
            {isSignin ? (
              <div className="onboarding-card onboarding-card--flo onboarding-card--signin">
                <div className="onboarding-hero-cluster onboarding-hero-cluster--compact">
                  <div className="onboarding-icon-halo" aria-hidden="true" />
                  <CuravonIcon size={88} className="onboarding-hero-brand-icon" />
                </div>
                <h1 className="onboarding-title onboarding-title--flo onboarding-title--centered">
                  {current.title}
                </h1>
                {current.body ? (
                  <p className="onboarding-body onboarding-body--flo">{current.body}</p>
                ) : null}
                {current.safetyNote ? (
                  <>
                    <div className="onboarding-card-divider" role="presentation" />
                    <p className="onboarding-disclaimer">
                      <Shield size={15} aria-hidden="true" />
                      <span>{current.safetyNote}</span>
                    </p>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="onboarding-card onboarding-card--flo">
                {isWelcome ? (
                  <div className="onboarding-hero-cluster">
                    <div className="onboarding-icon-halo" aria-hidden="true" />
                    <div className="onboarding-icon-wrap onboarding-icon-wrap--brand onboarding-icon-wrap--hero">
                      <CuravonIcon size={96} className="onboarding-hero-brand-icon" />
                    </div>
                  </div>
                ) : null}

                <div className="onboarding-card-content">
                  {current.variant === 'symptoms' ? (
                    <div className="onboarding-slide-visual" aria-hidden="true">
                      <div className="onboarding-slide-icon">
                        <ListChecks size={32} strokeWidth={1.5} />
                      </div>
                    </div>
                  ) : null}
                  {current.variant === 'next-step' ? (
                    <div className="onboarding-slide-visual" aria-hidden="true">
                      <div className="onboarding-slide-icon">
                        <Route size={32} strokeWidth={1.5} />
                      </div>
                    </div>
                  ) : null}

                  <h1 className="onboarding-title onboarding-title--flo">
                    {isWelcome ? (
                      <>
                        <span className="onboarding-title-lead">Meet</span>{' '}
                        <CuravonWordmark className="curavon-wordmark--hero" />
                      </>
                    ) : (
                      current.title
                    )}
                  </h1>

                  {current.subtitle ? (
                    <p className="onboarding-subtitle onboarding-subtitle--flo curavon-tagline">
                      {current.subtitle}
                    </p>
                  ) : null}

                  {current.body ? (
                    <p className="onboarding-body onboarding-body--flo">{current.body}</p>
                  ) : null}

                  {current.variant === 'symptoms' ? (
                    <div className="onboarding-concern-chips" aria-hidden="true">
                      {DEMO_CONCERNS.map((concern) => (
                        <span
                          key={concern.label}
                          className={`onboarding-concern-chip ${concern.checked ? 'is-checked' : ''}`}
                        >
                          {concern.checked ? (
                            <CheckCircle2 size={14} strokeWidth={1.5} />
                          ) : null}
                          {concern.label}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {current.variant === 'next-step' ? (
                    <div className="onboarding-action-preview" aria-hidden="true">
                      <p className="onboarding-action-preview-task">{DEMO_ACTION.task}</p>
                      <p className="onboarding-action-preview-time">{DEMO_ACTION.timeframe}</p>
                      <div className="onboarding-action-preview-btns">
                        <span className="onboarding-preview-btn onboarding-preview-btn--done">
                          <CheckCircle2 size={14} strokeWidth={1.5} />
                          Done
                        </span>
                        <span className="onboarding-preview-btn onboarding-preview-btn--blocked">
                          <Ban size={14} strokeWidth={1.5} />
                          Blocked
                        </span>
                        <span className="onboarding-preview-btn onboarding-preview-btn--adjust">
                          <SlidersHorizontal size={14} strokeWidth={1.5} />
                          Adjust
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {current.safetyNote ? (
                    <>
                      <div className="onboarding-card-divider" role="presentation" />
                      <p className="onboarding-disclaimer">
                        <Shield size={15} aria-hidden="true" />
                        <span>{current.safetyNote}</span>
                      </p>
                    </>
                  ) : null}
                </div>
              </div>
            )}
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
