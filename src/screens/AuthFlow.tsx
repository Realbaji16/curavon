import { useMemo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronRight, Lock, Shield } from 'lucide-react';
import { useApp } from '../context/useApp';
import { fadeUp } from '../motion/variants';
import { useScreenBack } from '../hooks/useScreenBack';
import { useCuravonAuth } from '../lib/auth/useCuravonAuth';
import { getConfiguredAuthMode } from '../lib/auth/authConfig';
import { SUPABASE_EMAIL_CONFIRMATION_MESSAGE } from '../lib/auth/supabaseAuthAdapter';
import { loadCoreHealthData } from '../lib/data/coreHealthDataService';
import { syncAppShellFromHealthProfile } from '../lib/app/syncAppShellFromProfile';
import {
  AGE_RANGE_OPTIONS,
  LANGUAGE_STYLE_OPTIONS,
  PREGNANCY_STATUS_OPTIONS,
  PROFILE_SEX_OPTIONS,
  parseOptionalCommaList,
  pregnancyContextRelevant,
} from '../constants/lightProfileOptions';
import type { AgeRange, LanguageStyle, PregnancyStatus, ProfileSex } from '../types/health';

const SIGNUP_INCOMPLETE_MESSAGE =
  'Sign-up did not complete. Check Supabase configuration or email confirmation settings.';

type AuthStage = 'start' | 'create' | 'signin' | 'consent' | 'profile';

function resolveAuthStage(
  isAuthenticated: boolean,
  setupComplete: boolean,
  consentComplete: boolean,
): AuthStage {
  if (!isAuthenticated) return 'start';
  if (setupComplete) return 'start';
  return consentComplete ? 'profile' : 'consent';
}

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
  const {
    setupComplete,
    consentComplete,
    completeAuthConsent,
    completeProfileSetup,
    hydrateShellForUser,
    showToast,
    resetToOnboarding,
  } = useApp();
  const { signIn, signUp, user, isAuthenticated } = useCuravonAuth();
  const resolvedAuthMode = getConfiguredAuthMode();
  const isSupabaseAuth = resolvedAuthMode === 'supabase';
  const isDev = process.env.NODE_ENV !== 'production';
  const authResolvedStage = resolveAuthStage(isAuthenticated, setupComplete, consentComplete);
  const [manualStage, setManualStage] = useState<AuthStage | null>(null);
  const stage = manualStage ?? authResolvedStage;
  const [createForm, setCreateForm] = useState<CreateForm>({
    fullName: '',
    email: '',
    password: '',
    agreeTerms: false,
    acknowledgeScope: false,
    consentStorage: false,
  });
  const [signInForm, setSignInForm] = useState<SignInForm>({ email: '', password: '' });
  const [profileName, setProfileName] = useState(user?.displayName ?? '');
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('');
  const [sex, setSex] = useState<ProfileSex | ''>('');
  const [pregnancyStatus, setPregnancyStatus] = useState<PregnancyStatus | ''>('');
  const [conditionsInput, setConditionsInput] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [medicationsInput, setMedicationsInput] = useState('');
  const [stateOrRegion, setStateOrRegion] = useState('');
  const [languageStyle, setLanguageStyle] = useState<LanguageStyle | ''>('');
  const [primaryGoals, setPrimaryGoals] = useState<string[]>([]);
  const [sensitiveMode, setSensitiveMode] = useState(false);
  const [smartSilencePreference, setSmartSilencePreference] = useState<
    'gentle-reminders' | 'daily-digest-only' | 'minimal-notifications'
  >('gentle-reminders');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const showPregnancyField = pregnancyContextRelevant(sex);

  const trustCards = useMemo(
    () => [
      {
        id: 'scope',
        title: 'Not a diagnosis',
        copy: 'Curavon helps organize concerns and next steps. It does not diagnose or replace a clinician.',
        icon: 'shield' as const,
      },
      {
        id: 'urgent',
        title: 'Urgent symptoms',
        copy: 'If symptoms feel severe, sudden, or unsafe, seek urgent medical help or local emergency support.',
        icon: 'check' as const,
      },
      {
        id: 'privacy',
        title: isSupabaseAuth ? 'Account-backed storage' : 'Local-first storage',
        copy: isSupabaseAuth
          ? 'Your Curavon account uses Supabase Auth. Health notes on this device are not automatically synced until you choose to migrate.'
          : 'In this version, your data is stored on this device. You can export or delete it anytime from Profile.',
        icon: 'shield' as const,
      },
    ],
    [isSupabaseAuth],
  );

  const goToConsent = () => {
    setErrors({});
    setManualStage('consent');
  };

  const submitCreate = async () => {
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

    const result = await signUp(createForm.email.trim(), createForm.password, createForm.fullName.trim());
    if (!result.isAuthenticated) {
      if (result.error === SUPABASE_EMAIL_CONFIRMATION_MESSAGE) {
        showToast(result.error);
        setManualStage('signin');
        return;
      }
      if (result.error) {
        showToast(result.error);
        if (process.env.NODE_ENV === 'development') {
          console.warn('Curavon Supabase sign-up failed', result.error);
        }
        return;
      }
      showToast(SIGNUP_INCOMPLETE_MESSAGE);
      if (process.env.NODE_ENV === 'development') {
        console.warn('Curavon Supabase sign-up incomplete', SIGNUP_INCOMPLETE_MESSAGE);
      }
      return;
    }
    setProfileName(createForm.fullName.trim());
    goToConsent();
  };

  const submitSignIn = async () => {
    const nextErrors: Record<string, string> = {};
    if (!isValidEmail(signInForm.email)) nextErrors.signInEmail = 'Enter a valid email.';
    if (!signInForm.password.trim()) nextErrors.signInPassword = 'Password is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const result = await signIn(signInForm.email.trim(), signInForm.password);
    if (!result.isAuthenticated) {
      const raw = result.error ?? '';
      const message = /invalid login credentials|invalid email or password/i.test(raw)
        ? 'Wrong email or password. Please try again.'
        : raw || 'Could not sign in. Please try again.';
      setErrors({ signInPassword: message });
      return;
    }

    const inferredName = signInForm.email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    const normalizedName = inferredName ? inferredName[0].toUpperCase() + inferredName.slice(1) : 'Curavon member';
    setProfileName(result.user?.displayName ?? normalizedName);

    const alreadySetup = result.user?.id ? hydrateShellForUser(result.user.id) : false;
    if (alreadySetup || setupComplete) {
      showToast('Signed in');
      setManualStage(null);
      return;
    }

    if (result.user?.id) {
      try {
        const core = await loadCoreHealthData();
        if (syncAppShellFromHealthProfile(core.healthProfile, result.user.id)) {
          hydrateShellForUser(result.user.id);
          showToast('Signed in');
          setManualStage(null);
          return;
        }
      } catch {
        // Fall through to consent/setup for first-time accounts.
      }
    }

    goToConsent();
  };

  const togglePrimaryGoal = (goal: (typeof PRIMARY_GOALS)[number]) => {
    setPrimaryGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    );
  };

  const submitProfile = () => {
    const nextErrors: Record<string, string> = {};
    if (!profileName.trim()) nextErrors.profileName = 'Preferred name is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const resolvedPregnancy: PregnancyStatus =
      showPregnancyField && pregnancyStatus
        ? pregnancyStatus
        : sex === 'male'
          ? 'not-applicable'
          : '';

    completeProfileSetup({
      preferredName: profileName.trim(),
      primaryGoals,
      sensitiveMode,
      smartSilencePreference,
      ageRange: ageRange || '',
      sex: sex || '',
      pregnancyStatus: resolvedPregnancy,
      stateOrRegion: stateOrRegion.trim(),
      languageStyle: languageStyle || '',
      conditions: parseOptionalCommaList(conditionsInput),
      allergies: parseOptionalCommaList(allergiesInput),
      medications: parseOptionalCommaList(medicationsInput),
    });
  };

  const goBack = useCallback(() => {
    setErrors({});
    if (stage === 'start') {
      resetToOnboarding();
      return;
    }
    if (stage === 'create' || stage === 'signin') {
      setManualStage('start');
      return;
    }
    if (stage === 'consent') {
      setManualStage('start');
      return;
    }
    if (stage === 'profile') {
      setManualStage('consent');
    }
  }, [stage, resetToOnboarding]);

  useScreenBack(goBack, true);

  return (
    <div className="auth-shell onboarding onboarding--flo">
      <header className="onboarding-header auth-header">
        <span className="onboarding-status-pill auth-status-pill">
          <Lock size={15} aria-hidden="true" />
          Account setup
        </span>
      </header>

      <div className="auth-step">
        <motion.div className="auth-main onboarding-main" variants={fadeUp} initial="hidden" animate="visible">
          <section className="auth-card onboarding-card onboarding-card--flo warm-card glass-card-inner">
        {stage === 'start' ? (
          <>
            <div className="auth-start-icon" aria-hidden="true">
              <Lock size={28} strokeWidth={1.5} />
            </div>
            <h1 className="auth-title">
              {isSupabaseAuth ? 'Create your Curavon account.' : 'Create your account'}
            </h1>
            <p className="auth-subtitle">
              {isSupabaseAuth
                ? 'Your account is connected to Supabase Auth.'
                : 'Set up your local Curavon profile. Your data is stored on this device in this version.'}
            </p>
            <p className="auth-trust-line">
              <Shield size={15} aria-hidden="true" />
              <span>Prototype account — private by design, not a diagnosis tool.</span>
            </p>
            <button type="button" className="btn btn-primary btn-pill auth-primary" onClick={() => setManualStage('create')}>
              Create account
              <ChevronRight size={18} />
            </button>
            <button type="button" className="btn btn-secondary btn-glass auth-secondary" onClick={() => setManualStage('signin')}>
              I already have an account
            </button>
            <p className="auth-note">You can export or delete your local data anytime in Profile.</p>
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
                <span>I consent to Curavon storing my health notes on this device for personalized support.</span>
              </label>
              {errors.consentStorage ? <span className="auth-error">{errors.consentStorage}</span> : null}
            </div>
            <button type="button" className="btn btn-primary btn-pill auth-primary" onClick={submitCreate}>
              Create account
            </button>
            <button type="button" className="auth-link-btn" onClick={() => setManualStage('signin')}>
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
            <button type="button" className="auth-link-btn" onClick={() => setManualStage('create')}>
              Create an account
            </button>
            <p className="auth-note auth-note--link">Forgot password? Coming soon</p>
          </>
        ) : null}

        {stage === 'consent' ? (
          <>
            <h1 className="auth-title">Before we begin</h1>
            <p className="auth-subtitle">
              Curavon helps you choose one safer next step. It organizes your notes — it does not diagnose.
            </p>
            <div className="auth-trust-cards">
              {trustCards.map((card) => (
                <div key={card.id} className="auth-trust-card">
                  {card.icon === 'shield' ? <Shield size={16} /> : <CheckCircle2 size={16} />}
                  <div>
                    <h3>{card.title}</h3>
                    <p>{card.copy}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary btn-pill auth-primary"
              onClick={() => {
                completeAuthConsent();
                setManualStage('profile');
              }}
            >
              I understand
            </button>
          </>
        ) : null}

        {stage === 'profile' ? (
          <>
            <h1 className="auth-title">Light profile setup</h1>
            <p className="auth-subtitle auth-profile-lede">
              Only your name is required. Add what helps — you can skip the rest and fill in more
              later as Curavon learns what matters.
            </p>
            <div className="auth-form auth-form--profile">
              <label className="auth-label">
                Preferred name <span className="auth-required">*</span>
                <input className="auth-input" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                {errors.profileName ? <span className="auth-error">{errors.profileName}</span> : null}
              </label>

              <div className="auth-profile-section">
                <p className="auth-profile-section-title">About you</p>
                <p className="auth-profile-section-desc">Optional — helps tailor safer next steps.</p>
                <div className="auth-label">
                  Age range
                  <div className="auth-choice-grid auth-choice-grid--compact">
                    {AGE_RANGE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`auth-choice-chip ${ageRange === option.id ? 'auth-choice-chip--active' : ''}`}
                        onClick={() => setAgeRange(ageRange === option.id ? '' : option.id)}
                        aria-pressed={ageRange === option.id}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="auth-label">
                  Sex
                  <div className="auth-choice-grid auth-choice-grid--compact">
                    {PROFILE_SEX_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`auth-choice-chip ${sex === option.id ? 'auth-choice-chip--active' : ''}`}
                        onClick={() => {
                          const next = sex === option.id ? '' : option.id;
                          setSex(next);
                          if (!pregnancyContextRelevant(next)) setPregnancyStatus('');
                        }}
                        aria-pressed={sex === option.id}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                {showPregnancyField ? (
                  <div className="auth-label">
                    Pregnancy status
                    <span className="auth-helper">Only if relevant to your care context.</span>
                    <div className="auth-choice-grid auth-choice-grid--stacked">
                      {PREGNANCY_STATUS_OPTIONS.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={`auth-choice-chip ${pregnancyStatus === option.id ? 'auth-choice-chip--active' : ''}`}
                          onClick={() =>
                            setPregnancyStatus(pregnancyStatus === option.id ? '' : option.id)
                          }
                          aria-pressed={pregnancyStatus === option.id}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="auth-profile-section">
                <p className="auth-profile-section-title">Health context</p>
                <p className="auth-profile-section-desc">
                  Optional — comma-separated. You control what is saved.
                </p>
                <label className="auth-label">
                  Known conditions
                  <input
                    className="auth-input"
                    value={conditionsInput}
                    onChange={(e) => setConditionsInput(e.target.value)}
                    placeholder="e.g. asthma, migraine"
                  />
                </label>
                <label className="auth-label">
                  Allergies
                  <input
                    className="auth-input"
                    value={allergiesInput}
                    onChange={(e) => setAllergiesInput(e.target.value)}
                    placeholder="e.g. penicillin, peanuts"
                  />
                </label>
                <label className="auth-label">
                  Current medications
                  <input
                    className="auth-input"
                    value={medicationsInput}
                    onChange={(e) => setMedicationsInput(e.target.value)}
                    placeholder="Only if you want to share"
                  />
                </label>
              </div>

              <div className="auth-profile-section">
                <p className="auth-profile-section-title">Preferences</p>
                <label className="auth-label">
                  State or region
                  <input
                    className="auth-input"
                    value={stateOrRegion}
                    onChange={(e) => setStateOrRegion(e.target.value)}
                    placeholder="Optional — e.g. California"
                  />
                </label>
                <div className="auth-label">
                  How should Curavon talk to you?
                  <div className="auth-choice-grid auth-choice-grid--stacked">
                    {LANGUAGE_STYLE_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`auth-choice-chip ${languageStyle === option.id ? 'auth-choice-chip--active' : ''}`}
                        onClick={() =>
                          setLanguageStyle(languageStyle === option.id ? '' : option.id)
                        }
                        aria-pressed={languageStyle === option.id}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="auth-profile-section">
                <p className="auth-profile-section-title">Your goals</p>
                <p className="auth-profile-section-desc">Optional — pick any that fit.</p>
                <div className="auth-choice-grid">
                  {PRIMARY_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      className={`auth-choice-chip ${primaryGoals.includes(goal) ? 'auth-choice-chip--active' : ''}`}
                      onClick={() => togglePrimaryGoal(goal)}
                      aria-pressed={primaryGoals.includes(goal)}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
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
                <span className="auth-helper">Notification style — change anytime in Profile.</span>
                <div className="auth-choice-grid auth-choice-grid--stacked">
                  {SMART_SILENCE_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`auth-choice-chip ${smartSilencePreference === option.id ? 'auth-choice-chip--active' : ''}`}
                      onClick={() => setSmartSilencePreference(option.id)}
                      aria-pressed={smartSilencePreference === option.id}
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
            <p className="auth-profile-skip-note">
              Everything except your name is optional. Curavon will ask only what matters as you go.
            </p>
          </>
        ) : null}
          </section>
        </motion.div>
      </div>
      {isDev ? (
        <p className="auth-note auth-mode-debug" style={{ textAlign: 'center', opacity: 0.7, fontSize: 12 }}>
          Auth mode: {isSupabaseAuth ? 'Supabase' : 'Local demo'}
        </p>
      ) : null}
    </div>
  );
}
