import { ChevronLeft, RotateCcw } from 'lucide-react';
import { useApp } from '../context/useApp';
import { useCuravonAuth } from '../lib/auth/useCuravonAuth';

export function PhoneChrome() {
  const {
    screenBackVisible,
    triggerScreenBack,
    resetToOnboarding,
    showToast,
    activeTab,
    onboardingComplete,
    setupComplete,
    showDoctorSummary,
    shellHydrated,
  } = useApp();
  const { isAuthenticated, loading: authLoading } = useCuravonAuth();

  const chromeReady = shellHydrated && !authLoading;
  const inMainApp = onboardingComplete && isAuthenticated && setupComplete;
  const showBack =
    chromeReady &&
    !showDoctorSummary &&
    (screenBackVisible ||
      (inMainApp && activeTab !== 'home') ||
      (onboardingComplete && (!isAuthenticated || !setupComplete)));
  const showStartOver = chromeReady && inMainApp;

  return (
    <div className="phone-chrome" aria-hidden={!showBack && !showStartOver}>
      {showBack ? (
        <button
          type="button"
          className="phone-chrome__btn screen-back-btn"
          onClick={triggerScreenBack}
          aria-label="Go back"
          title="Back"
        >
          <ChevronLeft size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      ) : null}

      {showStartOver ? (
        <button
          type="button"
          className="phone-chrome__btn back-to-start-btn"
          onClick={() => {
            resetToOnboarding();
            showToast('Demo shell reset. Health notes kept on this device.');
          }}
          aria-label="Reset demo shell"
          title="Reset demo shell"
        >
          <RotateCcw size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>Reset demo shell</span>
        </button>
      ) : null}
    </div>
  );
}
