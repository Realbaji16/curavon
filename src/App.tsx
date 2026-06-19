import { lazy, Suspense, useEffect } from 'react';
import { MotionConfig } from 'framer-motion';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import type { TabId } from './context/AppContext';
import { HealthProvider } from './context/HealthContext';
import { DoctorSummaryProvider } from './context/DoctorSummaryContext';
import { CuravonAuthProvider } from './lib/auth/authProvider';
import { AppAuthGate } from './components/AppAuthGate';
import { RouteLoadingFallback } from './components/RouteLoadingFallback';
import { HomeScreen } from './screens/Home';
import './App.css';

const AskCuravonScreen = lazy(() =>
  import('./screens/AskCuravon').then((module) => ({ default: module.AskCuravonScreen })),
);
const CareCircleScreen = lazy(() =>
  import('./screens/CareCircle').then((module) => ({ default: module.CareCircleScreen })),
);
const SettingsScreen = lazy(() =>
  import('./screens/Settings').then((module) => ({ default: module.SettingsScreen })),
);

const TAB_LOADING_MESSAGE: Record<TabId, string> = {
  home: 'Loading Curavon…',
  ask: 'Loading Ask…',
  circle: 'Loading Guides…',
  flow: 'Loading Guides…',
  settings: 'Loading Profile…',
};

function MainAppTabs() {
  const { activeTab, setActiveTab } = useApp();

  useEffect(() => {
    if (activeTab === 'flow') {
      setActiveTab('circle');
    }
  }, [activeTab, setActiveTab]);

  const resolvedTab = activeTab === 'flow' ? 'circle' : activeTab;
  const loadingMessage = TAB_LOADING_MESSAGE[resolvedTab] ?? 'Loading Curavon…';

  let screen = <HomeScreen />;
  if (resolvedTab === 'ask') {
    screen = <AskCuravonScreen />;
  } else if (resolvedTab === 'circle') {
    screen = <CareCircleScreen />;
  } else if (resolvedTab === 'settings') {
    screen = <SettingsScreen />;
  }

  return (
    <Suspense fallback={<RouteLoadingFallback message={loadingMessage} />}>
      {screen}
    </Suspense>
  );
}

function App() {
  return (
    <MotionConfig reducedMotion="user">
      <CuravonAuthProvider mode="local_demo">
        <AppProvider>
          <HealthProvider>
            <DoctorSummaryProvider>
              <div className="app-root">
                <div className="phone-scaler">
                  <div className="phone-device">
                    <AppAuthGate>
                      <MainAppTabs />
                    </AppAuthGate>
                  </div>
                </div>
              </div>
            </DoctorSummaryProvider>
          </HealthProvider>
        </AppProvider>
      </CuravonAuthProvider>
    </MotionConfig>
  );
}

export default App;
