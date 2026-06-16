import { useState } from 'react';
import { Shield, Sparkles, ChevronRight, Lock, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';

const STEPS = [
  {
    id: 'welcome',
    title: 'Meet Healthy.AI',
    subtitle: 'Your next-best-action health companion',
    body: 'We help you move from health confusion to one clear, safe step — without overwhelm.',
    icon: Sparkles,
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
  'Healthy.AI does not diagnose or replace a clinician. It helps you organize concerns and choose safer next steps.';

export function Onboarding() {
  const { completeOnboarding, theme } = useApp();
  const tokens = themes[theme];
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

  return (
    <div className="onboarding">
      <div className="onboarding-indicators">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`indicator-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}
            style={{ background: i <= step ? tokens.primary : tokens.border }}
          />
        ))}
      </div>

      <div key={step} className="onboarding-step">
        {current.id !== 'goals' ? (
          <div
            className="onboarding-card warm-card glass-card-inner"
            style={{
              background: tokens.cardGradient,
              border: `1px solid ${tokens.glassBorder}`,
              boxShadow: tokens.shadowSoft,
            }}
          >
            {current.icon && (
              <div className="onboarding-icon-wrap" style={{ background: tokens.primarySoft }}>
                <current.icon size={40} style={{ color: tokens.primary }} />
              </div>
            )}
            <h1 className="onboarding-title" style={{ color: tokens.text }}>{current.title}</h1>
            <p className="onboarding-subtitle" style={{ color: tokens.textSecondary }}>
              {current.subtitle}
            </p>
            <p className="onboarding-body" style={{ color: tokens.textMuted }}>{current.body}</p>
          </div>
        ) : (
          <div className="setup-form">
            <h1 className="onboarding-title" style={{ color: tokens.text }}>{current.title}</h1>
            <p className="onboarding-subtitle" style={{ color: tokens.textSecondary }}>
              {current.subtitle}
            </p>
            <div className="goal-chips">
              {GOAL_OPTIONS.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`goal-chip ${goals.includes(g) ? 'selected' : ''}`}
                  onClick={() => toggleGoal(g)}
                  style={{
                    background: goals.includes(g) ? tokens.primary : tokens.glass,
                    color: goals.includes(g) ? '#fff' : tokens.text,
                    border: `1.5px solid ${goals.includes(g) ? tokens.primary : tokens.border}`,
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
            <div
              className="sensitive-toggle-row warm-card glass-card-inner"
              style={{
                background: tokens.cardGradient,
                border: `1px solid ${tokens.glassBorder}`,
              }}
            >
              <div>
                <p className="toggle-label" style={{ color: tokens.text }}>Sensitive Mode</p>
                <p className="toggle-desc" style={{ color: tokens.textMuted }}>
                  Blur personal health details on screen
                </p>
              </div>
              <button
                type="button"
                className={`native-switch ${sensitiveMode ? 'on' : ''}`}
                onClick={() => setSensitiveModeLocal(!sensitiveMode)}
                style={{ background: sensitiveMode ? tokens.primary : tokens.border }}
                aria-pressed={sensitiveMode}
              >
                <span className="switch-thumb" />
              </button>
            </div>
          </div>
        )}

        <div
          className="privacy-notice safety-card warm-card"
          style={{
            background: tokens.accentSoft,
            border: `1px solid ${tokens.border}`,
            color: tokens.textSecondary,
          }}
        >
          <Shield size={16} />
          <span>{SAFETY_COPY}</span>
        </div>
      </div>

      <div className="onboarding-footer">
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            className="primary-btn soft-button"
            onClick={next}
            style={{ background: tokens.heroGradient, color: '#fff', boxShadow: tokens.shadow }}
          >
            Continue
            <ChevronRight size={20} />
          </button>
        ) : (
          <button
            type="button"
            className="primary-btn soft-button"
            onClick={finish}
            disabled={goals.length === 0}
            style={{ background: tokens.heroGradient, color: '#fff', boxShadow: tokens.shadow }}
          >
            Get started
            <Sparkles size={18} />
          </button>
        )}
      </div>
    </div>
  );
}
