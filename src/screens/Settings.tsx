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

      <section
        className="settings-section warm-card glass-card-inner"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.glassBorder}`,
          boxShadow: tokens.shadowSoft,
        }}
      >
        <div className="section-header">
          <EyeOff size={20} style={{ color: tokens.primary }} />
          <h3 style={{ color: tokens.text, margin: 0 }}>Sensitive Mode</h3>
        </div>
        <p className="section-desc" style={{ color: tokens.textMuted }}>
          Sensitive details stay hidden on screen when you need privacy.
        </p>
        <div className="toggle-row">
          <div>
            <p className="toggle-label" style={{ color: tokens.text }}>Enable Sensitive Mode</p>
            <p className="toggle-desc" style={{ color: tokens.textMuted }}>
              Blurs symptoms, goals, and personal health text
            </p>
          </div>
          <button
            type="button"
            className={`native-switch ${sensitiveMode ? 'on' : ''}`}
            onClick={() => setSensitiveMode(!sensitiveMode)}
            style={{ background: sensitiveMode ? tokens.primary : tokens.border }}
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

      <section
        className="settings-section warm-card glass-card-inner"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.glassBorder}`,
          boxShadow: tokens.shadowSoft,
        }}
      >
        <div className="section-header">
          <Bell size={20} style={{ color: tokens.accent }} />
          <h3 style={{ color: tokens.text, margin: 0 }}>Smart Silence</h3>
        </div>
        <p className="section-desc" style={{ color: tokens.textMuted }}>
          Only useful nudges. No spam. You stay in control.
        </p>
        {silenceOptions.map(({ key, label, desc }) => (
          <div key={key} className="toggle-row">
            <div>
              <p className="toggle-label" style={{ color: tokens.text }}>{label}</p>
              <p className="toggle-desc" style={{ color: tokens.textMuted }}>{desc}</p>
            </div>
            <button
              type="button"
              className={`native-switch ${smartSilence[key] ? 'on' : ''}`}
              onClick={() => toggleSmartSilence(key)}
              style={{ background: smartSilence[key] ? tokens.primary : tokens.border }}
              aria-pressed={smartSilence[key]}
            >
              <span className="switch-thumb" />
            </button>
          </div>
        ))}
      </section>

      <section
        className="settings-section warm-card glass-card-inner"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.glassBorder}`,
          boxShadow: tokens.shadowSoft,
        }}
      >
        <div className="section-header">
          <FileText size={20} style={{ color: tokens.teal }} />
          <h3 style={{ color: tokens.text, margin: 0 }}>Doctor Summary</h3>
        </div>
        <p className="section-desc" style={{ color: tokens.textMuted }}>
          Prepare a visit-ready summary — not a diagnosis.
        </p>
        <button
          type="button"
          className="soft-button"
          onClick={openDoctorSummary}
          style={{
            background: tokens.primarySoft,
            color: tokens.primary,
            width: '100%',
            marginTop: 8,
          }}
        >
          View Doctor Summary
        </button>
      </section>

      <section
        className="settings-section warm-card glass-card-inner"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.glassBorder}`,
          boxShadow: tokens.shadowSoft,
        }}
      >
        <div className="section-header">
          <Lock size={20} style={{ color: tokens.teal }} />
          <h3 style={{ color: tokens.text, margin: 0 }}>Privacy</h3>
        </div>
        <p className="section-desc" style={{ color: tokens.textMuted }}>
          All data stays on your device. Nothing is sold or shared without your consent.
        </p>
      </section>

      <div
        className="disclaimer-box safety-card"
        style={{
          background: tokens.accentSoft,
          border: `1px solid ${tokens.border}`,
          color: tokens.textSecondary,
        }}
      >
        <Shield size={18} />
        <span>
          Healthy.AI is not a doctor. It does not diagnose, prescribe, or replace emergency care.
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
