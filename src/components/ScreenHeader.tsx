import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { themes } from '../theme/themes';
import { ThemeToggle } from './ThemeToggle';
import { CuravonBrandLockup } from './CuravonBrand';

interface ScreenHeaderProps {
  title?: string;
  showThemeToggle?: boolean;
  subtitle?: string;
  compact?: boolean;
}

export function ScreenHeader({ title, showThemeToggle = true, subtitle, compact = false }: ScreenHeaderProps) {
  return (
    <header className={`screen-header ${compact ? 'screen-header--compact' : ''}`}>
      <div className="header-content">
        {title ? (
          <div>
            <h1 className="header-title">{title}</h1>
            {subtitle && (
              <p className="header-subtitle">{subtitle}</p>
            )}
          </div>
        ) : (
          <div className="header-brand">
            <CuravonBrandLockup className="brand-name" iconSize={36} compact />
          </div>
        )}
        {showThemeToggle && <ThemeToggle />}
      </div>
    </header>
  );
}

export function Toast() {
  const { toast, theme } = useApp();
  const tokens = themes[theme];

  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          className="toast-banner"
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          style={{
            background: tokens.text,
            color: tokens.surface,
          }}
        >
          {toast}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SensitiveBlur({ children, sensitive = false }: { children: React.ReactNode; sensitive?: boolean }) {
  const { sensitiveMode } = useApp();
  const shouldBlur = sensitiveMode && sensitive;

  return (
    <span className={shouldBlur ? 'sensitive-blur' : ''}>{children}</span>
  );
}
