import type { ReactNode } from 'react';

import { AnimatePresence, motion, MotionConfig } from 'framer-motion';

import { AppProvider, useApp } from './context/AppContext';

import { TabBar } from './components/TabBar';

import { Toast } from './components/ScreenHeader';

import { CloudBackground, moodForTab, type CloudMood } from './components/CloudBackground';

import { Onboarding } from './screens/Onboarding';

import { HomeScreen } from './screens/Home';

import { AskCuravonScreen } from './screens/AskCuravon';

import { FullFlowScreen } from './screens/FullFlow';

import { CareCircleScreen } from './screens/CareCircle';

import { SettingsScreen } from './screens/Settings';
import { AuthFlow } from './screens/AuthFlow';

import { softPageTransition } from './motion/variants';

import type { ThemePreset } from './theme/themes';

import { getThemeCssVars } from './theme/themeStyles';

import './App.css';



function PhoneFrameShell({

  cloudMood,

  theme,

  className = '',

  children,

}: {

  cloudMood: CloudMood;

  theme: ThemePreset;

  className?: string;

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



      <div className="phone-home-indicator" aria-hidden="true" />

    </div>

  );

}



function PhoneShell() {

  const {
    onboardingComplete,
    authDemoUser,
    setupComplete,
    activeTab,
    sensitiveMode,
    showSafetyEscalation,
    theme,
  } = useApp();



  const cloudMood = showSafetyEscalation

    ? 'safety'

    : onboardingComplete

      ? moodForTab(activeTab)

      : 'onboarding';



  if (!onboardingComplete) {

    return (

      <PhoneFrameShell cloudMood="onboarding" theme={theme}>

        <Onboarding />

      </PhoneFrameShell>

    );

  }

  if (!authDemoUser || !setupComplete) {
    return (
      <PhoneFrameShell cloudMood="onboarding" theme={theme}>
        <AuthFlow />
      </PhoneFrameShell>
    );
  }



  const screens: Record<string, ReactNode> = {

    home: <HomeScreen />,

    ask: <AskCuravonScreen />,

    flow: <FullFlowScreen />,

    circle: <CareCircleScreen />,

    settings: <SettingsScreen />,

  };



  return (

    <PhoneFrameShell

      cloudMood={cloudMood}

      theme={theme}

      className={sensitiveMode ? 'sensitive-mode-active' : ''}

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

            {screens[activeTab]}

          </motion.div>

        </AnimatePresence>

      </main>



      <TabBar />

      <Toast />

    </PhoneFrameShell>

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

