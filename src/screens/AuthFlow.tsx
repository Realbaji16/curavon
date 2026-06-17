import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Shield } from 'lucide-react';
import { CuravonIcon } from '../components/CuravonBrand';
import { useApp } from '../context/AppContext';
import { fadeUp } from '../motion/variants';

type AuthStage = 'start' | 'create' | 'signin' | 'consent' | 'profile';

type CreateForm = {
  fullName: string;
  email: string;
  password: string;
  agreeTerms: boolean;
  acknowledgeScope: boolean;
  consentStorage: boolean;
};

type SignInForm = {
  email: string;
  password: string;
};

const PRIMARY_GOALS = [
  'Reduce health overwhelm',
  'Track symptoms clearly',
  'Prepare for doctor visits',
  'Support mental wellbeing',
  'Build better routines',
] as const;

const SMART_SILENCE_OPTIONS = [
  { id: 'gentle-reminders', label: 'Gentle reminders' },
  { id: 'daily-digest-only', label: 'Daily digest only' },
  { id: 'minimal-notifications', label: 'Minimal notifications' },
] as const;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function AuthFlow() {
  const { authDemoUser, setupComplete, setAuthDemoUser, completeProfileSetup, showToast } = useApp();
  const [stage, setStage] = useState<AuthStage>(authDemoUser && !setupComplete ? 'consent' : 'start');
  const [createForm, setCreateForm] = useState<CreateForm>({
    fullName: '',
    email: '',
    password: '',
    agreeTerms: false,
    acknowledgeScope: false,
    consentStorage: false,
  });
  const [signInForm, setSignInForm] = useState<SignInForm>({ email: '', password: '' });
  const [profileName, setProfileName] = useState(authDemoUser?.fullName ?? '');
  const [primaryGoal, setPrimaryGoal] = useState<(typeof PRIMARY_GOALS)[number]>('Reduce health overwhelm');
  const [sensitiveMode, setSensitiveMode] = useState(false);
  const [smartSilencePreference, setSmartSilencePreference] = useState<
    'gentle-reminders' | 'daily-digest-only' | 'minimal-notifications'
  >('gentle-reminders');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const trustCards = useMemo(
    () => [
      {
        id: 'scope',
        title: 'Not a diagnosis',
        copy: 'Curavon helps organize concerns and next steps. It does not diagnose or replace a clinician.',
      },
      {
        id: 'urgent',
        title: 'Urgent symptoms',
        copy: 'If symptoms feel severe, sudden, or unsafe, seek urgent medical help or local emergency support.',
      },
      {
        id: 'privacy',
        title: 'Privacy controls',
        copy: 'You can use Sensitive Mode, export data, and delete health notes from your profile.',
      },
    ],
    [],
  );

  const goToConsent = () => {
    setErrors({});
    setStage('consent');
  };

  const submitCreate = () => {
    const nextErrors: Record<string, string> = {};
    if (!createForm.fullName.trim()) nextErrors.fullName = 'Full name is required.';
    if (!isValidEmail(createForm.email)) nextErrors.email = 'Enter a valid email.';
    if (createForm.password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (!createForm.agreeTerms) nextErrors.agreeTerms = 'Please accept Terms and Privacy Policy.';
    if (!createForm.acknowledgeScope) {
      nextErrors.acknowledgeScope = 'Please confirm Curavon does not diagnose.';
    }
    if (!createForm.consentStorage) {
      nextErrors.consentStorage = 'Please consent to storing notes for personalized support.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setAuthDemoUser({
      fullName: createForm.fullName.trim(),
      email: createForm.email.trim(),
    });
    setProfileName(createForm.fullName.trim());
    goToConsent();
  };

  const submitSignIn = () => {
    const nextErrors: Record<string, string> = {};
    if (!isValidEmail(signInForm.email)) nextErrors.signInEmail = 'Enter a valid email.';
    if (!signInForm.password.trim()) nextErrors.signInPassword = 'Password is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const inferredName = signInForm.email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    const normalizedName = inferredName ? inferredName[0].toUpperCase() + inferredName.slice(1) : 'Curavon member';
    setAuthDemoUser({
      fullName: normalizedName,
      email: signInForm.email.trim(),
    });
    setProfileName(normalizedName);

    if (setupComplete) {
      showToast('Signed in');
      return;
    }
    goToConsent();
  };

  const submitProfile = () => {
    const nextErrors: Record<string, string> = {};
    if (!profileName.trim()) nextErrors.profileName = 'Preferred name is required.';
    if (!primaryGoal) nextErrors.primaryGoal = 'Choose a primary goal.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    completeProfileSetup({
      preferredName: profileName.trim(),
      primaryGoal,
      sensitiveMode,
      smartSilencePreference,
    });
  };

  return (
    <div className="auth-shell">
      <motion.section className="auth-card warm-card glass-card-inner" variants={fadeUp} initial="hidden" animate="visible">
        {stage === 'start' ? (
          <>
            <div className="auth-brand-wrap">
              <div className="auth-brand-halo" aria-hidden="true" />
              <CuravonIcon size={88} className="auth-brand-icon" />
            </div>
            <h1 className="auth-title">Welcome to Curavon</h1>
            <p className="auth-subtitle">
              Private next-best-action health support, built to help you move from confusion to one clear
              step.
            </p>
            <p className="auth-trust-line">
              <Shield size={15} aria-hidden="true" />
              <span>Private by design. Not a diagnosis tool.</span>
            </p>
            <button type="button" className="btn btn-primary btn-pill auth-primary" onClick={() => setStage('create')}>
              Create account
              <ChevronRight size={18} />
            </button>
            <button type="button" className="btn btn-secondary btn-glass auth-secondary" onClick={() => setStage('signin')}>
              I already have an account
            </button>
            <p className="auth-note">Your health notes stay tied to your account.</p>
          </>
        ) : null}

        {stage === 'create' ? (
          <>
            <h1 className="auth-title">Create account</h1>
            <div className="auth-form">
              <label className="auth-label">
                Full name
                <input
                  className="auth-input"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm((s) => ({ ...s, fullName: e.target.value }))}
                />
                {errors.fullName ? <span className="auth-error">{errors.fullName}</span> : null}
              </label>
              <label className="auth-label">
                Email
                <input
                  className="auth-input"
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                />
                {errors.email ? <span className="auth-error">{errors.email}</span> : null}
              </label>
              <label className="auth-label">
                Password
                <input
                  className="auth-input"
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                />
                <span className="auth-helper">Use at least 8 characters.</span>
                {errors.password ? <span className="auth-error">{errors.password}</span> : null}
              </label>
            </div>
            <div className="auth-checks">
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={createForm.agreeTerms}
                  onChange={(e) => setCreateForm((s) => ({ ...s, agreeTerms: e.target.checked }))}
                />
                <span>I agree to the Terms and Privacy Policy.</span>
              </label>
              {errors.agreeTerms ? <span className="auth-error">{errors.agreeTerms}</span> : null}
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={createForm.acknowledgeScope}
                  onChange={(e) => setCreateForm((s) => ({ ...s, acknowledgeScope: e.target.checked }))}
                />
                <span>I understand Curavon does not diagnose or replace a clinician.</span>
              </label>
              {errors.acknowledgeScope ? <span className="auth-error">{errors.acknowledgeScope}</span> : null}
              <label className="auth-check">
                <input
                  type="checkbox"
                  checked={createForm.consentStorage}
                  onChange={(e) => setCreateForm((s) => ({ ...s, consentStorage: e.target.checked }))}
                />
                <span>I consent to Curavon storing my health notes for personalized support.</span>
              </label>
              {errors.consentStorage ? <span className="auth-error">{errors.consentStorage}</span> : null}
            </div>
            <button type="button" className="btn btn-primary btn-pill auth-primary" onClick={submitCreate}>
              Create account
            </button>
            <button type="button" className="auth-link-btn" onClick={() => setStage('signin')}>
              I already have an account
            </button>
          </>
        ) : null}

        {stage === 'signin' ? (
          <>
            <h1 className="auth-title">Sign in</h1>
            <div className="auth-form">
              <label className="auth-label">
                Email
                <input
                  className="auth-input"
                  type="email"
                  value={signInForm.email}
                  onChange={(e) => setSignInForm((s) => ({ ...s, email: e.target.value }))}
                />
                {errors.signInEmail ? <span className="auth-error">{errors.signInEmail}</span> : null}
              </label>
              <label className="auth-label">
                Password
                <input
                  className="auth-input"
                  type="password"
                  value={signInForm.password}
                  onChange={(e) => setSignInForm((s) => ({ ...s, password: e.target.value }))}
                />
                {errors.signInPassword ? <span className="auth-error">{errors.signInPassword}</span> : null}
              </label>
            </div>
            <button type="button" className="btn btn-primary btn-pill auth-primary" onClick={submitSignIn}>
              Sign in
            </button>
            <button type="button" className="auth-link-btn" onClick={() => setStage('create')}>
              Create an account
            </button>
            <p className="auth-note auth-note--link">Forgot password? Coming soon</p>
          </>
        ) : null}

        {stage === 'consent' ? (
          <>
            <h1 className="auth-title">Before we begin</h1>
            <p className="auth-subtitle">
              A few safety and privacy choices help Curavon support you responsibly.
            </p>
            <div className="auth-trust-cards">
              {trustCards.map((card) => (
                <div key={card.id} className="auth-trust-card">
                  <CheckCircle2 size={16} />
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.copy}</p>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" className="btn btn-primary btn-pill auth-primary" onClick={() => setStage('profile')}>
              I understand
            </button>
          </>
        ) : null}

        {stage === 'profile' ? (
          <>
            <h1 className="auth-title">Light profile setup</h1>
            <div className="auth-form">
              <label className="auth-label">
                Preferred name
                <input className="auth-input" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                {errors.profileName ? <span className="auth-error">{errors.profileName}</span> : null}
              </label>
              <div className="auth-label">
                Primary goal
                <div className="auth-choice-grid">
                  {PRIMARY_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      className={`auth-choice-chip ${primaryGoal === goal ? 'auth-choice-chip--active' : ''}`}
                      onClick={() => setPrimaryGoal(goal)}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
                {errors.primaryGoal ? <span className="auth-error">{errors.primaryGoal}</span> : null}
              </div>
              <div className="auth-setting-row">
                <div>
                  <p className="auth-setting-title">Sensitive Mode</p>
                  <p className="auth-setting-desc">Hide sensitive details until you choose to reveal them.</p>
                </div>
                <button
                  type="button"
                  className={`native-switch ${sensitiveMode ? 'on' : ''}`}
                  onClick={() => setSensitiveMode((v) => !v)}
                  aria-pressed={sensitiveMode}
                >
                  <span className="switch-thumb" />
                </button>
              </div>
              <div className="auth-label">
                Smart Silence
                <div className="auth-choice-grid auth-choice-grid--stacked">
                  {SMART_SILENCE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`auth-choice-chip ${smartSilencePreference === option.id ? 'auth-choice-chip--active' : ''}`}
                      onClick={() => setSmartSilencePreference(option.id)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button type="button" className="btn btn-primary btn-pill auth-primary" onClick={submitProfile}>
              Enter Curavon
            </button>
          </>
        ) : null}
      </motion.section>
    </div>
  );
}
