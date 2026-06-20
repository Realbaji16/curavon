'use client';

import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useApp } from '../context/useApp';
import { useHealth } from '../context/useHealth';
import { useCuravonAuth } from '../lib/auth/useCuravonAuth';
import { CloudBackground } from './CloudBackground';
import { moodForTab, type CloudMood } from '../utils/cloudMood';
import { Onboarding } from '../screens/Onboarding';
import { AuthFlow } from '../screens/AuthFlow';
import { TabBar } from './TabBar';
import { LazyDoctorSummaryOverlay } from './LazyDoctorSummaryOverlay';
import { Toast } from './ScreenHeader';
import { PhoneChrome } from './PhoneChrome';
import { softPageTransition } from '../motion/variants';
import type { ThemePreset } from '../theme/themes';
import { getThemeCssVars } from '../theme/themeStyles';

function PhoneFrameShell({
  cloudMood,
  theme,
  className = '',
  withDoctorSummary = false,
  children,
}: {
  cloudMood: CloudMood;
  theme: ThemePreset;
  className?: string;
  withDoctorSummary?: boolean;
  children: ReactNode;
}) {
  const themeStyle = getThemeCssVars(theme);

  return (
    <div
      className={`phone-frame phone-frame--device phone-frame--${theme} ${className}`}
      data-theme={theme}
      style={themeStyle}
    >
      <div className="phone-bezel" aria-hidden="true" />
      <div className="phone-dynamic-island" aria-hidden="true" />
      <div className="phone-sky-layer" aria-hidden="true">
        <CloudBackground mood={cloudMood} theme={theme} />
      </div>
      <div className="phone-ui-layer">{children}</div>
      {withDoctorSummary ? <LazyDoctorSummaryOverlay /> : null}
      <PhoneChrome />
      <Toast />
      <div className="phone-home-indicator" aria-hidden="true" />
    </div>
  );
}

export function AppAuthGate({ children }: { children: ReactNode }) {
  const { onboardingComplete, setupComplete, activeTab, theme, shellHydrated } = useApp();
  const { healthProfile } = useHealth();
  const { isAuthenticated, loading: authLoading } = useCuravonAuth();
  const sensitiveMode = healthProfile.sensitiveMode;

  const cloudMood = onboardingComplete ? moodForTab(activeTab) : 'onboarding';

  if (authLoading || !shellHydrated) {
    return (
      <PhoneFrameShell cloudMood="onboarding" theme={theme}>
        <div className="auth-loading-shell" aria-busy="true" aria-label="Loading session" />
      </PhoneFrameShell>
    );
  }

  if (!onboardingComplete) {
    return (
      <PhoneFrameShell cloudMood="onboarding" theme={theme}>
        <Onboarding />
      </PhoneFrameShell>
    );
  }

  if (!isAuthenticated || !setupComplete) {
    return (
      <PhoneFrameShell cloudMood="onboarding" theme={theme}>
        <AuthFlow />
      </PhoneFrameShell>
    );
  }

  return (
    <PhoneFrameShell
      cloudMood={cloudMood}
      theme={theme}
      className={sensitiveMode ? 'sensitive-mode-active' : ''}
      withDoctorSummary
    >
      <div className="phone-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>
      <main className="phone-content">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={activeTab}
            className="screen-wrapper"
            initial={softPageTransition.initial}
            animate={softPageTransition.animate}
            exit={softPageTransition.exit}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
      <TabBar />
    </PhoneFrameShell>
  );
}
