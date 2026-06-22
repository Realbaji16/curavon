'use client';

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
import type { AskHistoryEntry } from '../types/askIntake';
import type { RedFlagLog } from '../types/doctorSummary';
import type { HealthSnapshot } from '../types/healthSnapshot';
import type { FollowUpOutcome, FollowUpRecord } from '../lib/followUp/followUpTypes';
import type { AcceptedActionSource } from '../types/actionLifecycle';
import { acceptanceSourceFromPlanTrigger } from '../types/actionLifecycle';
import {
  createDefaultHealthProfile,
  getTodayCheckIn,
  loadTodaySteps,
  normalizeCheckIn,
  saveTodaySteps,
  todayDateKey,
} from '../utils/healthUtils';
import { setMetaSystemHealthContext } from '../lib/meta/metaSystemContext';
import { trackSafeEvent } from '../lib/observability/safeAnalytics';
import { reportSafeError } from '../lib/observability/errorReporter';
import { ADJUSTED_ACTIONS } from '../utils/nextActionRules';
import { stepsBandToCount } from '../utils/stepsUtils';
import {
  addDoctorSummaryItem,
} from '../utils/doctorSummaryStorage';
import {
  createCheckInSummaryItem,
  createNextActionSummaryItem,
} from '../utils/doctorSummaryItems';
import {
  adjustedOptionLabel,
  blockedReasonLabel,
} from '../utils/nextBestActionEngine';
import {
  createEmptyHealthSnapshot,
  refreshHealthSnapshot as recomputeHealthSnapshot,
  buildHealthSnapshot,
  type HealthSnapshotInputs,
} from '../utils/healthSnapshot';
import {
  loadCoreHealthData,
  fetchAskHistory,
  saveDailyCheckinRecord,
  saveHealthProfileRecord,
  saveNextActionStateRecord,
  toDataErrorMessage,
  type CoreHealthDataLoadResult,
} from '../lib/data/coreHealthDataService';
import { DataAuthError, DataPermissionError } from '../lib/data/dataErrors';
import { useCuravonAuth } from '../lib/auth/useCuravonAuth';
import { syncAppShellFromHealthProfile } from '../lib/app/syncAppShellFromProfile';
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
  hydrateFollowUps,
  markFollowUpCompleted,
  updateFollowUp,
} from '../lib/followUp/followUpStorage';
import { hydrateGuideResults, type GuideResultRecord } from '../utils/guideResultStorage';
import { loadProductData, saveNotificationPreferenceRecord } from '../lib/data/productDataService';
import { scheduleFollowUpForAction } from '../lib/followUp/followUpScheduler';
import { evaluateFollowUp } from '../lib/followUp/followUpEngine';
import {
  requestAccountDataDeletion,
  requestAccountDataExport,
  toOperationalDataErrorMessage,
} from '../lib/data/operationalDataService';
import {
  persistFlowActionAdjusted,
  persistFlowActionBlocked,
  persistFlowActionDone,
  shouldPersistHealthFlowLifecycle,
} from '../lib/data/healthFlowService';
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
  acceptNextAction: (input: AcceptNextActionInput) => NextActionState;
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
  askHistory: AskHistoryEntry[];
  followUps: FollowUpRecord[];
  redFlagLogs: RedFlagLog[];
  guideResults: GuideResultRecord[];
  coreDataLoading: boolean;
  coreDataError: string | null;
  refreshHealthSnapshot: () => void;
  refreshAskHistory: () => Promise<void>;
  refreshHealthStateFromStorage: () => void;
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

function persistDailySteps(state: DailyStepsState) {
  saveTodaySteps(state);
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

export type AcceptNextActionInput = {
  actionText: string;
  acceptanceSource: AcceptedActionSource;
  actionId?: string;
  title?: string;
  category?: NextActionState['category'];
  safetyLevel?: NextActionState['safetyLevel'];
  reason?: string;
  sourceLabel?: string;
  sourceSignals?: string[];
  scheduleFollowUp?: boolean;
  healthFlowId?: string;
  flowActionId?: string;
  privacyLevel?: NextActionState['privacyLevel'];
  followUpContext?: {
    entryId?: string;
    guideId?: string;
  };
};

export function HealthProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, loading: authLoading } = useCuravonAuth();
  const [healthProfile, setHealthProfile] = useState<HealthProfile>(() => createDefaultHealthProfile());
  const [dailyCheckins, setDailyCheckins] = useState<DailyCheckIn[]>([]);
  const [dailySteps, setDailySteps] = useState<DailyStepsState>(() => loadTodaySteps());
  const [nextActionState, setNextActionState] = useState<NextActionState | null>(null);
  const [askHistory, setAskHistory] = useState<AskHistoryEntry[]>([]);
  const [coreDataLoading, setCoreDataLoading] = useState(true);
  const [coreDataError, setCoreDataError] = useState<string | null>(null);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showHealthBlockedSheet, setShowHealthBlockedSheet] = useState(false);
  const [showHealthAdjustSheet, setShowHealthAdjustSheet] = useState(false);
  const [showUrgentSafety, setShowUrgentSafety] = useState(false);
  const [healthSnapshot, setHealthSnapshot] = useState<HealthSnapshot>(() => createEmptyHealthSnapshot());
  const [followUps, setFollowUps] = useState<FollowUpRecord[]>([]);
  const [redFlagLogs, setRedFlagLogs] = useState<RedFlagLog[]>([]);
  const [guideResults, setGuideResults] = useState<GuideResultRecord[]>([]);

  const todayCheckIn = getTodayCheckIn(dailyCheckins);

  const nextActionStateRef = useRef(nextActionState);
  const healthProfileRef = useRef(healthProfile);
  const dailyCheckinsRef = useRef(dailyCheckins);
  const askHistoryRef = useRef(askHistory);
  const redFlagLogsRef = useRef(redFlagLogs);
  const followUpsRef = useRef(followUps);
  const guideResultsRef = useRef(guideResults);
  const todayCheckInRef = useRef(todayCheckIn);
  const hasAttemptedInitialPlanRef = useRef(false);
  const lastPlanGeneratedAtRef = useRef<number | null>(null);
  const applyNextActionFromPlanRef = useRef<
    (params: ApplyNextActionFromPlanParams) => Promise<ApplyNextActionResult>
  >(async () => ({ status: 'skipped', reason: 'not_ready' }));

  const buildSnapshotInputs = useCallback((): HealthSnapshotInputs => ({
    profile: healthProfileRef.current,
    dailyCheckins: dailyCheckinsRef.current,
    askHistory: askHistoryRef.current,
    nextActionState: nextActionStateRef.current,
    redFlags: redFlagLogsRef.current,
    followUps: followUpsRef.current,
    guideResults: guideResultsRef.current,
  }), []);

  const applyProductSlice = useCallback((result: Awaited<ReturnType<typeof loadProductData>>) => {
    setFollowUps(result.followUps);
    setRedFlagLogs(result.redFlagLogs);
    setGuideResults(result.guideResults);
    followUpsRef.current = result.followUps;
    redFlagLogsRef.current = result.redFlagLogs;
    guideResultsRef.current = result.guideResults;
    void hydrateFollowUps().catch(() => undefined);
    void hydrateGuideResults().catch(() => undefined);
  }, []);

  const applyCoreLoad = useCallback((result: CoreHealthDataLoadResult) => {
    const profile = result.healthProfile;
    const checkins = result.dailyCheckins;
    const action = normalizeNextActionState(result.nextActionState);

    if (user?.id) {
      syncAppShellFromHealthProfile(profile, user.id);
    }

    setHealthProfile(profile);
    setDailyCheckins(checkins);
    setNextActionState(action);
    setAskHistory(result.askHistory);
    setCoreDataError(result.error);

    healthProfileRef.current = profile;
    dailyCheckinsRef.current = checkins;
    nextActionStateRef.current = action;
    askHistoryRef.current = result.askHistory;
    todayCheckInRef.current = getTodayCheckIn(checkins);

    setMetaSystemHealthContext({
      checkins,
      askHistory: result.askHistory,
    });

    setHealthSnapshot(recomputeHealthSnapshot({
      profile,
      dailyCheckins: checkins,
      askHistory: result.askHistory,
      nextActionState: action,
      redFlags: redFlagLogsRef.current,
      followUps: followUpsRef.current,
      guideResults: guideResultsRef.current,
    }));
  }, [user?.id]);

  useEffect(() => {
    nextActionStateRef.current = nextActionState;
  }, [nextActionState]);

  useEffect(() => {
    healthProfileRef.current = healthProfile;
  }, [healthProfile]);

  useEffect(() => {
    dailyCheckinsRef.current = dailyCheckins;
  }, [dailyCheckins]);

  useEffect(() => {
    askHistoryRef.current = askHistory;
  }, [askHistory]);

  useEffect(() => {
    redFlagLogsRef.current = redFlagLogs;
  }, [redFlagLogs]);

  useEffect(() => {
    followUpsRef.current = followUps;
  }, [followUps]);

  useEffect(() => {
    guideResultsRef.current = guideResults;
  }, [guideResults]);

  useEffect(() => {
    todayCheckInRef.current = todayCheckIn;
  }, [todayCheckIn]);

  const refreshSnapshotState = useCallback(() => {
    setHealthSnapshot(recomputeHealthSnapshot(buildSnapshotInputs()));
  }, [buildSnapshotInputs]);

  const refreshAskHistory = useCallback(async () => {
    try {
      const entries = await fetchAskHistory();
      setAskHistory(entries);
      askHistoryRef.current = entries;
      refreshSnapshotState();
      setCoreDataError(null);
    } catch (error) {
      setCoreDataError(toDataErrorMessage(error));
    }
  }, [refreshSnapshotState]);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    void (async () => {
      if (!isAuthenticated) {
        applyCoreLoad({
          healthProfile: createDefaultHealthProfile(),
          dailyCheckins: [],
          nextActionState: null,
          askHistory: [],
          error: null,
        });
        applyProductSlice({
          doctorSummaryItems: [],
          doctorSummaryDrafts: [],
          redFlagLogs: [],
          followUps: [],
          guideResults: [],
          activityInsightStore: { insights: [], ruleGeneratedAt: null, lastAiRunAt: null, summaryHash: null },
          notificationPreference: null,
          userPreference: null,
          error: null,
        });
        if (!cancelled) setCoreDataLoading(false);
        return;
      }

      setCoreDataLoading(true);
      const [result, productResult] = await Promise.all([loadCoreHealthData(), loadProductData()]);
      if (cancelled) return;
      applyCoreLoad(result);
      applyProductSlice(productResult);
      setCoreDataLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, applyCoreLoad, applyProductSlice]);

  const reportPersistError = useCallback((error: unknown) => {
    setCoreDataError(toDataErrorMessage(error));
    if (error instanceof DataAuthError || error instanceof DataPermissionError) return;
    reportSafeError(error, {
      route_name: 'health_context',
      error_code: 'persist_failed',
    });
  }, []);

  const persistProfile = useCallback((profile: HealthProfile) => {
    if (!isAuthenticated) return;
    void saveHealthProfileRecord(profile).catch(reportPersistError);
  }, [isAuthenticated, reportPersistError]);

  const persistNextAction = useCallback((state: NextActionState | null) => {
    if (!isAuthenticated) return;
    void saveNextActionStateRecord(state).catch(reportPersistError);
  }, [isAuthenticated, reportPersistError]);

  const refreshFollowUps = useCallback(() => {
    void hydrateFollowUps()
      .then((records) => {
        setFollowUps(records);
        followUpsRef.current = records;
        refreshSnapshotState();
      })
      .catch(reportPersistError);
  }, [refreshSnapshotState, reportPersistError]);

  const refreshHealthStateFromStorage = useCallback(() => {
    void Promise.all([loadCoreHealthData(), loadProductData()])
      .then(([coreResult, productResult]) => {
        applyCoreLoad(coreResult);
        applyProductSlice(productResult);
        setDailySteps(loadTodaySteps());
        refreshFollowUps();
      })
      .catch((error) => {
        setCoreDataError(toDataErrorMessage(error));
      });
  }, [applyCoreLoad, applyProductSlice, refreshFollowUps]);

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
    (
      state: NextActionState | null,
      acceptanceSource: AcceptedActionSource,
      context?: { entryId?: string; guideId?: string },
    ) => {
      if (!state?.actionId) return;
      scheduleFollowUpForAction({
        acceptanceSource,
        action: {
          actionId: state.actionId,
          title: state.title ?? "Today's next best action",
          category: state.category ?? 'stabilize',
          safetyLevel: state.safetyLevel ?? 'normal',
          sourceSignals: (state.sourceSignals ?? []).map(String),
        },
        context,
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

      const snapshot = buildHealthSnapshot(buildSnapshotInputs());
      let output;
      try {
        output = await generateCuravonNextAction({
          source: params.source,
          snapshot,
          latestCheckIn: params.latestCheckIn ?? todayCheckInRef.current,
          askHistory: askHistoryRef.current,
          nextActionState: current,
          redFlagLogs: redFlagLogsRef.current,
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
          const acceptanceSource = acceptanceSourceFromPlanTrigger(
            trigger,
            params.source,
          );
          createFollowUpForAction(next, acceptanceSource);
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
    [createFollowUpForAction, buildSnapshotInputs, persistNextAction],
  );

  useEffect(() => {
    applyNextActionFromPlanRef.current = applyNextActionFromPlan;
  }, [applyNextActionFromPlan]);

  useEffect(() => {
    if (!isAuthenticated) {
      hasAttemptedInitialPlanRef.current = false;
      return;
    }
    if (coreDataLoading || authLoading) return;
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
  }, [coreDataLoading, authLoading, isAuthenticated]);

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
      if (patch.sensitiveMode === true) {
        trackSafeEvent('sensitive_mode_enabled', {
          privacy_level: 'sensitive',
          status: 'enabled',
        });
      }
      if (patch.smartSilencePreference) {
        void saveNotificationPreferenceRecord({
          smartSilencePreference: patch.smartSilencePreference,
          sensitive_preview: false,
          updatedAt: new Date().toISOString(),
        }).catch(reportPersistError);
      }
      if (patch.sensitiveMode !== undefined) {
        void saveNotificationPreferenceRecord({
          sensitive_preview: false,
          sensitiveMode: patch.sensitiveMode,
          updatedAt: new Date().toISOString(),
        }).catch(reportPersistError);
      }
      return next;
    });
  }, [persistProfile, reportPersistError]);

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
    [persistProfile],
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
    [persistProfile],
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
        void saveDailyCheckinRecord(entry).catch(reportPersistError);
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
      void addDoctorSummaryItem(createCheckInSummaryItem(entry)).catch(reportPersistError);
      refreshSnapshotState();
      runMetaSystemCycle();
      setShowCheckIn(false);
    },
    [dailySteps.steps, applyNextActionFromPlan, refreshSnapshotState, collectIgnoredPendingAction, reportPersistError],
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
      if (shouldPersistHealthFlowLifecycle(next)) {
        void persistFlowActionDone(next.flowActionId, next).catch(reportPersistError);
      }
      void addDoctorSummaryItem(createNextActionSummaryItem(next)).catch(reportPersistError);
      refreshSnapshotState();
      collectActionOutcome({
        actionId: next.actionId,
        status: 'done',
        category: next.category,
        source: next.source,
      });
      trackSafeEvent('action_done', {
        action_status: 'done',
        flow_id: next.healthFlowId,
        privacy_level: next.privacyLevel,
        risk_level: next.safetyLevel === 'urgent' ? 'urgent' : next.safetyLevel === 'caution' ? 'medium' : 'low',
      });
      runMetaSystemCycle();
      return next;
    });
  }, [persistNextAction, refreshSnapshotState, reportPersistError]);

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
      if (shouldPersistHealthFlowLifecycle(next)) {
        void persistFlowActionBlocked({
          flowId: next.healthFlowId,
          flowActionId: next.flowActionId,
          reason,
          state: next,
        }).catch(reportPersistError);
      }
      void addDoctorSummaryItem(createNextActionSummaryItem(next, { blockedReason: reason })).catch(reportPersistError);
      refreshSnapshotState();
      collectActionOutcome({
        actionId: next.actionId,
        status: 'blocked',
        category: next.category,
        source: next.source,
        reasonCode: reason,
      });
      trackSafeEvent('action_blocked', {
        action_status: 'blocked',
        blocked_reason: reason,
        flow_id: next.healthFlowId,
        privacy_level: next.privacyLevel,
      });
      runMetaSystemCycle();
      return next;
    });
    setShowHealthBlockedSheet(false);
  }, [persistNextAction, refreshSnapshotState, reportPersistError]);

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
      if (shouldPersistHealthFlowLifecycle(prev)) {
        void persistFlowActionAdjusted({
          flowId: prev.healthFlowId!,
          flowActionId: prev.flowActionId!,
          option,
          state: prev,
        }).catch(reportPersistError);
      }
      void addDoctorSummaryItem(createNextActionSummaryItem(next, { adjustOption: option })).catch(reportPersistError);
      refreshSnapshotState();
      collectActionOutcome({
        actionId: next.actionId,
        status: 'adjusted',
        category: next.category,
        source: next.source,
        reasonCode: option,
      });
      trackSafeEvent('action_adjusted', {
        action_status: 'adjusted',
        blocked_reason: option,
        flow_id: next.healthFlowId,
        privacy_level: next.privacyLevel,
      });
      runMetaSystemCycle();
      return next;
    });
    setShowHealthAdjustSheet(false);
  }, [persistNextAction, refreshSnapshotState, reportPersistError]);

  const acceptNextAction = useCallback(
    (input: AcceptNextActionInput): NextActionState => {
      collectIgnoredPendingAction(nextActionStateRef.current);

      const actionId =
        input.actionId ??
        `accepted-${input.acceptanceSource}-${input.actionText.trim().slice(0, 24).replace(/\s+/g, '-')}-${todayDateKey()}`;

      const next: NextActionState = {
        currentAction: input.actionText,
        title: input.title ?? "Today's next best action",
        reason: input.reason ?? 'Based on your latest notes.',
        source: input.sourceLabel ?? input.acceptanceSource,
        sourceSignals: input.sourceSignals ?? [],
        sourceChips: [input.sourceLabel ?? input.acceptanceSource],
        effort: 'low',
        category: input.category ?? 'general',
        safetyLevel: input.safetyLevel ?? 'normal',
        actionId,
        healthFlowId: input.healthFlowId,
        flowActionId: input.flowActionId,
        privacyLevel: input.privacyLevel,
        status: 'pending',
        updatedAt: new Date().toISOString(),
      };

      persistNextAction(next);
      setNextActionState(next);
      nextActionStateRef.current = next;

      if (input.scheduleFollowUp !== false) {
        createFollowUpForAction(next, input.acceptanceSource, input.followUpContext);
      }

      refreshSnapshotState();
      runMetaSystemCycle();
      return next;
    },
    [collectIgnoredPendingAction, createFollowUpForAction, persistNextAction, refreshSnapshotState],
  );

  const setNextActionFromSource = useCallback(
    (action: string, source: string) => {
      acceptNextAction({
        actionText: action,
        acceptanceSource: 'ask_promoted',
        sourceLabel: source,
      });
    },
    [acceptNextAction],
  );

  const saveCurrentActionToSummary = useCallback(() => {
    if (!nextActionState) return;
    void addDoctorSummaryItem(createNextActionSummaryItem(nextActionState)).catch(reportPersistError);
    refreshSnapshotState();
  }, [nextActionState, refreshSnapshotState, reportPersistError]);

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
        void addDoctorSummaryItem(followUpSummary).catch(reportPersistError);
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
      persistNextAction,
      reportPersistError,
      refreshSnapshotState,
    ],
  );

  const clearHealthData = useCallback(() => {
    void requestAccountDataDeletion({ deletionScope: 'health_data' }).catch((error) => {
      console.error(toOperationalDataErrorMessage(error));
    });
  }, []);

  const exportHealthData = useCallback(() => {
    void requestAccountDataExport({ exportScope: 'health_records' }).catch((error) => {
      console.error(toOperationalDataErrorMessage(error));
    });
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
        acceptNextAction,
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
        askHistory,
        followUps,
        redFlagLogs,
        guideResults,
        coreDataLoading,
        coreDataError,
        refreshHealthSnapshot: refreshSnapshotState,
        refreshAskHistory,
        refreshHealthStateFromStorage,
        dueFollowUp,
        submitFollowUpOutcome,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}
