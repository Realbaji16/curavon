import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import { themes } from './theme/themes';
import { TabBar } from './components/TabBar';
import { Toast } from './components/ScreenHeader';
import { Onboarding } from './screens/Onboarding';
import { HomeScreen } from './screens/Home';
import { AskHealthyScreen } from './screens/AskHealthy';
import { FullFlowScreen } from './screens/FullFlow';
import { CareCircleScreen } from './screens/CareCircle';
import { SettingsScreen } from './screens/Settings';
import './App.css';

function PhoneShell() {
  const { onboardingComplete, activeTab, theme, sensitiveMode } = useApp();
  const tokens = themes[theme];

  if (!onboardingComplete) {
    return (
      <motion.div
        className="phone-frame"
        exit={{ opacity: 0, x: -100 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="phone-notch" />
        <Onboarding />
      </motion.div>
    );
  }

  const screens: Record<string, React.ReactNode> = {
    home: <HomeScreen />,
    ask: <AskHealthyScreen />,
    flow: <FullFlowScreen />,
    circle: <CareCircleScreen />,
    settings: <SettingsScreen />,
  };

  return (
    <div
      className={`phone-frame ${sensitiveMode ? 'sensitive-mode-active' : ''}`}
      style={{ background: tokens.bgGradient }}
    >
      <div className="phone-notch" />
      <div className="phone-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>

      <main className="phone-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            className="screen-wrapper"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            {screens[activeTab]}
          </motion.div>
        </AnimatePresence>
      </main>

      <TabBar />
      <Toast />

      {sensitiveMode && <div className="sensitive-overlay-hint" />}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <div className="app-root">
        <div className="device-label">Healthy.Ai — Mobile Prototype</div>
        <AnimatePresence mode="wait">
          <PhoneShell key="phone" />
        </AnimatePresence>
        <div className="platform-hints">
          <span>iOS & Android layouts</span>
          <span>·</span>
          <span>390 × 844 viewport</span>
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
