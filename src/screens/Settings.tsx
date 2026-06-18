import { useState } from 'react';
import { Shield, Lock, Heart, User, FileText } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useHealth } from '../context/HealthContext';
import { useDoctorSummary } from '../context/DoctorSummaryContext';
import { ScreenHeader } from '../components/ScreenHeader';
import { HealthListEditor } from '../components/HealthListEditor';
import type { SmartSilencePreference } from '../types/health';
import { clearAskHistory } from '../utils/askIntakeStorage';

const SMART_SILENCE_OPTIONS: { id: SmartSilencePreference; label: string }[] = [
  { id: 'gentle-reminders', label: 'Gentle reminders' },
  { id: 'daily-digest-only', label: 'Daily digest only' },
  { id: 'minimal-notifications', label: 'Minimal notifications' },
];

export function SettingsScreen() {
  const {
    authDemoUser,
    resetChat,
    showToast,
    signOutDemo,
    openDoctorSummary,
  } = useApp();
  const {
    healthProfile,
    updateHealthProfile,
    addListItem,
    removeListItem,
    clearHealthData,
    exportHealthData,
    smartSilenceLabel,
  } = useHealth();
  const { includedCount, latestDraftDate, clearAllDoctorSummaryData } = useDoctorSummary();
  const [confirmClear, setConfirmClear] = useState(false);

  const primaryGoalsLabel =
    healthProfile.primaryGoals.length > 0 ? healthProfile.primaryGoals.join(' · ') : 'Not set';

  const handleDeleteHealthData = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearHealthData();
    clearAllDoctorSummaryData();
    showToast('All health data cleared');
    setConfirmClear(false);
  };

  return (
    <div className="screen settings-screen">
      <ScreenHeader title="Profile" subtitle="Your health memory & privacy" />

      <section className="settings-section warm-card glass-card-inner profile-header-card">
        <div className="section-header">
          <User size={20} className="icon-teal" />
          <h3>{healthProfile.preferredName || authDemoUser?.fullName || 'Curavon member'}</h3>
        </div>
        <div className="settings-account-grid">
          <p className="settings-account-row">
            <span>Account status</span>
            <strong>Prototype account</strong>
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
        <p className="section-desc">All data stays on your device for this prototype.</p>
        <p className="settings-data-note">
          Sign out keeps your saved health notes on this device. Delete all health data removes them from this prototype.
        </p>
        <div className="settings-actions-list">
          <button type="button" className="btn btn-secondary btn-glass" onClick={() => { exportHealthData(); showToast('Health data exported'); }}>
            Export my data
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-glass"
            onClick={() => {
              resetChat();
              clearAskHistory();
              showToast('Ask history cleared');
            }}
          >
            Clear Ask history
          </button>
          <button type="button" className="btn btn-secondary btn-glass" onClick={handleDeleteHealthData}>
            {confirmClear ? 'Tap again to delete all health data' : 'Delete all health data'}
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-glass"
            onClick={() => {
              signOutDemo();
              showToast('Signed out');
            }}
          >
            Sign out
          </button>
        </div>
      </section>

      <div className="disclaimer-box safety-card">
        <Shield size={18} />
        <span>
          Curavon is not a doctor. It does not diagnose, prescribe, or replace emergency care.
        </span>
      </div>
    </div>
  );
}
