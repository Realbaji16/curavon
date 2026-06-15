import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';

const STEPS = [
  {
    id: 'welcome',
    title: 'Meet Healthy.Ai',
    subtitle: 'Your daily health action companion',
    body: 'We help you take one small, meaningful step at a time — not diagnose, not prescribe. Just gentle guidance tailored to you.',
    icon: Sparkles,
  },
  {
    id: 'privacy',
    title: 'Your Privacy Matters',
    subtitle: 'Built with care from the ground up',
    body: 'All your health flows stay on your device. We never sell your data. You control what you share with your care circle.',
    icon: Shield,
  },
  {
    id: 'setup',
    title: 'Let\'s Personalize',
    subtitle: 'Just a few quick details',
    body: null,
    icon: null,
  },
];

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];
const SEX_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'];
const GOAL_OPTIONS = ['Sleep', 'Weight', 'Skin', 'Energy', 'Stress', 'Nutrition'];

export function Onboarding() {
  const { completeOnboarding, theme } = useApp();
  const tokens = themes[theme];
  const [step, setStep] = useState(0);
  const [ageRange, setAgeRange] = useState('25-34');
  const [sex, setSex] = useState('Prefer not to say');
  const [goals, setGoals] = useState<string[]>(['Sleep', 'Skin']);
  const [sensitiveMode, setSensitiveModeLocal] = useState(false);
  const [direction, setDirection] = useState(1);

  const toggleGoal = (g: string) => {
    setGoals((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g],
    );
  };

  const next = () => {
    if (step < STEPS.length - 1) {
      setDirection(1);
      setStep(step + 1);
    }
  };

  const finish = () => {
    completeOnboarding({ ageRange, sex, goals, sensitiveMode });
  };

  const current = STEPS[step];

  return (
    <div className="onboarding" style={{ background: tokens.bgGradient }}>
      <div className="safe-area-top" />

      <div className="onboarding-indicators">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`indicator-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            style={{
              background: i <= step ? tokens.primary : tokens.border,
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          className="onboarding-step"
          custom={direction}
          initial={{ opacity: 0, x: direction * 60 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -60 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        >
          {current.id !== 'setup' ? (
            <>
              {current.icon && (
                <div
                  className="onboarding-icon-wrap"
                  style={{ background: tokens.primarySoft }}
                >
                  <current.icon size={40} style={{ color: tokens.primary }} />
                </div>
              )}
              <h1 className="onboarding-title" style={{ color: tokens.text }}>
                {current.title}
              </h1>
              <p className="onboarding-subtitle" style={{ color: tokens.textSecondary }}>
                {current.subtitle}
              </p>
              <p className="onboarding-body" style={{ color: tokens.textMuted }}>
                {current.body}
              </p>
              {current.id === 'welcome' && (
                <div
                  className="privacy-notice"
                  style={{
                    background: tokens.accentSoft,
                    border: `1px solid ${tokens.border}`,
                    color: tokens.textSecondary,
                  }}
                >
                  <Shield size={16} />
                  <span>Healthy.Ai is an action companion, not a doctor or medical device.</span>
                </div>
              )}
            </>
          ) : (
            <div className="setup-form">
              <h1 className="onboarding-title" style={{ color: tokens.text }}>
                {current.title}
              </h1>
              <p className="onboarding-subtitle" style={{ color: tokens.textSecondary }}>
                {current.subtitle}
              </p>

              <label className="form-label" style={{ color: tokens.textMuted }}>
                Age Range
              </label>
              <select
                className="native-picker"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                style={{
                  background: tokens.surface,
                  border: `1.5px solid ${tokens.border}`,
                  color: tokens.text,
                }}
              >
                {AGE_RANGES.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>

              <label className="form-label" style={{ color: tokens.textMuted }}>
                Sex
              </label>
              <select
                className="native-picker"
                value={sex}
                onChange={(e) => setSex(e.target.value)}
                style={{
                  background: tokens.surface,
                  border: `1.5px solid ${tokens.border}`,
                  color: tokens.text,
                }}
              >
                {SEX_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <label className="form-label" style={{ color: tokens.textMuted }}>
                Core Health Goals
              </label>
              <div className="goal-chips">
                {GOAL_OPTIONS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`goal-chip ${goals.includes(g) ? 'selected' : ''}`}
                    onClick={() => toggleGoal(g)}
                    style={{
                      background: goals.includes(g) ? tokens.primary : tokens.surface,
                      color: goals.includes(g) ? '#fff' : tokens.text,
                      border: `1.5px solid ${goals.includes(g) ? tokens.primary : tokens.border}`,
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <div
                className="sensitive-toggle-row"
                style={{
                  background: tokens.surface,
                  border: `1.5px solid ${tokens.border}`,
                }}
              >
                <div>
                  <p className="toggle-label" style={{ color: tokens.text }}>
                    Sensitive Mode
                  </p>
                  <p className="toggle-desc" style={{ color: tokens.textMuted }}>
                    Blur personal health details on screen
                  </p>
                </div>
                <button
                  className={`native-switch ${sensitiveMode ? 'on' : ''}`}
                  onClick={() => setSensitiveModeLocal(!sensitiveMode)}
                  style={{
                    background: sensitiveMode ? tokens.primary : tokens.border,
                  }}
                  aria-pressed={sensitiveMode}
                >
                  <span className="switch-thumb" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <div className="onboarding-footer">
        {step < STEPS.length - 1 ? (
          <motion.button
            className="primary-btn"
            whileTap={{ scale: 0.97 }}
            onClick={next}
            style={{
              background: tokens.heroGradient,
              color: '#fff',
              boxShadow: tokens.shadow,
            }}
          >
            Continue
            <ChevronRight size={20} />
          </motion.button>
        ) : (
          <motion.button
            className="primary-btn"
            whileTap={{ scale: 0.97 }}
            onClick={finish}
            style={{
              background: tokens.heroGradient,
              color: '#fff',
              boxShadow: tokens.shadow,
            }}
          >
            Finish
            <Sparkles size={18} />
          </motion.button>
        )}
      </div>
    </div>
  );
}
