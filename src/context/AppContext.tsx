'use client';

import {
  createContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import type { ThemePreset } from '../theme/themes';
import type { DemoAuthUser, ProfileSetupData } from '../types/appShell';
import {
  clearAppShellState,
  getAppShellState,
  patchAppShellState,
} from '../lib/app/appShellState';
import {
  readOnboardingSeen,
  readPersistedAppShell,
  writeOnboardingSeen,
  writePersistedAppShell,
} from '../lib/app/appShellPersistence';
import { APP_SHELL_SYNC_EVENT, healthProfileFromProfileSetup } from '../lib/app/profileSetupSync';
import { saveHealthProfileRecord } from '../lib/data/coreHealthDataService';
import { trackSafeEvent } from '../lib/observability/safeAnalytics';
import { useCuravonAuth } from '../lib/auth/useCuravonAuth';

export type { DemoAuthUser, ProfileSetupData } from '../types/appShell';

export type TabId = 'home' | 'ask' | 'circle' | 'settings' | 'flow';

/** @deprecated Legacy blocker labels for unused BottomSheets.tsx compatibility. */
export type BlockedReason =
  | 'time'
  | 'forgot'
  | 'hard'
  | 'confusing'
  | 'worse'
  | 'cost'
  | 'work'
  | 'other'
  | null;

export interface OnboardingData {
  ageRange: string;
  sex: string;
  goals: string[];
  goalNotes?: string;
  sensitiveMode: boolean;
}

function normalizeProfileSetup(
  data:
    | ProfileSetupData
    | {
        preferredName: string;
        primaryGoal?: string;
        primaryGoals?: string[];
        smartSilencePreference: ProfileSetupData['smartSilencePreference'];
        sensitiveMode?: boolean;
      }
    | null,
): ProfileSetupData | null {
  if (!data) return null;
  if (Array.isArray(data.primaryGoals)) {
    return {
      preferredName: data.preferredName,
      primaryGoals: data.primaryGoals,
      smartSilencePreference: data.smartSilencePreference,
      sensitiveMode: data.sensitiveMode ?? false,
      ageRange: 'ageRange' in data ? data.ageRange : '',
      sex: 'sex' in data ? data.sex : '',
      pregnancyStatus: 'pregnancyStatus' in data ? data.pregnancyStatus : '',
      stateOrRegion: 'stateOrRegion' in data ? data.stateOrRegion : '',
      languageStyle: 'languageStyle' in data ? data.languageStyle : '',
      conditions: 'conditions' in data && data.conditions ? [...data.conditions] : [],
      allergies: 'allergies' in data && data.allergies ? [...data.allergies] : [],
      medications: 'medications' in data && data.medications ? [...data.medications] : [],
    };
  }
  const legacyGoal = 'primaryGoal' in data && typeof data.primaryGoal === 'string' ? data.primaryGoal : '';
  return {
    preferredName: data.preferredName,
    primaryGoals: legacyGoal ? [legacyGoal] : [],
    smartSilencePreference: data.smartSilencePreference,
    sensitiveMode: false,
  };
}

interface AppState {
  onboardingComplete: boolean;
  /** Legacy auth display mirror only. Canonical auth source is CuravonAuthProvider. */
  authDemoUser: DemoAuthUser | null;
  consentComplete: boolean;
  setupComplete: boolean;
  profileSetup: ProfileSetupData | null;
  theme: ThemePreset;
  activeTab: TabId;
  onboardingData: OnboardingData;
  toast: string | null;
  showDoctorSummary: boolean;
  pendingGuideFlowId: string | null;
}

interface AppContextValue extends AppState {
  /** True after in-memory shell state is hydrated on the client (avoids SSR hydration mismatch). */
  shellHydrated: boolean;
  setTheme: (t: ThemePreset) => void;
  setActiveTab: (tab: TabId) => void;
  completeOnboarding: (data: OnboardingData) => void;
  showToast: (msg: string) => void;
  dismissToast: () => void;
  openDoctorSummary: () => void;
  closeDoctorSummary: () => void;
  openGuidesWithFlow: (flowId: string) => void;
  clearPendingGuideFlow: () => void;
  /** @deprecated Use CuravonAuthProvider signUp/signIn. Mirror syncs automatically. */
  setAuthDemoUser: (user: DemoAuthUser) => void;
  completeAuthConsent: () => void;
  completeProfileSetup: (setup: ProfileSetupData & { sensitiveMode: boolean }) => void;
  /** Clears consent/setup shell state after canonical signOut. Does not write auth credentials. */
  /** Restore saved consent/setup for a returning account (e.g. right after sign-in). */
  hydrateShellForUser: (userId: string) => boolean;
  clearAuthShellState: () => void;
  /** @deprecated Use signOut() from useCuravonAuth plus clearAuthShellState(). */
  signOutDemo: () => void;
  resetToOnboarding: () => void;
  screenBackVisible: boolean;
  setScreenBack: (handler: (() => void) | null, visible?: boolean) => void;
  triggerScreenBack: () => void;
}

const defaultOnboarding: OnboardingData = {
  ageRange: '25-34',
  sex: 'Prefer not to say',
  goals: [],
  sensitiveMode: false,
};

function createShellStateFromStore(overrides: Partial<AppState> = {}): AppState {
  const shell = getAppShellState();
  return {
    onboardingComplete: shell.onboardingSeen,
    authDemoUser: shell.authDemoUser,
    consentComplete: shell.consentComplete,
    setupComplete: shell.setupComplete,
    profileSetup: normalizeProfileSetup(shell.profileSetup),
    theme: 'sky',
    activeTab: 'home',
    onboardingData: defaultOnboarding,
    toast: null,
    showDoctorSummary: false,
    pendingGuideFlowId: null,
    ...overrides,
  };
}

function createShellState(overrides: Partial<AppState> = {}): AppState {
  return {
    onboardingComplete: false,
    authDemoUser: null,
    consentComplete: false,
    setupComplete: false,
    profileSetup: null,
    theme: 'sky',
    activeTab: 'home',
    onboardingData: defaultOnboarding,
    toast: null,
    showDoctorSummary: false,
    pendingGuideFlowId: null,
    ...overrides,
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export { AppContext };

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useCuravonAuth();
  const userIdRef = useRef<string | null>(null);
  userIdRef.current = user?.id ?? null;
  const [shellHydrated, setShellHydrated] = useState(false);
  const screenBackHandlerRef = useRef<(() => void) | null>(null);
  const [screenBackVisible, setScreenBackVisible] = useState(false);

  const [state, setState] = useState<AppState>(() => createShellState());

  const syncReactStateFromShellStore = useCallback(() => {
    const shell = getAppShellState();
    setState((s) => ({
      ...s,
      onboardingComplete: shell.onboardingSeen,
      consentComplete: shell.consentComplete,
      setupComplete: shell.setupComplete,
      profileSetup: normalizeProfileSetup(shell.profileSetup),
    }));
  }, []);

  const persistShellForCurrentUser = useCallback(() => {
    const userId = userIdRef.current;
    if (!userId) return;
    const shell = getAppShellState();
    writePersistedAppShell(userId, {
      onboardingSeen: shell.onboardingSeen,
      consentComplete: shell.consentComplete,
      setupComplete: shell.setupComplete,
      profileSetup: shell.profileSetup,
    });
  }, []);

  const hydrateShellForUser = useCallback(
    (userId: string): boolean => {
      const persisted = readPersistedAppShell(userId);
      if (persisted) {
        patchAppShellState({
          onboardingSeen: persisted.onboardingSeen || readOnboardingSeen(),
          consentComplete: persisted.consentComplete,
          setupComplete: persisted.setupComplete,
          profileSetup: persisted.profileSetup,
        });
        syncReactStateFromShellStore();
      }
      return getAppShellState().setupComplete;
    },
    [syncReactStateFromShellStore],
  );

  useEffect(() => {
    const onboardingSeen = readOnboardingSeen();
    if (onboardingSeen) {
      patchAppShellState({ onboardingSeen: true });
    }
    // Client-only in-memory shell hydration; cannot run during SSR render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(createShellStateFromStore({ onboardingComplete: onboardingSeen || getAppShellState().onboardingSeen }));
    setShellHydrated(true);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    hydrateShellForUser(user.id);
  }, [user?.id, hydrateShellForUser]);

  useEffect(() => {
    const onShellSync = () => syncReactStateFromShellStore();
    window.addEventListener(APP_SHELL_SYNC_EVENT, onShellSync);
    return () => window.removeEventListener(APP_SHELL_SYNC_EVENT, onShellSync);
  }, [syncReactStateFromShellStore]);

  const authDemoUser =
    !authLoading && user ? { fullName: user.displayName, email: user.email } : null;

  const setScreenBack = useCallback((handler: (() => void) | null, visible = true) => {
    const active = Boolean(visible && handler);
    screenBackHandlerRef.current = active ? handler : null;
    setScreenBackVisible(active);
  }, []);

  const triggerScreenBack = useCallback(() => {
    if (screenBackHandlerRef.current) {
      screenBackHandlerRef.current();
      return;
    }
    setState((s) => (s.activeTab === 'home' ? s : { ...s, activeTab: 'home' }));
  }, []);

  const setTheme = useCallback((theme: ThemePreset) => {
    setState((s) => ({ ...s, theme }));
  }, []);

  const setActiveTab = useCallback((activeTab: TabId) => {
    const normalizedTab = activeTab === 'flow' ? 'circle' : activeTab;
    setState((s) => ({ ...s, activeTab: normalizedTab }));
  }, []);

  const completeOnboarding = useCallback((data: OnboardingData) => {
    writeOnboardingSeen();
    patchAppShellState({ onboardingSeen: true });
    setState((s) => ({
      ...s,
      onboardingComplete: true,
      onboardingData: data,
    }));
    persistShellForCurrentUser();
  }, [persistShellForCurrentUser]);

  const setAuthDemoUser = useCallback((user: DemoAuthUser) => {
    // Legacy auth display mirror only. Canonical auth source is CuravonAuthProvider.
    void user;
  }, []);

  const clearAuthShellState = useCallback(() => {
    clearAppShellState();
    setState((s) => ({
      ...s,
      authDemoUser: null,
      consentComplete: false,
      setupComplete: false,
      profileSetup: null,
      activeTab: 'home',
      showDoctorSummary: false,
      toast: null,
    }));
  }, []);

  const signOutDemo = clearAuthShellState;

  const completeAuthConsent = useCallback(() => {
    patchAppShellState({ consentComplete: true });
    setState((s) => ({ ...s, consentComplete: true }));
    persistShellForCurrentUser();
  }, [persistShellForCurrentUser]);

  const completeProfileSetup = useCallback(
    (setup: ProfileSetupData & { sensitiveMode: boolean }) => {
      const persistedProfile: ProfileSetupData = {
        preferredName: setup.preferredName,
        primaryGoals: setup.primaryGoals,
        smartSilencePreference: setup.smartSilencePreference,
        sensitiveMode: setup.sensitiveMode,
        ageRange: setup.ageRange,
        sex: setup.sex,
        pregnancyStatus: setup.pregnancyStatus,
        stateOrRegion: setup.stateOrRegion,
        languageStyle: setup.languageStyle,
        conditions: setup.conditions,
        allergies: setup.allergies,
        medications: setup.medications,
      };
      patchAppShellState({
        profileSetup: persistedProfile,
        setupComplete: true,
        consentComplete: true,
      });
      void saveHealthProfileRecord(healthProfileFromProfileSetup(setup));
      setState((s) => ({
        ...s,
        setupComplete: true,
        consentComplete: true,
        profileSetup: persistedProfile,
      }));
      persistShellForCurrentUser();
      trackSafeEvent('profile_completed', {
        status: 'completed',
        privacy_level: setup.sensitiveMode ? 'sensitive' : 'private',
      });
      if (setup.sensitiveMode) {
        trackSafeEvent('sensitive_mode_enabled', {
          privacy_level: 'sensitive',
          status: 'enabled',
        });
      }
    },
    [persistShellForCurrentUser],
  );

  const resetToOnboarding = useCallback(() => {
    clearAppShellState();
    patchAppShellState({ onboardingSeen: false });
    screenBackHandlerRef.current = null;
    setScreenBackVisible(false);
    setState(createShellState());
  }, []);

  const showToast = useCallback((msg: string) => {
    setState((s) => ({ ...s, toast: msg }));
    setTimeout(() => {
      setState((s) => (s.toast === msg ? { ...s, toast: null } : s));
    }, 2500);
  }, []);

  const openDoctorSummary = useCallback(() => {
    setState((s) => ({ ...s, showDoctorSummary: true }));
  }, []);

  const closeDoctorSummary = useCallback(() => {
    setState((s) => ({ ...s, showDoctorSummary: false }));
  }, []);

  const openGuidesWithFlow = useCallback((flowId: string) => {
    setState((s) => ({ ...s, pendingGuideFlowId: flowId, activeTab: 'circle' }));
  }, []);

  const clearPendingGuideFlow = useCallback(() => {
    setState((s) => ({ ...s, pendingGuideFlowId: null }));
  }, []);

  return (
    <AppContext.Provider
      value={{
        ...state,
        shellHydrated,
        authDemoUser,
        setTheme,
        setActiveTab,
        completeOnboarding,
        showToast,
        dismissToast: () => setState((s) => ({ ...s, toast: null })),
        openDoctorSummary,
        closeDoctorSummary,
        openGuidesWithFlow,
        clearPendingGuideFlow,
        setAuthDemoUser,
        completeAuthConsent,
        completeProfileSetup,
        hydrateShellForUser,
        clearAuthShellState,
        signOutDemo,
        resetToOnboarding,
        screenBackVisible,
        setScreenBack,
        triggerScreenBack,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
