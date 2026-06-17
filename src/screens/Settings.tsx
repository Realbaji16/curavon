import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Bell, Trash2, EyeOff, FileText, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ScreenHeader } from '../components/ScreenHeader';
import { DoctorSummary } from '../components/DoctorSummary';

export function SettingsScreen() {
  const {
    theme,
    sensitiveMode,
    setSensitiveMode,
    smartSilence,
    toggleSmartSilence,
    clearAllData,
    openDoctorSummary,
    showDoctorSummary,
    closeDoctorSummary,
  } = useApp();
  const tokens = themes[theme];
  const [confirmClear, setConfirmClear] = useState(false);

  const silenceOptions = [
    {
      key: 'criticalOnly' as const,
      label: 'Critical alerts only',
      desc: 'No random reminders — only when something needs attention.',
    },
    {
      key: 'dailyDigest' as const,
      label: 'Daily digest',
      desc: 'One calm recap instead of noisy alerts throughout the day.',
    },
    {
      key: 'goalCoaching' as const,
      label: 'Goal coaching nudges',
      desc: 'Gentle encouragement tied to your chosen goals.',
    },
  ];

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearAllData();
    setConfirmClear(false);
  };

  return (
    <div className="screen settings-screen">
      <ScreenHeader title="Profile" subtitle="Trust, privacy & control" />

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <EyeOff size={20} className="icon-warm" />
          <h3>Sensitive Mode</h3>
        </div>
        <p className="section-desc">
          Sensitive details stay hidden on screen when you need privacy.
        </p>
        <div className="toggle-row">
          <div>
            <p className="toggle-label">Enable Sensitive Mode</p>
            <p className="toggle-desc">
              Blurs symptoms, goals, and personal health text
            </p>
          </div>
          <button
            type="button"
            className={`native-switch ${sensitiveMode ? 'on' : ''}`}
            onClick={() => setSensitiveMode(!sensitiveMode)}
            aria-pressed={sensitiveMode}
          >
            <span className="switch-thumb" />
          </button>
        </div>
        {sensitiveMode && (
          <motion.div
            className="sensitive-demo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ background: tokens.surfaceElevated, border: `1px solid ${tokens.border}` }}
          >
            <p className="sensitive-blur" style={{ color: tokens.text, margin: 0 }}>
              Example: evening energy patterns and sleep notes
            </p>
          </motion.div>
        )}
      </section>

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <Bell size={20} className="icon-accent" />
          <h3>Smart Silence</h3>
        </div>
        <p className="section-desc">
          Only useful nudges. No spam. You stay in control.
        </p>
        {silenceOptions.map(({ key, label, desc }) => (
          <div key={key} className="toggle-row">
            <div>
              <p className="toggle-label">{label}</p>
              <p className="toggle-desc">{desc}</p>
            </div>
            <button
              type="button"
              className={`native-switch ${smartSilence[key] ? 'on' : ''}`}
              onClick={() => toggleSmartSilence(key)}
              aria-pressed={smartSilence[key]}
            >
              <span className="switch-thumb" />
            </button>
          </div>
        ))}
      </section>

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <FileText size={20} className="icon-teal" />
          <h3>Doctor Summary</h3>
        </div>
        <p className="section-desc">
          Prepare a visit-ready summary — not a diagnosis.
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-glass"
          onClick={openDoctorSummary}
          style={{ width: '100%', marginTop: 8 }}
        >
          View Doctor Summary
        </button>
      </section>

      <section className="settings-section warm-card glass-card-inner">
        <div className="section-header">
          <Lock size={20} className="icon-teal" />
          <h3>Privacy</h3>
        </div>
        <p className="section-desc">
          All data stays on your device. Nothing is sold or shared without your consent.
        </p>
      </section>

      <div className="disclaimer-box safety-card">
        <Shield size={18} />
        <span>
          Curavon is not a doctor. It does not diagnose, prescribe, or replace emergency care.
        </span>
      </div>

      <motion.button
        type="button"
        className="clear-data-btn"
        whileTap={{ scale: 0.97 }}
        onClick={handleClear}
        style={{
          background: confirmClear ? tokens.danger : 'transparent',
          color: confirmClear ? '#fff' : tokens.danger,
          border: `2px solid ${tokens.danger}`,
        }}
      >
        <Trash2 size={18} />
        {confirmClear ? 'Tap again to delete all local data' : 'Clear all local data'}
      </motion.button>

      {showDoctorSummary && (
        <div className="summary-overlay">
          <div className="summary-overlay-backdrop" onClick={closeDoctorSummary} />
          <div className="summary-overlay-panel">
            <DoctorSummary variant="full" onClose={closeDoctorSummary} />
          </div>
        </div>
      )}
    </div>
  );
}
