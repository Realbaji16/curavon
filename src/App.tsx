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
      <div className="phone-frame phone-frame--device">
        <div className="phone-bezel" aria-hidden="true" />
        <div className="phone-dynamic-island" aria-hidden="true" />
        <Onboarding />
        <div className="phone-home-indicator" aria-hidden="true" />
      </div>
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
      className={`phone-frame phone-frame--device ${sensitiveMode ? 'sensitive-mode-active' : ''}`}
      style={{ background: tokens.bgGradient }}
    >
      <div className="phone-bezel" aria-hidden="true" />
      <div className="phone-dynamic-island" aria-hidden="true" />
      <div className="phone-status-bar">
        <span className="status-time">9:41</span>
        <div className="status-icons">
          <span>●●●</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>

      <main className="phone-content">
        <div key={activeTab} className="screen-wrapper">
          {screens[activeTab]}
        </div>
      </main>

      <TabBar />
      <Toast />
      <div className="phone-home-indicator" aria-hidden="true" />
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <div className="app-root">
        <div className="device-label">iPhone 17 · Healthy.Ai Prototype</div>
        <div className="phone-scaler">
          <div className="phone-device">
            <PhoneShell />
          </div>
        </div>
        <div className="platform-hints">
          <span>402 × 874 pt viewport</span>
          <span>·</span>
          <span>1206 × 2622 @3x</span>
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
