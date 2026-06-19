import { useRef, useState, type ChangeEvent } from 'react';
import { Shield, Lock, Heart, User, FileText } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useHealth } from '../context/useHealth';
import { useDoctorSummary } from '../context/useDoctorSummary';
import { ScreenHeader } from '../components/ScreenHeader';
import { HealthListEditor } from '../components/HealthListEditor';
import type { SmartSilencePreference } from '../types/health';
import { clearAskHistory } from '../utils/askIntakeStorage';
import { useCuravonAuth } from '../lib/auth/useCuravonAuth';
import { APP_STORAGE_KEYS } from '../lib/data/storageKeys';
import { safeRead } from '../utils/healthStorage';
import {
  downloadLocalBackup,
  type CuravonLocalBackup,
} from '../lib/data/dataBackup';
import { restoreLocalBackup, validateBackupFile } from '../lib/data/dataRestore';
import { runLocalDataHealthCheck } from '../lib/data/dataHealthCheck';
import { deleteLocalAccountData } from '../lib/data/dataDeletion';
import { DELETION_CONFIRMATION_COPY } from '../lib/data/dataDeletionConfirm';

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
  const { session, user, signOut, deleteLocalAccount } = useCuravonAuth();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [restoreDraft, setRestoreDraft] = useState<CuravonLocalBackup | null>(null);
  const [restorePreview, setRestorePreview] = useState<{
    appName: string;
    backupVersion: string;
    exportedAt: string;
    collectionCounts: Record<string, number>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const primaryGoalsLabel =
    healthProfile.primaryGoals.length > 0 ? healthProfile.primaryGoals.join(' · ') : 'Not set';
  const localUserId = safeRead<string>(APP_STORAGE_KEYS.authDemoUserId, 'local-anon-user');

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

  const handleBackupDownload = () => {
    downloadLocalBackup(localUserId);
    showToast('Local backup downloaded');
  };

  const handleOpenRestore = () => {
    fileInputRef.current?.click();
  };

  const handleRestoreFileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CuravonLocalBackup;
      const validation = validateBackupFile(parsed);
      if (!validation.valid) {
        showToast('Invalid backup file');
        setRestoreDraft(null);
        setRestorePreview(null);
        return;
      }
      setRestoreDraft(parsed);
      setRestorePreview({
        appName: parsed.appName,
        backupVersion: parsed.backupVersion,
        exportedAt: parsed.exportedAt,
        collectionCounts: {
          dailyCheckins: parsed.collections.dailyCheckins.length,
          askHistory: parsed.collections.askHistory.length,
          doctorSummaryItems: parsed.collections.doctorSummaryItems.length,
          followUps: parsed.collections.followUps.length,
          guideResults: parsed.collections.guideResults.length,
        },
      });
      showToast('Backup file ready to restore');
    } catch {
      showToast('Could not read backup file');
      setRestoreDraft(null);
      setRestorePreview(null);
    } finally {
      event.target.value = '';
    }
  };

  const runRestore = (mode: 'merge' | 'replace') => {
    if (!restoreDraft) return;
    const result = restoreLocalBackup(restoreDraft, {
      mode,
      confirmReplace: mode === 'replace',
    });
    if (!result.ok) {
      showToast('Restore failed');
      return;
    }
    showToast(mode === 'replace' ? 'Backup restored (replace)' : 'Backup restored (merge)');
    setRestoreDraft(null);
    setRestorePreview(null);
  };

  const handleCheckDataHealth = () => {
    const result = runLocalDataHealthCheck();
    if (result.status === 'healthy') {
      showToast('Your local data looks okay.');
      return;
    }
    if (result.status === 'repaired') {
      showToast('Curavon repaired one local storage issue.');
      return;
    }
    showToast('Curavon found a local data issue. Export a backup before continuing.');
  };

  const handleDeleteLocalAccount = async () => {
    if (!confirmDeleteAccount) {
      setConfirmDeleteAccount(true);
      return;
    }
    await deleteLocalAccount();
    deleteLocalAccountData(localUserId, { deleteHealthData: false });
    clearAuthShellState();
    showToast('Local account deleted');
    setConfirmDeleteAccount(false);
  };

  const handleDeleteAccountAndData = async () => {
    if (!confirmDeleteAll) {
      setConfirmDeleteAll(true);
      return;
    }
    await deleteLocalAccount();
    deleteLocalAccountData(localUserId, { deleteHealthData: true });
    clearHealthData();
    clearAllDoctorSummaryData();
    clearAuthShellState();
    showToast('Local account and health data deleted');
    setConfirmDeleteAll(false);
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
            <strong>Local demo account</strong>
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
          <button type="button" className="btn btn-secondary btn-glass" onClick={handleDeleteAccountAndData}>
            {confirmDeleteAll
              ? DELETION_CONFIRMATION_COPY.account_and_health_data.confirmLabel
              : 'Delete account and health data'}
          </button>
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
        <p className="section-desc">Your data is stored on this device in this version.</p>
        <p className="settings-data-note">
          Sign out keeps your saved health notes on this device. Delete all health data removes them from this version.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={handleRestoreFileSelected}
        />
        <div className="settings-actions-list">
          <button type="button" className="btn btn-secondary btn-glass" onClick={() => { exportHealthData(); showToast('Health data exported'); }}>
            Export my data
          </button>
          <button type="button" className="btn btn-secondary btn-glass" onClick={handleBackupDownload}>
            Download local backup
          </button>
          <button type="button" className="btn btn-secondary btn-glass" onClick={handleOpenRestore}>
            Restore from backup
          </button>
          <button type="button" className="btn btn-secondary btn-glass" onClick={handleCheckDataHealth}>
            Check local data health
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-glass"
            onClick={() => {
              clearAskHistory();
              showToast('Ask history cleared');
            }}
          >
            Clear Ask history
          </button>
          <button type="button" className="btn btn-secondary btn-glass" onClick={handleDeleteHealthData}>
            {confirmClear ? 'Tap again to delete all health data' : 'Delete all health data'}
          </button>
        </div>
        {restorePreview ? (
          <div className="settings-data-note" style={{ marginTop: 12 }}>
            <p>
              Backup: {restorePreview.appName} v{restorePreview.backupVersion} -{' '}
              {new Date(restorePreview.exportedAt).toLocaleDateString()}
            </p>
            <p>
              Items: check-ins {restorePreview.collectionCounts.dailyCheckins}, Ask {restorePreview.collectionCounts.askHistory}, summary {restorePreview.collectionCounts.doctorSummaryItems}
            </p>
            <div className="settings-actions-list" style={{ marginTop: 8 }}>
              <button type="button" className="btn btn-secondary btn-glass" onClick={() => runRestore('merge')}>
                Merge restore
              </button>
              <button type="button" className="btn btn-secondary btn-glass" onClick={() => runRestore('replace')}>
                Replace restore
              </button>
            </div>
          </div>
        ) : null}
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
