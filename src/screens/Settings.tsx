import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Bell, Trash2, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ScreenHeader } from '../components/ScreenHeader';

export function SettingsScreen() {
  const {
    theme,
    sensitiveMode,
    setSensitiveMode,
    smartSilence,
    toggleSmartSilence,
    clearAllData,
  } = useApp();
  const tokens = themes[theme];
  const [confirmClear, setConfirmClear] = useState(false);

  const silenceOptions = [
    { key: 'criticalOnly' as const, label: 'Critical Alerts Only', desc: 'Only urgent safety notifications' },
    { key: 'dailyDigest' as const, label: 'Daily Digest Summary', desc: 'One gentle recap each evening' },
    { key: 'goalCoaching' as const, label: 'Goal Active Coaching', desc: 'Encouraging nudges for your goals' },
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
      <ScreenHeader title="Settings" subtitle="Privacy & preferences" />

      <section
        className="settings-section"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.border}`,
        }}
      >
        <div className="section-header">
          <Bell size={20} style={{ color: tokens.primary }} />
          <h3 style={{ color: tokens.text, margin: 0 }}>Smart Silence</h3>
        </div>
        <p className="section-desc" style={{ color: tokens.textMuted }}>
          Control when Healthy.Ai reaches out
        </p>

        {silenceOptions.map(({ key, label, desc }) => (
          <div key={key} className="toggle-row">
            <div>
              <p className="toggle-label" style={{ color: tokens.text }}>{label}</p>
              <p className="toggle-desc" style={{ color: tokens.textMuted }}>{desc}</p>
            </div>
            <button
              className={`native-switch ${smartSilence[key] ? 'on' : ''}`}
              onClick={() => toggleSmartSilence(key)}
              style={{
                background: smartSilence[key] ? tokens.primary : tokens.border,
              }}
              aria-pressed={smartSilence[key]}
            >
              <span className="switch-thumb" />
            </button>
          </div>
        ))}
      </section>

      <section
        className="settings-section sensitive-section"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${sensitiveMode ? tokens.primary : tokens.border}`,
          boxShadow: sensitiveMode ? tokens.shadow : 'none',
        }}
      >
        <div className="section-header">
          {sensitiveMode ? (
            <EyeOff size={20} style={{ color: tokens.primary }} />
          ) : (
            <Eye size={20} style={{ color: tokens.primary }} />
          )}
          <h3 style={{ color: tokens.text, margin: 0 }}>Sensitive Mode</h3>
        </div>
        <p className="section-desc" style={{ color: tokens.textMuted }}>
          Instantly blur personal health details across the app
        </p>

        <div className="toggle-row">
          <div>
            <p className="toggle-label" style={{ color: tokens.text }}>
              Enable Sensitive Mode
            </p>
            <p className="toggle-desc" style={{ color: tokens.textMuted }}>
              Protects symptom text and health goals from shoulder-surfing
            </p>
          </div>
          <button
            className={`native-switch ${sensitiveMode ? 'on' : ''}`}
            onClick={() => setSensitiveMode(!sensitiveMode)}
            style={{
              background: sensitiveMode ? tokens.primary : tokens.border,
            }}
            aria-pressed={sensitiveMode}
          >
            <span className="switch-thumb" />
          </button>
        </div>

        {sensitiveMode && (
          <motion.div
            className="sensitive-demo"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            style={{
              background: tokens.surfaceElevated,
              border: `1px solid ${tokens.border}`,
            }}
          >
            <p style={{ color: tokens.textMuted, fontSize: 13, margin: '0 0 8px' }}>
              Preview — blurred content:
            </p>
            <p className="sensitive-blur" style={{ color: tokens.text }}>
              My face is breaking out badly on my chin area
            </p>
          </motion.div>
        )}
      </section>

      <section
        className="settings-section"
        style={{
          background: tokens.cardGradient,
          border: `1px solid ${tokens.border}`,
        }}
      >
        <div className="section-header">
          <Shield size={20} style={{ color: tokens.primary }} />
          <h3 style={{ color: tokens.text, margin: 0 }}>Privacy</h3>
        </div>
        <p className="section-desc" style={{ color: tokens.textMuted }}>
          All data stored locally on your device. Nothing leaves without your consent.
        </p>
      </section>

      <motion.button
        className="clear-data-btn"
        whileTap={{ scale: 0.97 }}
        onClick={handleClear}
        style={{
          background: confirmClear ? tokens.danger : 'transparent',
          color: tokens.danger,
          border: `2px solid ${tokens.danger}`,
        }}
      >
        <Trash2 size={18} />
        {confirmClear
          ? 'Tap again to confirm — Clear All Data'
          : 'Instantly Clear All Local Health Flows & History'}
      </motion.button>
    </div>
  );
}
