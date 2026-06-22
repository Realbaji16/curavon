import { useState } from 'react';
import { Shield, Lock, Heart, User, FileText } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useHealth } from '../context/useHealth';
import { useDoctorSummary } from '../context/useDoctorSummary';
import { ScreenHeader } from '../components/ScreenHeader';
import { HealthListEditor } from '../components/HealthListEditor';
import type { SmartSilencePreference, LanguageStyle, PregnancyStatus, ProfileSex } from '../types/health';
import {
  AGE_RANGE_OPTIONS,
  LANGUAGE_STYLE_OPTIONS,
  PREGNANCY_STATUS_OPTIONS,
  PROFILE_SEX_OPTIONS,
  pregnancyContextRelevant,
} from '../constants/lightProfileOptions';
import { clearAskHistory } from '../utils/askIntakeStorage';
import { useCuravonAuth } from '../lib/auth/useCuravonAuth';
import { clearLocalDemoAccountData } from '../lib/app/appShellState';
import { DELETION_CONFIRMATION_COPY } from '../lib/data/dataDeletionConfirm';
import {
  OPERATIONAL_DATA_MESSAGES,
  requestAccountDataDeletion,
  requestAccountDeletion,
  requestHealthProfileDeletion,
  toOperationalDataErrorMessage,
} from '../lib/data/operationalDataService';
import { ActivityInsightsSection } from '../components/ActivityInsightsSection';

const SMART_SILENCE_OPTIONS: { id: SmartSilencePreference; label: string }[] = [
  { id: 'gentle-reminders', label: 'Gentle reminders' },
  { id: 'daily-digest-only', label: 'Daily digest only' },
  { id: 'minimal-notifications', label: 'Minimal notifications' },
];

export function SettingsScreen() {
  const {
    authDemoUser,
    showToast,
    clearAuthShellState,
    openDoctorSummary,
    consentComplete,
  } = useApp();
  const {
    healthProfile,
    updateHealthProfile,
    addListItem,
    removeListItem,
    clearHealthData,
    exportHealthData,
    refreshAskHistory,
    refreshHealthStateFromStorage,
    smartSilenceLabel,
    nextActionState,
  } = useHealth();
  const { includedCount, latestDraftDate } = useDoctorSummary();
  const { session, user, signOut, deleteLocalAccount } = useCuravonAuth();
  const isSupabaseMode = session.authMode === 'supabase';
  const storageModeCopy = isSupabaseMode
    ? 'Your Curavon data is connected to your Curavon account.'
    : 'Your Curavon data is stored on this device.';
  const accountStatusLabel = isSupabaseMode ? 'Curavon account' : 'Local demo account';
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);

  const primaryGoalsLabel =
    healthProfile.primaryGoals.length > 0 ? healthProfile.primaryGoals.join(' · ') : 'Not set';

  const handleDeleteHealthData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    if (deletionBusy) return;
    setDeletionBusy(true);
    try {
      if (isSupabaseMode) {
        await requestAccountDataDeletion({ deletionScope: 'health_data' });
        await requestHealthProfileDeletion().catch(() => undefined);
        refreshHealthStateFromStorage();
      } else {
        clearHealthData();
      }
      showToast(OPERATIONAL_DATA_MESSAGES.deletionSubmitted);
      setConfirmClear(false);
    } catch (error) {
      showToast(toOperationalDataErrorMessage(error));
    } finally {
      setDeletionBusy(false);
    }
  };

  const handleCheckDataHealth = () => {
    showToast('Health data is stored in your Curavon account.');
  };

  const handleDeleteLocalAccount = async () => {
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }
    await deleteLocalAccount();
    clearLocalDemoAccountData({ clearHealthData: false });
    clearAuthShellState();
    showToast('Local account deleted');
    setConfirmDeleteAccount(false);
  };

  const handleDeleteAccountAndData = async () => {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      return;
    }
    if (deletionBusy) return;
    setDeletionBusy(true);
    try {
      if (isSupabaseMode) {
        await requestAccountDeletion();
      }
      await deleteLocalAccount();
      clearLocalDemoAccountData({ clearHealthData: true });
      if (!isSupabaseMode) {
        clearHealthData();
      }
      clearAuthShellState();
      showToast(OPERATIONAL_DATA_MESSAGES.accountDeleted);
      setConfirmDeleteAll(false);
    } catch (error) {
      showToast(toOperationalDataErrorMessage(error));
    } finally {
      setDeletionBusy(false);
    }
  };

  return (
    <div className="screen settings-screen">
      <ScreenHeader title="Profile" subtitle="Your health memory & privacy" />

      <section className="settings-section warm-card glass-card-inner profile-header-card">
        <div className="section-header">
          <User size={20} className="icon-teal" />
          <h3>{healthProfile.preferredName || user?.displayName || authDemoUser?.fullName || 'Curavon member'}</h3>
        </div>
        <div className="settings-account-grid">
          <p className="settings-account-row">
            <span>Account status</span>
            <strong>{accountStatusLabel}</strong>
          </p>
          <p className="settings-account-row">
            <span>Storage mode</span>
            <strong>{storageModeCopy}</strong>
          </p>
          <p className="section-desc" style={{ marginTop: 8 }}>
            Local demo data is not automatically moved to Supabase.
          </p>
          <p className="settings-account-row">
            <span>Signed in as</span>
            <strong>{user?.email || session.user?.email || authDemoUser?.email || 'Guest'}</strong>
          </p>
          <p className="settings-account-row">
            <span>Primary goal</span>
            <strong>{primaryGoalsLabel}</strong>
          </p>
          <p className="settings-account-row">
            <span>Sensitive Mode</span>
            <strong>{healthProfile.sensitiveMode ? 'On' : 'Off'}</strong>
          </p>
          <p className="settings-account-row">
            <span>Smart Silence</span>
            <strong>{smartSilenceLabel}</strong>
          </p>
        </div>
        <div className="settings-actions-list" style={{ marginTop: 12 }}>
          <p className="settings-data-note" style={{ marginBottom: 4 }}>
            Account deletion removes your Curavon profile and health data from Supabase immediately
            where supported. The Authentication user may remain until server admin deletion is
            configured. Signing out does not delete your account.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-glass"
            onClick={async () => {
              await signOut();
              clearAuthShellState();
              showToast('Signed out');
            }}
          >
            Sign out
          </button>
          <button type="button" className="btn btn-secondary btn-glass" onClick={handleDeleteLocalAccount}>
            {confirmDeleteAccount
              ? DELETION_CONFIRMATION_COPY.local_account_only.confirmLabel
              : 'Delete local account'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-glass"
            disabled={deletionBusy}
            onClick={handleDeleteAccountAndData}
          >
            {confirmDeleteAll
              ? DELETION_CONFIRMATION_COPY.account_and_health_data.confirmLabel
              : 'Delete account and health data'}
          </button>
        </div>
      </section>

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <User size={20} className="icon-teal" />
          <h3>Profile context</h3>
        </div>
        <p className="section-desc">
          Minimal details Curavon uses to tailor support. Add or change anytime — nothing here is required.
        </p>
        <div className="settings-profile-context">
          <p className="settings-field-label">Age range</p>
          <div className="settings-chip-row">
            {AGE_RANGE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`settings-chip ${healthProfile.ageRange === option.id ? 'settings-chip--active' : ''}`}
                onClick={() =>
                  updateHealthProfile({
                    ageRange: healthProfile.ageRange === option.id ? '' : option.id,
                  })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="settings-field-label">Sex</p>
          <div className="settings-chip-row">
            {PROFILE_SEX_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`settings-chip ${healthProfile.sex === option.id ? 'settings-chip--active' : ''}`}
                onClick={() => {
                  const next = healthProfile.sex === option.id ? '' : option.id;
                  updateHealthProfile({
                    sex: next as ProfileSex,
                    pregnancyStatus: pregnancyContextRelevant(next) ? healthProfile.pregnancyStatus : '',
                  });
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
          {pregnancyContextRelevant(healthProfile.sex) ? (
            <>
              <p className="settings-field-label">Pregnancy status</p>
              <div className="settings-chip-row settings-chip-row--stacked">
                {PREGNANCY_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`settings-chip ${healthProfile.pregnancyStatus === option.id ? 'settings-chip--active' : ''}`}
                    onClick={() =>
                      updateHealthProfile({
                        pregnancyStatus:
                          healthProfile.pregnancyStatus === option.id ? '' : (option.id as PregnancyStatus),
                      })
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          <label className="settings-text-field">
            <span>State or region</span>
            <input
              className="settings-input"
              value={healthProfile.stateOrRegion}
              onChange={(e) => updateHealthProfile({ stateOrRegion: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <p className="settings-field-label">Language style</p>
          <div className="settings-chip-row settings-chip-row--stacked">
            {LANGUAGE_STYLE_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                className={`settings-chip ${healthProfile.languageStyle === option.id ? 'settings-chip--active' : ''}`}
                onClick={() =>
                  updateHealthProfile({
                    languageStyle:
                      healthProfile.languageStyle === option.id ? '' : (option.id as LanguageStyle),
                  })
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <Heart size={20} className="icon-teal" />
          <h3>Health Profile</h3>
        </div>
        <p className="section-desc">
          Keep the details Curavon uses to organize your support.
        </p>
        <HealthListEditor
          label="Conditions"
          items={healthProfile.conditions}
          onAdd={(v) => addListItem('conditions', v)}
          onRemove={(i) => removeListItem('conditions', i)}
          placeholder="Add a condition"
          hideSensitiveValues={healthProfile.sensitiveMode}
        />
        <HealthListEditor
          label="Medications"
          items={healthProfile.medications}
          onAdd={(v) => addListItem('medications', v)}
          onRemove={(i) => removeListItem('medications', i)}
          placeholder="Add a medication"
          hideSensitiveValues={healthProfile.sensitiveMode}
        />
        <HealthListEditor
          label="Allergies"
          items={healthProfile.allergies}
          onAdd={(v) => addListItem('allergies', v)}
          onRemove={(i) => removeListItem('allergies', i)}
          placeholder="Add an allergy"
          hideSensitiveValues={healthProfile.sensitiveMode}
        />
        <HealthListEditor
          label="Health notes"
          items={healthProfile.healthNotes}
          onAdd={(v) => addListItem('healthNotes', v)}
          onRemove={(i) => removeListItem('healthNotes', i)}
          placeholder="Add a note"
          hideSensitiveValues={healthProfile.sensitiveMode}
        />
        <HealthListEditor
          label="Doctor questions"
          items={healthProfile.doctorQuestions}
          onAdd={(v) => addListItem('doctorQuestions', v)}
          onRemove={(i) => removeListItem('doctorQuestions', i)}
          placeholder="Add a question for your clinician"
          hideSensitiveValues={healthProfile.sensitiveMode}
        />
        <p className="health-safety-note">
          These notes help organize your next steps. They are not used to diagnose.
        </p>
      </section>

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <FileText size={20} className="icon-teal" />
          <h3>Doctor-ready summaries</h3>
        </div>
        <p className="section-desc">
          Organize check-ins, Guides, Ask notes, and action responses before a visit.
        </p>
        <div className="settings-account-grid">
          <p className="settings-account-row">
            <span>Included items</span>
            <strong>{includedCount}</strong>
          </p>
          <p className="settings-account-row">
            <span>Latest draft</span>
            <strong>
              {latestDraftDate
                ? new Date(latestDraftDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'None yet'}
            </strong>
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary btn-pill"
          style={{ width: '100%', marginTop: 12 }}
          onClick={openDoctorSummary}
        >
          Open summaries
        </button>
      </section>

      <ActivityInsightsSection
        safetyLevel={nextActionState?.safetyLevel ?? 'normal'}
        consentCompleted={consentComplete}
        onToast={showToast}
      />

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <Shield size={20} className="icon-warm" />
          <h3>Privacy &amp; Safety</h3>
        </div>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Sensitive Mode</p>
            <p className="toggle-desc">Blur symptoms and personal health text on screen.</p>
          </div>
          <button
            type="button"
            className={`native-switch ${healthProfile.sensitiveMode ? 'on' : ''}`}
            onClick={() => updateHealthProfile({ sensitiveMode: !healthProfile.sensitiveMode })}
            aria-pressed={healthProfile.sensitiveMode}
          >
            <span className="switch-thumb" />
          </button>
        </div>

        <p className="toggle-label" style={{ marginTop: 16 }}>Smart Silence preference</p>
        <div className="smart-silence-options">
          {SMART_SILENCE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`smart-silence-option ${healthProfile.smartSilencePreference === opt.id ? 'smart-silence-option--selected' : ''}`}
              onClick={() => updateHealthProfile({ smartSilencePreference: opt.id })}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <p className="settings-data-note">
          Curavon is for organization, reflection, and next-step support. It does not diagnose or
          prescribe. It does not replace professional medical care. If symptoms are severe, sudden,
          or unsafe, seek urgent care or local emergency support. AI may help organize safe next
          steps, but safety rules limit what it can do.
        </p>

        <div className="emergency-contact-fields">
          <label className="field-label">
            Emergency contact name
            <input
              type="text"
              className="field-input"
              value={healthProfile.emergencyContactName}
              onChange={(e) => updateHealthProfile({ emergencyContactName: e.target.value })}
              placeholder="Optional"
            />
          </label>
          <label className="field-label">
            Emergency contact phone
            <input
              type="tel"
              className="field-input"
              value={healthProfile.emergencyContactPhone}
              onChange={(e) => updateHealthProfile({ emergencyContactPhone: e.target.value })}
              placeholder="Optional"
            />
          </label>
        </div>
      </section>

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <Lock size={20} className="icon-teal" />
          <h3>Data &amp; Privacy</h3>
        </div>
        <p className="section-desc">{storageModeCopy}</p>
        <p className="settings-data-note">
          Data export will be handled through your account export request. Local backup and restore are not available in this version.
        </p>
        <p className="settings-data-note">
          Activity Insights use your Curavon activity, such as completed actions, blocked steps,
          check-ins, and saved safety notes, to help make future suggestions easier to understand.
          They are not a diagnosis.
        </p>
        <p className="settings-data-note">
          Delete health data submits a deletion request for your account. You may see a pending deletion status while it is processed; this is not the same as signing out.
        </p>
        <p className="settings-data-note">
          When Curavon notices an urgent red flag, it may save a short safety note in Doctor Summary so you can review it later or prepare for a clinician conversation. This is not diagnosis or emergency monitoring.
        </p>
        <div className="settings-actions-list">
          <button
            type="button"
            className="btn btn-secondary btn-glass"
            onClick={() => {
              exportHealthData();
              showToast(OPERATIONAL_DATA_MESSAGES.exportSubmitted);
            }}
          >
            Request data export
          </button>
          <button type="button" className="btn btn-secondary btn-glass" onClick={handleCheckDataHealth}>
            Check account data health
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-glass"
            onClick={() => {
              void clearAskHistory()
                .then(() => refreshAskHistory())
                .then(() => showToast('Ask history cleared'))
                .catch(() => showToast('Could not clear Ask history. Try again soon.'));
            }}
          >
            Clear Ask history
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-glass"
            disabled={deletionBusy}
            onClick={handleDeleteHealthData}
          >
            {confirmClear ? 'Tap again to request health data deletion' : 'Request health data deletion'}
          </button>
        </div>
      </section>

      <div className="disclaimer-box safety-card">
        <Shield size={18} />
        <span>
          Curavon is not a doctor or emergency service. It does not diagnose, prescribe, or replace
          clinical care. Terms and privacy policy are placeholders in this test build.
        </span>
      </div>
    </div>
  );
}
