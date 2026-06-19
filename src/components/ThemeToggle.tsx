import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/useApp';
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
        className="theme-toggle-btn"
        onClick={() => setOpen(!open)}
        aria-label="Switch mood"
        aria-expanded={open}
      >
        <span
          className="theme-dot"
          style={{ background: tokens.primary }}
          aria-hidden="true"
        />
        <span className="theme-toggle-label">{tokens.name}</span>
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="overlay-backdrop" onClick={() => setOpen(false)} />
            <motion.div
              className="theme-dropdown"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              role="menu"
              aria-label="Choose appearance mode"
            >
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === p.id}
                  className={`theme-option ${theme === p.id ? 'active' : ''}`}
                  onClick={() => {
                    setTheme(p.id);
                    setOpen(false);
                  }}
                >
                  <span className="theme-option-emoji" aria-hidden="true">
                    {p.emoji}
                  </span>
                  <span className="theme-option-label">{p.label}</span>
                  <span
                    className="theme-option-swatch"
                    style={{ background: themes[p.id].primary }}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
