import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { ThemePreset } from '../theme/themes';

export type TabId = 'home' | 'ask' | 'flow' | 'circle' | 'settings';

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface DemoAuthUser {
  fullName: string;
  email: string;
}

export interface ProfileSetupData {
  preferredName: string;
  primaryGoals: string[];
  smartSilencePreference: 'gentle-reminders' | 'daily-digest-only' | 'minimal-notifications';
}

function normalizeProfileSetup(
  data: ProfileSetupData | { preferredName: string; primaryGoal?: string; primaryGoals?: string[]; smartSilencePreference: ProfileSetupData['smartSilencePreference'] } | null,
): ProfileSetupData | null {
  if (!data) return null;
  if (Array.isArray(data.primaryGoals)) {
    return {
      preferredName: data.preferredName,
      primaryGoals: data.primaryGoals,
      smartSilencePreference: data.smartSilencePreference,
    };
  }
  const legacyGoal = 'primaryGoal' in data && typeof data.primaryGoal === 'string' ? data.primaryGoal : '';
  return {
    preferredName: data.preferredName,
    primaryGoals: legacyGoal ? [legacyGoal] : [],
    smartSilencePreference: data.smartSilencePreference,
  };
}

interface AppState {
  onboardingComplete: boolean;
  authDemoUser: DemoAuthUser | null;
  consentComplete: boolean;
  setupComplete: boolean;
  profileSetup: ProfileSetupData | null;
  theme: ThemePreset;
  activeTab: TabId;
  sensitiveMode: boolean;
  onboardingData: OnboardingData;
  actionDone: boolean;
  actionAdjusted: boolean;
  blockedReason: BlockedReason;
  showBlockedSheet: boolean;
  showSafetyEscalation: boolean;
  chatMessages: ChatMessage[];
  chatStep: number;
  toast: string | null;
  showShareSheet: boolean;
  flowView: 'timeline' | 'daily';
  smartSilence: {
    criticalOnly: boolean;
    dailyDigest: boolean;
    goalCoaching: boolean;
  };
  streak: number;
  healthPoints: number;
  whyExpanded: boolean;
  showDoctorSummary: boolean;
  pendingGuideFlowId: string | null;
}

interface AppContextValue extends AppState {
  setTheme: (t: ThemePreset) => void;
  setActiveTab: (tab: TabId) => void;
  completeOnboarding: (data: OnboardingData) => void;
  setSensitiveMode: (v: boolean) => void;
  markActionDone: () => void;
  adjustAction: () => void;
  openBlockedSheet: () => void;
  closeBlockedSheet: () => void;
  selectBlockedReason: (reason: BlockedReason) => void;
  addChatMessage: (text: string) => void;
  resetChat: () => void;
  showToast: (msg: string) => void;
  dismissToast: () => void;
  openShareSheet: () => void;
  closeShareSheet: () => void;
  setFlowView: (v: 'timeline' | 'daily') => void;
  toggleSmartSilence: (key: keyof AppState['smartSilence']) => void;
  toggleWhyExpanded: () => void;
  clearAllData: () => void;
  sendNudge: (memberId: string) => void;
  openDoctorSummary: () => void;
  closeDoctorSummary: () => void;
  openGuidesWithFlow: (flowId: string) => void;
  clearPendingGuideFlow: () => void;
  setAuthDemoUser: (user: DemoAuthUser) => void;
  completeAuthConsent: () => void;
  completeProfileSetup: (setup: ProfileSetupData & { sensitiveMode: boolean }) => void;
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

const STORAGE_KEYS = {
  onboardingSeen: 'curavon_onboarding_seen',
  authDemoUser: 'curavon_auth_demo_user',
  consentComplete: 'curavon_consent_complete',
  setupComplete: 'curavon_setup_complete',
  profileSetup: 'curavon_profile_setup',
} as const;

function safeRead<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(value));
}

function safeRemove(key: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}

function clearSessionForOnboarding() {
  safeRemove(STORAGE_KEYS.onboardingSeen);
  safeRemove(STORAGE_KEYS.authDemoUser);
  safeRemove(STORAGE_KEYS.consentComplete);
  safeRemove(STORAGE_KEYS.setupComplete);
  safeRemove(STORAGE_KEYS.profileSetup);
}

const AppContext = createContext<AppContextValue | null>(null);

const HIGH_RISK_KEYWORDS = [
  'severe pain',
  'chest pressure',
  'chest pain',
  'can\'t breathe',
  'difficulty breathing',
];

const CHAT_FLOWS: Record<number, { trigger?: string; response: string }[]> = {
  0: [
    { response: 'Thanks for sharing that. When did you first notice this change?' },
  ],
  1: [
    { response: 'Got it. Have you started any new skincare products, medications, or changed your diet recently?' },
  ],
  2: [
    { response: 'One more thing — is there any itching, burning, or pain associated with the breakouts?' },
  ],
};

export function AppProvider({ children }: { children: ReactNode }) {
  const onboardingSeen = safeRead<boolean>(STORAGE_KEYS.onboardingSeen, false);
  const authDemoUser = safeRead<DemoAuthUser | null>(STORAGE_KEYS.authDemoUser, null);
  const consentComplete = safeRead<boolean>(STORAGE_KEYS.consentComplete, false);
  const setupComplete = safeRead<boolean>(STORAGE_KEYS.setupComplete, false);
  const profileSetup = normalizeProfileSetup(
    safeRead<ProfileSetupData | null>(STORAGE_KEYS.profileSetup, null),
  );
  const screenBackHandlerRef = useRef<(() => void) | null>(null);
  const [screenBackVisible, setScreenBackVisible] = useState(false);

  const [state, setState] = useState<AppState>({
    onboardingComplete: onboardingSeen,
    authDemoUser,
    consentComplete,
    setupComplete,
    profileSetup,
    theme: 'sky',
    activeTab: 'home',
    sensitiveMode: false,
    onboardingData: defaultOnboarding,
    actionDone: false,
    actionAdjusted: false,
    blockedReason: null,
    showBlockedSheet: false,
    showSafetyEscalation: false,
    chatMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        text: 'Hi — I\'m here to help you organize what\'s going on and find one safe next step. I don\'t diagnose or prescribe. What would you like to focus on today?',
      },
    ],
    chatStep: 0,
    toast: null,
    showShareSheet: false,
    flowView: 'timeline',
    smartSilence: {
      criticalOnly: false,
      dailyDigest: true,
      goalCoaching: true,
    },
    streak: 5,
    healthPoints: 340,
    whyExpanded: false,
    showDoctorSummary: false,
    pendingGuideFlowId: null,
  });

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
    setState((s) => ({ ...s, activeTab }));
  }, []);

  const completeOnboarding = useCallback((data: OnboardingData) => {
    safeWrite(STORAGE_KEYS.onboardingSeen, true);
    setState((s) => ({
      ...s,
      onboardingComplete: true,
      onboardingData: data,
      sensitiveMode: data.sensitiveMode,
    }));
  }, []);

  const setAuthDemoUser = useCallback((user: DemoAuthUser) => {
    safeWrite(STORAGE_KEYS.authDemoUser, user);
    setState((s) => ({ ...s, authDemoUser: user }));
  }, []);

  const completeAuthConsent = useCallback(() => {
    safeWrite(STORAGE_KEYS.consentComplete, true);
    setState((s) => ({ ...s, consentComplete: true }));
  }, []);

  const completeProfileSetup = useCallback(
    (setup: ProfileSetupData & { sensitiveMode: boolean }) => {
      const nextSmartSilence =
        setup.smartSilencePreference === 'daily-digest-only'
          ? { criticalOnly: false, dailyDigest: true, goalCoaching: false }
          : setup.smartSilencePreference === 'minimal-notifications'
            ? { criticalOnly: true, dailyDigest: false, goalCoaching: false }
            : { criticalOnly: false, dailyDigest: true, goalCoaching: true };
      const persistedProfile: ProfileSetupData = {
        preferredName: setup.preferredName,
        primaryGoals: setup.primaryGoals,
        smartSilencePreference: setup.smartSilencePreference,
      };
      safeWrite(STORAGE_KEYS.profileSetup, persistedProfile);
      safeWrite(STORAGE_KEYS.setupComplete, true);
      setState((s) => ({
        ...s,
        setupComplete: true,
        profileSetup: persistedProfile,
        sensitiveMode: setup.sensitiveMode,
        smartSilence: nextSmartSilence,
      }));
    },
    [],
  );

  const signOutDemo = useCallback(() => {
    safeRemove(STORAGE_KEYS.authDemoUser);
    safeRemove(STORAGE_KEYS.consentComplete);
    safeRemove(STORAGE_KEYS.setupComplete);
    safeRemove(STORAGE_KEYS.profileSetup);
    setState((s) => ({
      ...s,
      authDemoUser: null,
      consentComplete: false,
      setupComplete: false,
      profileSetup: null,
      activeTab: 'home',
      showDoctorSummary: false,
      showShareSheet: false,
      toast: null,
    }));
  }, []);

  const resetToOnboarding = useCallback(() => {
    clearSessionForOnboarding();
    screenBackHandlerRef.current = null;
    setScreenBackVisible(false);
    setState({
      onboardingComplete: false,
      authDemoUser: null,
      consentComplete: false,
      setupComplete: false,
      profileSetup: null,
      theme: 'sky',
      activeTab: 'home',
      sensitiveMode: false,
      onboardingData: defaultOnboarding,
      actionDone: false,
      actionAdjusted: false,
      blockedReason: null,
      showBlockedSheet: false,
      showSafetyEscalation: false,
      chatMessages: [
        {
          id: 'welcome',
          role: 'assistant',
          text: 'Hi — I\'m here to help you organize what\'s going on and find one safe next step. I don\'t diagnose or prescribe. What would you like to focus on today?',
        },
      ],
      chatStep: 0,
      toast: null,
      showShareSheet: false,
      flowView: 'timeline',
      smartSilence: {
        criticalOnly: false,
        dailyDigest: true,
        goalCoaching: true,
      },
      streak: 5,
      healthPoints: 340,
      whyExpanded: false,
      showDoctorSummary: false,
      pendingGuideFlowId: null,
    });
  }, []);

  const setSensitiveMode = useCallback((sensitiveMode: boolean) => {
    setState((s) => ({ ...s, sensitiveMode }));
  }, []);

  const markActionDone = useCallback(() => {
    setState((s) => ({
      ...s,
      actionDone: true,
      streak: s.streak + 1,
      healthPoints: s.healthPoints + 25,
    }));
  }, []);

  const adjustAction = useCallback(() => {
    setState((s) => ({ ...s, actionAdjusted: !s.actionAdjusted }));
  }, []);

  const openBlockedSheet = useCallback(() => {
    setState((s) => ({ ...s, showBlockedSheet: true }));
  }, []);

  const closeBlockedSheet = useCallback(() => {
    setState((s) => ({ ...s, showBlockedSheet: false }));
  }, []);

  const selectBlockedReason = useCallback((reason: BlockedReason) => {
    setState((s) => ({
      ...s,
      blockedReason: reason,
      showBlockedSheet: false,
      actionAdjusted: true,
    }));
  }, []);

  const addChatMessage = useCallback((text: string) => {
    setState((s) => {
      const lower = text.toLowerCase();
      const isHighRisk = HIGH_RISK_KEYWORDS.some((k) => lower.includes(k));

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        text,
      };

      if (isHighRisk) {
        return {
          ...s,
          chatMessages: [...s.chatMessages, userMsg],
          showSafetyEscalation: true,
        };
      }

      const flow = CHAT_FLOWS[s.chatStep];
      const newMessages = [...s.chatMessages, userMsg];

      if (flow) {
        flow.forEach((step, i) => {
          newMessages.push({
            id: `assistant-${Date.now()}-${i}`,
            role: 'assistant',
            text: step.response,
          });
        });
      }

      return {
        ...s,
        chatMessages: newMessages,
        chatStep: s.chatStep + 1,
      };
    });
  }, []);

  const resetChat = useCallback(() => {
    setState((s) => ({
      ...s,
      chatMessages: [
        {
          id: 'welcome',
          role: 'assistant',
          text: 'Hi there! I\'m Curavon — your action companion. Tell me what\'s going on and I\'ll help you figure out a gentle next step.',
        },
      ],
      chatStep: 0,
      showSafetyEscalation: false,
    }));
  }, []);

  const showToast = useCallback((msg: string) => {
    setState((s) => ({ ...s, toast: msg }));
    setTimeout(() => {
      setState((s) => (s.toast === msg ? { ...s, toast: null } : s));
    }, 2500);
  }, []);

  const openShareSheet = useCallback(() => {
    setState((s) => ({ ...s, showShareSheet: true }));
  }, []);

  const closeShareSheet = useCallback(() => {
    setState((s) => ({ ...s, showShareSheet: false }));
  }, []);

  const setFlowView = useCallback((flowView: 'timeline' | 'daily') => {
    setState((s) => ({ ...s, flowView }));
  }, []);

  const toggleSmartSilence = useCallback((key: keyof AppState['smartSilence']) => {
    setState((s) => ({
      ...s,
      smartSilence: { ...s.smartSilence, [key]: !s.smartSilence[key] },
    }));
  }, []);

  const toggleWhyExpanded = useCallback(() => {
    setState((s) => ({ ...s, whyExpanded: !s.whyExpanded }));
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

  const clearAllData = useCallback(() => {
    safeRemove(STORAGE_KEYS.onboardingSeen);
    safeRemove(STORAGE_KEYS.authDemoUser);
    safeRemove(STORAGE_KEYS.consentComplete);
    safeRemove(STORAGE_KEYS.setupComplete);
    safeRemove(STORAGE_KEYS.profileSetup);
    setState({
      onboardingComplete: false,
      authDemoUser: null,
      consentComplete: false,
      setupComplete: false,
      profileSetup: null,
      theme: 'sky',
      activeTab: 'home',
      sensitiveMode: false,
      onboardingData: defaultOnboarding,
      actionDone: false,
      actionAdjusted: false,
      blockedReason: null,
      showBlockedSheet: false,
      showSafetyEscalation: false,
      chatMessages: [
        {
          id: 'welcome',
          role: 'assistant',
          text: 'Hi — I\'m here to help you organize what\'s going on and find one safe next step.',
        },
      ],
      chatStep: 0,
      toast: null,
      showShareSheet: false,
      flowView: 'timeline',
      smartSilence: {
        criticalOnly: false,
        dailyDigest: true,
        goalCoaching: true,
      },
      streak: 0,
      healthPoints: 0,
      whyExpanded: false,
      showDoctorSummary: false,
      pendingGuideFlowId: null,
    });
  }, []);

  const sendNudge = useCallback(
    (_memberId: string) => {
      showToast('Nudge Sent!');
    },
    [showToast],
  );

  return (
    <AppContext.Provider
      value={{
        ...state,
        setTheme,
        setActiveTab,
        completeOnboarding,
        setSensitiveMode,
        markActionDone,
        adjustAction,
        openBlockedSheet,
        closeBlockedSheet,
        selectBlockedReason,
        addChatMessage,
        resetChat,
        showToast,
        dismissToast: () => setState((s) => ({ ...s, toast: null })),
        openShareSheet,
        closeShareSheet,
        setFlowView,
        toggleSmartSilence,
        toggleWhyExpanded,
        clearAllData,
        sendNudge,
        openDoctorSummary,
        closeDoctorSummary,
        openGuidesWithFlow,
        clearPendingGuideFlow,
        setAuthDemoUser,
        completeAuthConsent,
        completeProfileSetup,
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

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
