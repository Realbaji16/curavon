import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useApp } from './AppContext';
import type {
  AdjustOption,
  DailyCheckIn,
  DailyStepsState,
  HealthBlockedReason,
  HealthProfile,
  NextActionState,
  SmartSilencePreference,
} from '../types/health';
import {
  createDefaultHealthProfile,
  getTodayCheckIn,
  HEALTH_STORAGE_KEYS,
  loadTodaySteps,
  normalizeCheckIn,
  safeRead,
  safeWrite,
  todayDateKey,
  clearHealthStorage,
} from '../utils/healthStorage';
import { generateNextActionFromCheckIn, ADJUSTED_ACTIONS } from '../utils/nextActionRules';
import { stepsBandToCount } from '../utils/stepsUtils';
import {
  addDoctorSummaryItem,
  clearDoctorSummaryStorage,
  loadDoctorSummaryDrafts,
  loadDoctorSummaryItems,
  loadRedFlagLogs,
} from '../utils/doctorSummaryStorage';
import {
  createCheckInSummaryItem,
  createNextActionSummaryItem,
} from '../utils/doctorSummaryItems';
import { clearAskHistory, loadAskHistory } from '../utils/askIntakeStorage';

interface HealthContextValue {
  healthProfile: HealthProfile;
  updateHealthProfile: (patch: Partial<HealthProfile>) => void;
  addListItem: (field: keyof Pick<HealthProfile, 'conditions' | 'medications' | 'allergies' | 'healthNotes' | 'doctorQuestions'>, value: string) => void;
  removeListItem: (field: keyof Pick<HealthProfile, 'conditions' | 'medications' | 'allergies' | 'healthNotes' | 'doctorQuestions'>, index: number) => void;
  dailyCheckins: DailyCheckIn[];
  todayCheckIn: DailyCheckIn | null;
  dailySteps: DailyStepsState;
  addTodaySteps: (amount: number) => void;
  setTodayStepsCount: (steps: number) => void;
  nextActionState: NextActionState | null;
  showCheckIn: boolean;
  openCheckIn: () => void;
  closeCheckIn: () => void;
  saveCheckIn: (checkIn: Omit<DailyCheckIn, 'id' | 'date' | 'createdAt'>) => void;
  markActionDone: () => void;
  markActionBlocked: (reason: HealthBlockedReason) => void;
  markActionAdjusted: (option: AdjustOption) => void;
  setNextActionFromSource: (action: string, source: string) => void;
  showHealthBlockedSheet: boolean;
  showHealthAdjustSheet: boolean;
  openHealthBlockedSheet: () => void;
  closeHealthBlockedSheet: () => void;
  openHealthAdjustSheet: () => void;
  closeHealthAdjustSheet: () => void;
  showUrgentSafety: boolean;
  openUrgentSafety: () => void;
  closeUrgentSafety: () => void;
  clearHealthData: () => void;
  exportHealthData: () => void;
  smartSilenceLabel: string;
  recentConcerns: string[];
}

const HealthContext = createContext<HealthContextValue | null>(null);

const SMART_SILENCE_LABELS: Record<SmartSilencePreference, string> = {
  'gentle-reminders': 'Gentle reminders',
  'daily-digest-only': 'Daily digest only',
  'minimal-notifications': 'Minimal notifications',
};

function persistProfile(profile: HealthProfile) {
  safeWrite(HEALTH_STORAGE_KEYS.healthProfile, profile);
}

function persistCheckins(checkins: DailyCheckIn[]) {
  safeWrite(HEALTH_STORAGE_KEYS.dailyCheckins, checkins);
}

function persistDailySteps(state: DailyStepsState) {
  safeWrite(HEALTH_STORAGE_KEYS.dailySteps, state);
}

function persistNextAction(state: NextActionState | null) {
  if (state) {
    safeWrite(HEALTH_STORAGE_KEYS.nextActionState, state);
  } else {
    localStorage.removeItem(HEALTH_STORAGE_KEYS.nextActionState);
  }
}

export function HealthProvider({ children }: { children: ReactNode }) {
  const { profileSetup, setupComplete, sensitiveMode, setSensitiveMode } = useApp();

  const [healthProfile, setHealthProfile] = useState<HealthProfile>(() =>
    safeRead(HEALTH_STORAGE_KEYS.healthProfile, createDefaultHealthProfile()),
  );
  const [dailyCheckins, setDailyCheckins] = useState<DailyCheckIn[]>(() =>
    safeRead<DailyCheckIn[]>(HEALTH_STORAGE_KEYS.dailyCheckins, []).map(normalizeCheckIn),
  );
  const [dailySteps, setDailySteps] = useState<DailyStepsState>(() => loadTodaySteps());
  const [nextActionState, setNextActionState] = useState<NextActionState | null>(() =>
    safeRead<NextActionState | null>(HEALTH_STORAGE_KEYS.nextActionState, null),
  );
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showHealthBlockedSheet, setShowHealthBlockedSheet] = useState(false);
  const [showHealthAdjustSheet, setShowHealthAdjustSheet] = useState(false);
  const [showUrgentSafety, setShowUrgentSafety] = useState(false);

  const todayCheckIn = getTodayCheckIn(dailyCheckins);

  const refreshNextActionFromToday = useCallback(
    (checkIn: DailyCheckIn, steps: number, onlyIfPending = true) => {
      setNextActionState((prev) => {
        if (onlyIfPending && prev && prev.status !== 'pending') return prev;
        const next = generateNextActionFromCheckIn(checkIn, steps);
        persistNextAction(next);
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    const today = todayDateKey();
    setDailySteps((prev) => (prev.date === today ? prev : loadTodaySteps()));
  }, []);

  const addTodaySteps = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      setDailySteps((prev) => {
        const today = todayDateKey();
        const base = prev.date === today ? prev : loadTodaySteps();
        const next: DailyStepsState = {
          ...base,
          date: today,
          steps: base.steps + amount,
          updatedAt: new Date().toISOString(),
        };
        persistDailySteps(next);
        if (todayCheckIn) {
          refreshNextActionFromToday(
            { ...todayCheckIn, steps: Math.max(todayCheckIn.steps, next.steps) },
            next.steps,
          );
        }
        return next;
      });
    },
    [todayCheckIn, refreshNextActionFromToday],
  );

  const setTodayStepsCount = useCallback(
    (steps: number) => {
      const safeSteps = Math.max(0, Math.round(steps));
      setDailySteps((prev) => {
        const today = todayDateKey();
        const base = prev.date === today ? prev : loadTodaySteps();
        const next: DailyStepsState = {
          ...base,
          date: today,
          steps: safeSteps,
          updatedAt: new Date().toISOString(),
        };
        persistDailySteps(next);
        if (todayCheckIn) {
          refreshNextActionFromToday(
            { ...todayCheckIn, steps: Math.max(todayCheckIn.steps, next.steps) },
            next.steps,
          );
        }
        return next;
      });
    },
    [todayCheckIn, refreshNextActionFromToday],
  );

  useEffect(() => {
    if (!profileSetup || !setupComplete) return;
    setHealthProfile((prev) => {
      const next: HealthProfile = {
        ...prev,
        preferredName: profileSetup.preferredName || prev.preferredName,
        primaryGoals: profileSetup.primaryGoals.length
          ? profileSetup.primaryGoals
          : prev.primaryGoals,
        smartSilencePreference: profileSetup.smartSilencePreference,
        sensitiveMode,
      };
      persistProfile(next);
      return next;
    });
  }, [profileSetup, setupComplete, sensitiveMode]);

  const updateHealthProfile = useCallback((patch: Partial<HealthProfile>) => {
    setHealthProfile((prev) => {
      const next = { ...prev, ...patch };
      persistProfile(next);
      if (patch.sensitiveMode !== undefined) {
        setSensitiveMode(patch.sensitiveMode);
      }
      return next;
    });
  }, [setSensitiveMode]);

  const addListItem = useCallback(
    (
      field: keyof Pick<
        HealthProfile,
        'conditions' | 'medications' | 'allergies' | 'healthNotes' | 'doctorQuestions'
      >,
      value: string,
    ) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      setHealthProfile((prev) => {
        const next = { ...prev, [field]: [...prev[field], trimmed] };
        persistProfile(next);
        return next;
      });
    },
    [],
  );

  const removeListItem = useCallback(
    (
      field: keyof Pick<
        HealthProfile,
        'conditions' | 'medications' | 'allergies' | 'healthNotes' | 'doctorQuestions'
      >,
      index: number,
    ) => {
      setHealthProfile((prev) => {
        const list = [...prev[field]];
        list.splice(index, 1);
        const next = { ...prev, [field]: list };
        persistProfile(next);
        return next;
      });
    },
    [],
  );

  const saveCheckIn = useCallback(
    (data: Omit<DailyCheckIn, 'id' | 'date' | 'createdAt'>) => {
      const today = todayDateKey();
      const bandCount = stepsBandToCount(data.stepsBand, dailySteps.steps);
      const resolvedSteps = Math.max(data.steps, bandCount, dailySteps.steps);

      const entry: DailyCheckIn = normalizeCheckIn({
        ...data,
        steps: resolvedSteps,
        id: `checkin-${Date.now()}`,
        date: today,
        createdAt: new Date().toISOString(),
      });

      setDailyCheckins((prev) => {
        const filtered = prev.filter((c) => c.date !== today);
        const next = [entry, ...filtered];
        persistCheckins(next);
        return next;
      });

      setDailySteps((prev) => {
        const next: DailyStepsState = {
          ...(prev.date === today ? prev : loadTodaySteps()),
          date: today,
          steps: resolvedSteps,
          updatedAt: new Date().toISOString(),
        };
        persistDailySteps(next);
        return next;
      });

      const nextAction = generateNextActionFromCheckIn(entry, resolvedSteps);
      setNextActionState(nextAction);
      persistNextAction(nextAction);
      addDoctorSummaryItem(createCheckInSummaryItem(entry));
      setShowCheckIn(false);
    },
    [dailySteps.steps],
  );

  const markActionDone = useCallback(() => {
    setNextActionState((prev) => {
      if (!prev) return prev;
      const next: NextActionState = {
        ...prev,
        status: 'done',
        updatedAt: new Date().toISOString(),
      };
      persistNextAction(next);
      addDoctorSummaryItem(createNextActionSummaryItem(next));
      return next;
    });
  }, []);

  const markActionBlocked = useCallback((reason: HealthBlockedReason) => {
    setNextActionState((prev) => {
      if (!prev) return prev;
      const next: NextActionState = {
        ...prev,
        status: 'blocked',
        blockedReason: reason,
        updatedAt: new Date().toISOString(),
      };
      persistNextAction(next);
      addDoctorSummaryItem(createNextActionSummaryItem(next, { blockedReason: reason }));
      return next;
    });
    setShowHealthBlockedSheet(false);
  }, []);

  const markActionAdjusted = useCallback((option: AdjustOption) => {
    setNextActionState((prev) => {
      if (!prev) return prev;
      const next: NextActionState = {
        ...prev,
        status: 'adjusted',
        currentAction: ADJUSTED_ACTIONS[option] ?? prev.currentAction,
        adjustNote: option,
        updatedAt: new Date().toISOString(),
      };
      persistNextAction(next);
      addDoctorSummaryItem(createNextActionSummaryItem(next, { adjustOption: option }));
      return next;
    });
    setShowHealthAdjustSheet(false);
  }, []);

  const setNextActionFromSource = useCallback((action: string, source: string) => {
    const next: NextActionState = {
      currentAction: action,
      source,
      status: 'pending',
      updatedAt: new Date().toISOString(),
    };
    setNextActionState(next);
    persistNextAction(next);
  }, []);

  const clearHealthData = useCallback(() => {
    clearHealthStorage();
    clearDoctorSummaryStorage();
    clearAskHistory();
    const fresh = createDefaultHealthProfile();
    if (profileSetup) {
      fresh.preferredName = profileSetup.preferredName;
      fresh.primaryGoals = profileSetup.primaryGoals;
      fresh.smartSilencePreference = profileSetup.smartSilencePreference;
      fresh.sensitiveMode = sensitiveMode;
      persistProfile(fresh);
    }
    setHealthProfile(fresh);
    setDailyCheckins([]);
    setDailySteps(loadTodaySteps());
    setNextActionState(null);
    persistNextAction(null);
  }, [profileSetup, sensitiveMode]);

  const exportHealthData = useCallback(() => {
    const payload = {
      healthProfile,
      dailyCheckins,
      dailySteps,
      nextActionState,
      doctorSummaryItems: loadDoctorSummaryItems(),
      doctorSummaryDrafts: loadDoctorSummaryDrafts(),
      redFlagLogs: loadRedFlagLogs(),
      askHistory: loadAskHistory(),
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `curavon-health-export-${todayDateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [healthProfile, dailyCheckins, dailySteps, nextActionState]);

  const recentConcerns = dailyCheckins
    .slice(0, 5)
    .flatMap((c) => {
      const items: string[] = [];
      if (c.symptoms.trim()) items.push(c.symptoms.trim());
      if (c.notes.trim()) items.push(c.notes.trim());
      return items;
    })
    .slice(0, 4);

  const smartSilenceLabel = SMART_SILENCE_LABELS[healthProfile.smartSilencePreference];

  return (
    <HealthContext.Provider
      value={{
        healthProfile,
        updateHealthProfile,
        addListItem,
        removeListItem,
        dailyCheckins,
        todayCheckIn,
        dailySteps,
        addTodaySteps,
        setTodayStepsCount,
        nextActionState,
        showCheckIn,
        openCheckIn: () => setShowCheckIn(true),
        closeCheckIn: () => setShowCheckIn(false),
        saveCheckIn,
        markActionDone,
        markActionBlocked,
        markActionAdjusted,
        setNextActionFromSource,
        showHealthBlockedSheet,
        showHealthAdjustSheet,
        openHealthBlockedSheet: () => setShowHealthBlockedSheet(true),
        closeHealthBlockedSheet: () => setShowHealthBlockedSheet(false),
        openHealthAdjustSheet: () => setShowHealthAdjustSheet(true),
        closeHealthAdjustSheet: () => setShowHealthAdjustSheet(false),
        showUrgentSafety,
        openUrgentSafety: () => setShowUrgentSafety(true),
        closeUrgentSafety: () => setShowUrgentSafety(false),
        clearHealthData,
        exportHealthData,
        smartSilenceLabel,
        recentConcerns,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const ctx = useContext(HealthContext);
  if (!ctx) throw new Error('useHealth must be used within HealthProvider');
  return ctx;
}
