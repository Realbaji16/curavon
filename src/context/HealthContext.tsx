import {
  createContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type {
  AdjustOption,
  DailyCheckIn,
  DailyStepsState,
  HealthBlockedReason,
  HealthProfile,
  NextActionState,
  SmartSilencePreference,
} from '../types/health';
import type { HealthSnapshot } from '../types/healthSnapshot';
import type { FollowUpOutcome, FollowUpRecord } from '../lib/followUp/followUpTypes';
import {
  createDefaultHealthProfile,
  getTodayCheckIn,
  HEALTH_STORAGE_KEYS,
  loadTodaySteps,
  normalizeCheckIn,
  safeRead,
  safeRemove,
  safeWrite,
  todayDateKey,
} from '../utils/healthStorage';
import { ADJUSTED_ACTIONS } from '../utils/nextActionRules';
import { stepsBandToCount } from '../utils/stepsUtils';
import {
  addDoctorSummaryItem,
  loadRedFlagLogs,
} from '../utils/doctorSummaryStorage';
import {
  createCheckInSummaryItem,
  createNextActionSummaryItem,
} from '../utils/doctorSummaryItems';
import { loadAskHistory } from '../utils/askIntakeStorage';
import {
  adjustedOptionLabel,
  blockedReasonLabel,
} from '../utils/nextBestActionEngine';
import { loadHealthSnapshot, refreshHealthSnapshot as recomputeHealthSnapshot, buildHealthSnapshot } from '../utils/healthSnapshot';
import {
  generateCuravonNextAction,
  toNextActionStateFromAdapter,
  type NextActionSource,
} from '../lib/plan/nextActionAdapter';
import {
  shouldRegenerateNextAction,
  type ApplyNextActionResult,
  type NextActionRegenerationTrigger,
} from '../lib/plan/nextActionRegenerationPolicy';
import {
  getFollowUps,
  markFollowUpCompleted,
  updateFollowUp,
} from '../lib/followUp/followUpStorage';
import { scheduleFollowUpForAction } from '../lib/followUp/followUpScheduler';
import { evaluateFollowUp } from '../lib/followUp/followUpEngine';
import { APP_STORAGE_KEYS } from '../lib/data/storageKeys';
import { exportCuravonData } from '../lib/data/dataExport';
import { deleteAllHealthData } from '../lib/data/dataDeletion';
import { queueSyncForCurrentUser } from '../lib/sync/syncQueue';
import { collectActionOutcome, runMetaSystemCycle } from '../utils/metaSystem';

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
  healthSnapshot: HealthSnapshot;
  showCheckIn: boolean;
  openCheckIn: () => void;
  closeCheckIn: () => void;
  saveCheckIn: (checkIn: Omit<DailyCheckIn, 'id' | 'date' | 'createdAt'>) => void;
  markActionDone: () => void;
  markActionBlocked: (reason: HealthBlockedReason) => void;
  markActionAdjusted: (option: AdjustOption) => void;
  setNextActionFromSource: (action: string, source: string) => void;
  saveCurrentActionToSummary: () => void;
  refreshPersonalizedAction: () => void;
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
  refreshHealthSnapshot: () => void;
  dueFollowUp: FollowUpRecord | null;
  submitFollowUpOutcome: (outcome: FollowUpOutcome, note?: string) => void;
}

const HealthContext = createContext<HealthContextValue | null>(null);

export { HealthContext };

const SMART_SILENCE_LABELS: Record<SmartSilencePreference, string> = {
  'gentle-reminders': 'Gentle reminders',
  'daily-digest-only': 'Daily digest only',
  'minimal-notifications': 'Minimal notifications',
};

function persistProfile(profile: HealthProfile) {
  safeWrite(HEALTH_STORAGE_KEYS.healthProfile, profile);
  queueSyncForCurrentUser({
    entityType: 'health_profile',
    operationType: 'update',
    payload: {
      updatedAt: new Date().toISOString(),
      primaryGoalCount: profile.primaryGoals.length,
      sensitiveMode: profile.sensitiveMode,
    },
  });
}

function persistCheckins(checkins: DailyCheckIn[]) {
  safeWrite(HEALTH_STORAGE_KEYS.dailyCheckins, checkins);
  queueSyncForCurrentUser({
    entityType: 'daily_checkins',
    operationType: 'update',
    payload: {
      count: checkins.length,
      latestId: checkins[0]?.id ?? null,
      updatedAt: new Date().toISOString(),
    },
  });
}

function persistDailySteps(state: DailyStepsState) {
  safeWrite(HEALTH_STORAGE_KEYS.dailySteps, state);
}

function persistNextAction(state: NextActionState | null) {
  if (state) {
    safeWrite(HEALTH_STORAGE_KEYS.nextActionState, state);
    queueSyncForCurrentUser({
      entityType: 'next_action_state',
      operationType: 'update',
      payload: {
        actionId: state.actionId,
        status: state.status,
        updatedAt: state.updatedAt ?? new Date().toISOString(),
      },
    });
  } else {
    safeRemove(HEALTH_STORAGE_KEYS.nextActionState);
    queueSyncForCurrentUser({
      entityType: 'next_action_state',
      operationType: 'delete',
      payload: {
        updatedAt: new Date().toISOString(),
      },
    });
  }
}

function normalizeNextActionState(state: NextActionState | null): NextActionState | null {
  if (!state) return null;
  return {
    ...state,
    title: state.title ?? "Today's next best action",
    reason:
      state.reason ??
      'Based on your latest check-in and notes.',
    sourceSignals: state.sourceSignals ?? [],
    sourceChips: state.sourceChips ?? [state.source as string],
    safetyLevel: state.safetyLevel ?? 'normal',
  };
}

function isSamePendingNextAction(prev: NextActionState, next: NextActionState): boolean {
  return (
    prev.status === next.status &&
    prev.actionId === next.actionId &&
    prev.currentAction === next.currentAction &&
    prev.title === next.title &&
    prev.category === next.category &&
    prev.safetyLevel === next.safetyLevel
  );
}

type ApplyNextActionFromPlanParams = {
  source: NextActionSource;
  trigger?: NextActionRegenerationTrigger;
  concern?: string;
  latestCheckIn?: DailyCheckIn | null;
  followUpResult?: { outcome: FollowUpOutcome; note?: string };
  onlyIfPending?: boolean;
  force?: boolean;
  scheduleFollowUp?: boolean;
};

export function HealthProvider({ children }: { children: ReactNode }) {
  const [healthProfile, setHealthProfile] = useState<HealthProfile>(() =>
    safeRead(HEALTH_STORAGE_KEYS.healthProfile, createDefaultHealthProfile()),
  );
  const [dailyCheckins, setDailyCheckins] = useState<DailyCheckIn[]>(() =>
    safeRead<DailyCheckIn[]>(HEALTH_STORAGE_KEYS.dailyCheckins, []).map(normalizeCheckIn),
  );
  const [dailySteps, setDailySteps] = useState<DailyStepsState>(() => loadTodaySteps());
  const [nextActionState, setNextActionState] = useState<NextActionState | null>(() =>
    normalizeNextActionState(
      safeRead<NextActionState | null>(HEALTH_STORAGE_KEYS.nextActionState, null),
    ),
  );
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showHealthBlockedSheet, setShowHealthBlockedSheet] = useState(false);
  const [showHealthAdjustSheet, setShowHealthAdjustSheet] = useState(false);
  const [showUrgentSafety, setShowUrgentSafety] = useState(false);
  const [healthSnapshot, setHealthSnapshot] = useState<HealthSnapshot>(() => loadHealthSnapshot());
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>(() => getFollowUps());

  const todayCheckIn = getTodayCheckIn(dailyCheckins);

  const nextActionStateRef = useRef(nextActionState);
  const healthProfileRef = useRef(healthProfile);
  const todayCheckInRef = useRef(todayCheckIn);
  const hasAttemptedInitialPlanRef = useRef(false);
  const lastPlanGeneratedAtRef = useRef<number | null>(null);
  const applyNextActionFromPlanRef = useRef<
    (params: ApplyNextActionFromPlanParams) => Promise<ApplyNextActionResult>
  >(async () => ({ status: 'skipped', reason: 'not_ready' }));

  useEffect(() => {
    nextActionStateRef.current = nextActionState;
  }, [nextActionState]);

  useEffect(() => {
    healthProfileRef.current = healthProfile;
  }, [healthProfile]);

  useEffect(() => {
    todayCheckInRef.current = todayCheckIn;
  }, [todayCheckIn]);

  const refreshSnapshotState = useCallback(() => {
    setHealthSnapshot(recomputeHealthSnapshot());
  }, []);

  const refreshFollowUps = useCallback(() => {
    setFollowUps(getFollowUps());
  }, []);

  const [followUpNowMs, setFollowUpNowMs] = useState(() => Date.now());

  useEffect(() => {
    const refreshNow = () => setFollowUpNowMs(Date.now());
    const intervalId = window.setInterval(refreshNow, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const dueFollowUp = useMemo(
    () =>
      followUps
        .filter((item) => item.status === 'pending')
        .filter((item) => new Date(item.dueAt).getTime() <= followUpNowMs)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0] ?? null,
    [followUps, followUpNowMs],
  );

  const resolvedDailySteps = useMemo(() => {
    const today = todayDateKey();
    return dailySteps.date === today ? dailySteps : loadTodaySteps();
  }, [dailySteps]);

  const createFollowUpForAction = useCallback(
    (state: NextActionState | null) => {
      if (!state?.actionId) return;
      scheduleFollowUpForAction({
        source: 'today',
        action: {
          actionId: state.actionId,
          title: state.title ?? "Today's next best action",
          category: state.category ?? 'stabilize',
          safetyLevel: state.safetyLevel ?? 'normal',
          sourceSignals: (state.sourceSignals ?? []).map(String),
        },
      });
      refreshFollowUps();
    },
    [refreshFollowUps],
  );

  const collectIgnoredPendingAction = useCallback((state: NextActionState | null) => {
    if (!state || state.status !== 'pending') return;
    collectActionOutcome({
      actionId: state.actionId,
      status: 'ignored',
      category: state.category,
      source: state.source,
      reasonCode: 'replaced_pending_action',
    });
  }, []);

  const applyNextActionFromPlan = useCallback(
    async (params: ApplyNextActionFromPlanParams): Promise<ApplyNextActionResult> => {
      const trigger = params.trigger ?? 'initial_load';
      const current = nextActionStateRef.current;
      const policy = shouldRegenerateNextAction({
        currentAction: current,
        trigger,
        lastGeneratedAt: lastPlanGeneratedAtRef.current,
        onlyIfPending: params.onlyIfPending,
        force: params.force,
      });

      if (!policy.allow) {
        return { status: 'skipped', reason: policy.reason, action: current };
      }

      const snapshot = buildHealthSnapshot();
      let output;
      try {
        output = await generateCuravonNextAction({
          source: params.source,
          snapshot,
          latestCheckIn: params.latestCheckIn ?? todayCheckInRef.current,
          askHistory: loadAskHistory(),
          nextActionState: current,
          redFlagLogs: loadRedFlagLogs(),
          profile: healthProfileRef.current,
          currentConcern: params.concern ?? '',
          intakeResult: params.concern
            ? { concern: params.concern, concernType: '', redFlags: [] }
            : null,
          followUpResult: params.followUpResult ?? null,
        });
      } catch {
        return { status: 'error', reason: 'generation_failed', action: current };
      }

      let resultAction: NextActionState | null = current;
      let skipped = false;

      setNextActionState((prev) => {
        if (
          params.onlyIfPending !== false &&
          prev &&
          prev.status !== 'pending' &&
          trigger !== 'checkin_completed' &&
          trigger !== 'followup_requested' &&
          trigger !== 'data_reset' &&
          trigger !== 'demo_seed' &&
          trigger !== 'manual_refresh'
        ) {
          resultAction = prev;
          skipped = true;
          return prev;
        }

        const next = toNextActionStateFromAdapter(output, params.source);
        if (prev && prev.status === 'pending' && isSamePendingNextAction(prev, next)) {
          resultAction = prev;
          skipped = true;
          return prev;
        }

        persistNextAction(next);
        if (params.scheduleFollowUp !== false) {
          createFollowUpForAction(next);
        }
        lastPlanGeneratedAtRef.current = Date.now();
        resultAction = next;
        return next;
      });

      return {
        status: skipped ? 'skipped' : 'generated',
        reason: skipped ? 'same_pending_action' : policy.reason,
        action: resultAction,
      };
    },
    [createFollowUpForAction],
  );

  useEffect(() => {
    applyNextActionFromPlanRef.current = applyNextActionFromPlan;
  }, [applyNextActionFromPlan]);

  useEffect(() => {
    if (hasAttemptedInitialPlanRef.current) return;
    hasAttemptedInitialPlanRef.current = true;

    const policy = shouldRegenerateNextAction({
      currentAction: nextActionStateRef.current,
      trigger: 'initial_load',
    });
    if (!policy.allow) return;

    void applyNextActionFromPlanRef.current({
      source: 'today',
      trigger: 'initial_load',
      onlyIfPending: true,
    });
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
        return next;
      });
    },
    [],
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
        return next;
      });
    },
    [],
  );

  const updateHealthProfile = useCallback((patch: Partial<HealthProfile>) => {
    setHealthProfile((prev) => {
      const next = { ...prev, ...patch };
      persistProfile(next);
      return next;
    });
  }, []);

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

      collectIgnoredPendingAction(nextActionStateRef.current);
      void applyNextActionFromPlan({
        source: 'today',
        trigger: 'checkin_completed',
        concern: entry.symptoms || entry.notes || '',
        latestCheckIn: entry,
        onlyIfPending: false,
      });
      addDoctorSummaryItem(createCheckInSummaryItem(entry));
      refreshSnapshotState();
      runMetaSystemCycle();
      setShowCheckIn(false);
    },
    [dailySteps.steps, applyNextActionFromPlan, refreshSnapshotState, collectIgnoredPendingAction],
  );

  const markActionDone = useCallback(() => {
    setNextActionState((prev) => {
      if (!prev) return prev;
      const next: NextActionState = {
        ...prev,
        status: 'done',
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persistNextAction(next);
      addDoctorSummaryItem(createNextActionSummaryItem(next));
      setHealthSnapshot(recomputeHealthSnapshot());
      collectActionOutcome({
        actionId: next.actionId,
        status: 'done',
        category: next.category,
        source: next.source,
      });
      runMetaSystemCycle();
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
        blockedLabel: blockedReasonLabel(reason),
        updatedAt: new Date().toISOString(),
      };
      persistNextAction(next);
      addDoctorSummaryItem(createNextActionSummaryItem(next, { blockedReason: reason }));
      setHealthSnapshot(recomputeHealthSnapshot());
      collectActionOutcome({
        actionId: next.actionId,
        status: 'blocked',
        category: next.category,
        source: next.source,
        reasonCode: reason,
      });
      runMetaSystemCycle();
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
        adjustLabel: adjustedOptionLabel(option),
        updatedAt: new Date().toISOString(),
      };
      persistNextAction(next);
      addDoctorSummaryItem(createNextActionSummaryItem(next, { adjustOption: option }));
      setHealthSnapshot(recomputeHealthSnapshot());
      collectActionOutcome({
        actionId: next.actionId,
        status: 'adjusted',
        category: next.category,
        source: next.source,
        reasonCode: option,
      });
      runMetaSystemCycle();
      return next;
    });
    setShowHealthAdjustSheet(false);
  }, []);

  const setNextActionFromSource = useCallback((action: string, source: string) => {
    setNextActionState((prev) => {
      collectIgnoredPendingAction(prev);
      const next: NextActionState = {
        currentAction: action,
        title: "Today's next best action",
        reason: 'Based on your latest notes.',
        source,
        sourceSignals: [],
        sourceChips: [source],
        effort: 'low',
        category: 'general',
        safetyLevel: 'normal',
        actionId: `manual-${Date.now()}`,
        status: 'pending',
        updatedAt: new Date().toISOString(),
      };
      persistNextAction(next);
      createFollowUpForAction(next);
      return next;
    });
    refreshSnapshotState();
    runMetaSystemCycle();
  }, [refreshSnapshotState, collectIgnoredPendingAction, createFollowUpForAction]);

  const saveCurrentActionToSummary = useCallback(() => {
    if (!nextActionState) return;
    addDoctorSummaryItem(createNextActionSummaryItem(nextActionState));
    refreshSnapshotState();
  }, [nextActionState, refreshSnapshotState]);

  const refreshPersonalizedAction = useCallback(() => {
    void applyNextActionFromPlan({
      source: 'today',
      trigger: 'manual_refresh',
      onlyIfPending: false,
      force: true,
    });
  }, [applyNextActionFromPlan]);

  const submitFollowUpOutcome = useCallback(
    (outcome: FollowUpOutcome, note = '') => {
      if (!dueFollowUp) return;

      const decision = evaluateFollowUp(dueFollowUp, outcome, note);

      markFollowUpCompleted(dueFollowUp.id, outcome, note);
      updateFollowUp(dueFollowUp.id, {
        escalationFlag: decision.shouldEscalate,
        savedToDoctorSummary: decision.shouldSaveToDoctorSummary,
      });
      refreshFollowUps();

      setNextActionState((prev) => {
        if (!prev) return prev;
        const next: NextActionState = {
          ...prev,
          sourceSignals: Array.from(
            new Set([
              ...(prev.sourceSignals ?? []),
              outcome === 'blocked' ? 'followup_blocked' : '',
              outcome === 'helped' ? 'followup_helped' : '',
              outcome === 'worse' ? 'followup_worse' : '',
              outcome === 'not_done' ? 'followup_not_done' : '',
            ].filter(Boolean)),
          ),
          reason: decision.recommendedNextStep,
          safetyLevel: decision.shouldEscalate ? 'urgent' : prev.safetyLevel,
          updatedAt: new Date().toISOString(),
        };
        persistNextAction(next);
        return next;
      });

      if (decision.shouldEscalate) {
        setShowUrgentSafety(true);
      }

      if (decision.shouldSaveToDoctorSummary && nextActionState) {
        const followUpSummary = createNextActionSummaryItem({
          ...nextActionState,
          reason: `${nextActionState.reason ?? ''}\nFollow-up outcome: ${outcome}. ${note.trim() || decision.reason}`,
          safetyLevel: decision.shouldEscalate ? 'urgent' : nextActionState.safetyLevel,
          updatedAt: new Date().toISOString(),
        });
        addDoctorSummaryItem(followUpSummary);
      }

      if (decision.shouldGenerateNewAction) {
        void applyNextActionFromPlan({
          source: 'followup',
          trigger: 'followup_requested',
          followUpResult: { outcome, note },
          onlyIfPending: false,
        });
      }

      refreshSnapshotState();
      runMetaSystemCycle();
    },
    [
      dueFollowUp,
      nextActionState,
      refreshFollowUps,
      applyNextActionFromPlan,
      refreshSnapshotState,
    ],
  );

  const clearHealthData = useCallback(() => {
    const userId = safeRead<string>(APP_STORAGE_KEYS.authDemoUserId, 'local-anon-user');
    deleteAllHealthData(userId);
    const fresh = createDefaultHealthProfile();
    setHealthProfile(fresh);
    setDailyCheckins([]);
    setDailySteps(loadTodaySteps());
    setNextActionState(null);
    persistNextAction(null);
    refreshSnapshotState();
    hasAttemptedInitialPlanRef.current = false;
    void applyNextActionFromPlan({
      source: 'today',
      trigger: 'data_reset',
      onlyIfPending: false,
      force: true,
    }).finally(() => {
      hasAttemptedInitialPlanRef.current = true;
    });
  }, [refreshSnapshotState, applyNextActionFromPlan]);

  const exportHealthData = useCallback(() => {
    const userId = safeRead<string>(APP_STORAGE_KEYS.authDemoUserId, 'local-anon-user');
    const payload = exportCuravonData(userId);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `curavon-health-export-${todayDateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

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
        dailySteps: resolvedDailySteps,
        addTodaySteps,
        setTodayStepsCount,
        nextActionState,
        healthSnapshot,
        showCheckIn,
        openCheckIn: () => setShowCheckIn(true),
        closeCheckIn: () => setShowCheckIn(false),
        saveCheckIn,
        markActionDone,
        markActionBlocked,
        markActionAdjusted,
        setNextActionFromSource,
        saveCurrentActionToSummary,
        refreshPersonalizedAction,
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
        refreshHealthSnapshot: refreshSnapshotState,
        dueFollowUp,
        submitFollowUpOutcome,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}
