import type { ReactNode } from 'react';
import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { TabBar } from './components/TabBar';
import { Toast } from './components/ScreenHeader';
import { CloudBackground, moodForTab } from './components/CloudBackground';
import { Onboarding } from './screens/Onboarding';
import { HomeScreen } from './screens/Home';
import { AskHealthyScreen } from './screens/AskHealthy';
import { FullFlowScreen } from './screens/FullFlow';
import { CareCircleScreen } from './screens/CareCircle';
import { SettingsScreen } from './screens/Settings';
import { softPageTransition } from './motion/variants';
import './App.css';

function PhoneShell() {
  const { onboardingComplete, activeTab, sensitiveMode, showSafetyEscalation } = useApp();

  const cloudMood = showSafetyEscalation
    ? 'safety'
    : onboardingComplete
      ? moodForTab(activeTab)
      : 'onboarding';

  if (!onboardingComplete) {
    return (
      <div className="phone-frame phone-frame--device">
        <div className="phone-bezel" aria-hidden="true" />
        <div className="phone-dynamic-island" aria-hidden="true" />
        <CloudBackground mood="onboarding" />
        <Onboarding />
        <div className="phone-home-indicator" aria-hidden="true" />
      </div>
    );
  }

  const screens: Record<string, ReactNode> = {
    home: <HomeScreen />,
    ask: <AskHealthyScreen />,
    flow: <FullFlowScreen />,
    circle: <CareCircleScreen />,
    settings: <SettingsScreen />,
  };

  return (
    <div
      className={`phone-frame phone-frame--device ${sensitiveMode ? 'sensitive-mode-active' : ''}`}
    >
      <div className="phone-bezel" aria-hidden="true" />
      <div className="phone-dynamic-island" aria-hidden="true" />
      <CloudBackground mood={cloudMood} />
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
            {screens[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>

      <TabBar />
      <Toast />
      <div className="phone-home-indicator" aria-hidden="true" />
    </div>
  );
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <div className="app-root">
          <div className="phone-scaler">
            <div className="phone-device">
              <PhoneShell />
            </div>
          </div>
        </div>
      </AppProvider>
    </MotionConfig>
  );
}

export default App;
