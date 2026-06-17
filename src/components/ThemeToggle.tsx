import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import type { ThemePreset } from '../theme/themes';

const PRESETS: { id: ThemePreset; label: string; emoji: string }[] = [
  { id: 'sky', label: 'Sky', emoji: '☁️' },
  { id: 'mist', label: 'Mist', emoji: '🌫️' },
  { id: 'dawn', label: 'Dawn', emoji: '🌅' },
  { id: 'night', label: 'Night', emoji: '🌙' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useApp();
  const [open, setOpen] = useState(false);
  const tokens = themes[theme];

  return (
    <div className="theme-toggle-wrap">
      <button
        type="button"
        className="theme-toggle-btn glass-card"
        onClick={() => setOpen(!open)}
        aria-label="Switch mood"
        style={{
          background: tokens.glass,
          borderColor: tokens.glassBorder,
          color: tokens.text,
        }}
      >
        <span className="theme-dot" style={{ background: tokens.primary }} />
        {tokens.name}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="overlay-backdrop" onClick={() => setOpen(false)} />
            <motion.div
              className="theme-dropdown glass-card"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              style={{
                background: tokens.glass,
                borderColor: tokens.glassBorder,
                boxShadow: tokens.shadow,
              }}
            >
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`theme-option ${theme === p.id ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(p.id);
                    setOpen(false);
                  }}
                  style={{
                    color: themes[p.id].text,
                    background:
                      theme === p.id ? themes[p.id].primarySoft : 'transparent',
                  }}
                >
                  <span>{p.emoji}</span>
                  {themes[p.id].name}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
