'use client';

import {
  createContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  DoctorSummaryDraft,
  DoctorSummaryItem,
  RedFlagLog,
} from '../types/doctorSummary';
import type { DoctorSummaryOutput } from '../lib/doctorSummary/doctorSummaryTypes';
import type { DailyCheckIn, HealthBlockedReason, NextActionState, AdjustOption } from '../types/health';
import {
  addDoctorSummaryItem as persistAddItem,
  addRedFlagLog as persistAddRedFlag,
  clearDoctorSummaryStorage,
  saveDoctorSummaryDraft,
  saveDoctorSummaryItem,
} from '../utils/doctorSummaryStorage';
import { detectRedFlags } from '../lib/health/redFlags';
import { trackSafeEvent } from '../lib/observability/safeAnalytics';
import {
  buildSummaryDocument,
  createAskIntakeSummaryItem,
  createCheckInSummaryItem,
  createFlowSummaryItem,
  createNextActionSummaryItem,
  createRedFlagSummaryItem,
} from '../utils/doctorSummaryItems';
import { findUrgentMatches, URGENT_SAFETY_MESSAGE } from '../utils/healthSafety';
import { useHealth } from './useHealth';
import { useApp } from './useApp';
import {
  formatDoctorSummaryAsPlainText,
  generateDoctorSummaryAI,
} from '../lib/doctorSummary/doctorSummaryAI';
import { useCuravonAuth } from '../lib/auth/useCuravonAuth';
import { loadProductData, toProductDataErrorMessage } from '../lib/data/productDataService';

interface DoctorSummaryContextValue {
  items: DoctorSummaryItem[];
  drafts: DoctorSummaryDraft[];
  redFlagLogs: RedFlagLog[];
  productDataLoading: boolean;
  productDataError: string | null;
  clinicianQuestions: string[];
  setClinicianQuestions: (q: string[]) => void;
  addClinicianQuestion: (q: string) => void;
  toggleItemIncluded: (id: string) => void;
  addFromCheckIn: (checkIn: DailyCheckIn) => void;
  addFromFlow: (input: Parameters<typeof createFlowSummaryItem>[0]) => void;
  addFromNextAction: (
    state: NextActionState,
    extra?: { blockedReason?: HealthBlockedReason; adjustOption?: AdjustOption },
  ) => void;
  addFromAsk: (input: Parameters<typeof createAskIntakeSummaryItem>[0]) => void;
  logRedFlag: (input: {
    source: string;
    userText: string;
    guidanceShown?: string;
    matchedConcern?: string;
  }) => Promise<RedFlagLog>;
  builtSummary: ReturnType<typeof buildSummaryDocument>;
  includedCount: number;
  latestDraftDate: string | null;
  copySummary: () => Promise<boolean>;
  downloadSummary: () => void;
  clearDraft: () => void;
  saveSummary: () => void;
  generateAISummary: () => Promise<void>;
  refreshAISummary: () => Promise<void>;
  aiSummary: DoctorSummaryOutput | null;
  aiSummaryLoading: boolean;
  renderedSummaryText: string;
  refreshFromStorage: () => void;
  clearAllDoctorSummaryData: () => void;
}

const DoctorSummaryContext = createContext<DoctorSummaryContextValue | null>(null);

export { DoctorSummaryContext };

export function DoctorSummaryProvider({ children }: { children: ReactNode }) {
  const { healthProfile } = useHealth();
  const { showToast } = useApp();
  const { isAuthenticated, loading: authLoading } = useCuravonAuth();
  const [items, setItems] = useState<DoctorSummaryItem[]>([]);
  const [drafts, setDrafts] = useState<DoctorSummaryDraft[]>([]);
  const [redFlagLogs, setRedFlagLogs] = useState<RedFlagLog[]>([]);
  const [productDataLoading, setProductDataLoading] = useState(true);
  const [productDataError, setProductDataError] = useState<string | null>(null);
  const [clinicianQuestions, setClinicianQuestions] = useState<string[]>([]);
  const [aiSummary, setAISummary] = useState<DoctorSummaryOutput | null>(null);
  const [aiSummaryLoading, setAISummaryLoading] = useState(false);

  const applyProductLoad = useCallback(
    (result: Awaited<ReturnType<typeof loadProductData>>) => {
      setItems(result.doctorSummaryItems);
      setDrafts(result.doctorSummaryDrafts);
      setRedFlagLogs(result.redFlagLogs);
      setProductDataError(result.error);
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    void (async () => {
      if (!isAuthenticated) {
        applyProductLoad({
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
        if (!cancelled) setProductDataLoading(false);
        return;
      }

      setProductDataLoading(true);
      const result = await loadProductData();
      if (cancelled) return;
      applyProductLoad(result);
      setProductDataLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, applyProductLoad]);

  const refreshFromStorage = useCallback(() => {
    void loadProductData()
      .then(applyProductLoad)
      .catch((error) => setProductDataError(toProductDataErrorMessage(error)));
  }, [applyProductLoad]);

  const toggleItemIncluded = useCallback(
    (id: string) => {
      setItems((current) => {
        const next = current.map((item) =>
          item.id === id ? { ...item, includedInSummary: !item.includedInSummary } : item,
        );
        const updated = next.find((item) => item.id === id);
        if (updated) {
          void saveDoctorSummaryItem(updated).catch((error) =>
            setProductDataError(toProductDataErrorMessage(error)),
          );
        }
        return next;
      });
    },
    [],
  );

  const addClinicianQuestion = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setClinicianQuestions((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }, []);

  const addFromCheckIn = useCallback(
    (checkIn: DailyCheckIn) => {
      void persistAddItem(createCheckInSummaryItem(checkIn))
        .then(() => refreshFromStorage())
        .catch((error) => setProductDataError(toProductDataErrorMessage(error)));
    },
    [refreshFromStorage],
  );

  const addFromFlow = useCallback(
    (input: Parameters<typeof createFlowSummaryItem>[0]) => {
      void persistAddItem(createFlowSummaryItem(input))
        .then(() => refreshFromStorage())
        .catch((error) => setProductDataError(toProductDataErrorMessage(error)));
    },
    [refreshFromStorage],
  );

  const addFromNextAction = useCallback(
    (
      state: NextActionState,
      extra?: { blockedReason?: HealthBlockedReason; adjustOption?: AdjustOption },
    ) => {
      void persistAddItem(createNextActionSummaryItem(state, extra))
        .then(() => refreshFromStorage())
        .catch((error) => setProductDataError(toProductDataErrorMessage(error)));
    },
    [refreshFromStorage],
  );

  const addFromAsk = useCallback(
    (input: Parameters<typeof createAskIntakeSummaryItem>[0]) => {
      void persistAddItem(createAskIntakeSummaryItem(input))
        .then(() => refreshFromStorage())
        .catch((error) => setProductDataError(toProductDataErrorMessage(error)));
    },
    [refreshFromStorage],
  );

  const logRedFlag = useCallback(
    async (input: {
      source: string;
      userText: string;
      guidanceShown?: string;
      matchedConcern?: string;
    }) => {
      const matches = findUrgentMatches(input.userText);
      const matchedConcern = input.matchedConcern ?? matches[0] ?? 'urgent language';
      const guidance = input.guidanceShown ?? URGENT_SAFETY_MESSAGE;
      const detection = detectRedFlags(input.userText);
      trackSafeEvent('red_flag_triggered', {
        blocked_reason: detection.categories[0] ?? 'unknown',
        risk_level: 'urgent',
        safety_flag: true,
        route_name: input.source.toLowerCase().replace(/\s+/g, '_'),
      });
      try {
        const log = await persistAddRedFlag({
          source: input.source,
          matchedConcern,
          userText: input.userText,
          guidanceShown: guidance,
        });
        await persistAddItem(
          createRedFlagSummaryItem({
            source: input.source,
            matchedConcern,
            userText: input.userText,
            guidanceShown: guidance,
          }),
        );
        refreshFromStorage();
        return log;
      } catch (error) {
        setProductDataError(toProductDataErrorMessage(error));
        throw error;
      }
    },
    [refreshFromStorage],
  );

  const builtSummary = useMemo(
    () => buildSummaryDocument(items, healthProfile, clinicianQuestions),
    [items, healthProfile, clinicianQuestions],
  );

  const includedCount = items.filter((i) => i.includedInSummary).length;

  const latestDraftDate = drafts[0]?.updatedAt ?? null;

  const renderedSummaryText = useMemo(() => {
    if (aiSummary) return formatDoctorSummaryAsPlainText(aiSummary);
    return builtSummary.fullText;
  }, [aiSummary, builtSummary.fullText]);

  const saveCurrentDraft = useCallback(async () => {
    const now = new Date().toISOString();
    const draft: DoctorSummaryDraft = {
      id: drafts[0]?.id ?? `draft-${Date.now()}`,
      title: aiSummary?.summaryTitle ?? builtSummary.title,
      dateRange: aiSummary?.dateRange ?? builtSummary.dateLabel,
      includedItemIds: items.filter((i) => i.includedInSummary).map((i) => i.id),
      summaryText: renderedSummaryText,
      questionsForClinician: clinicianQuestions,
      createdAt: drafts[0]?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await saveDoctorSummaryDraft(draft);
      setDrafts((prev) => [draft, ...prev.filter((d) => d.id !== draft.id)]);
    } catch (error) {
      setProductDataError(toProductDataErrorMessage(error));
    }
  }, [drafts, builtSummary, items, clinicianQuestions, aiSummary, renderedSummaryText]);

  const generateAISummary = useCallback(async () => {
    setAISummaryLoading(true);
    try {
      const selectedNoteIds = items.filter((i) => i.includedInSummary).map((i) => i.id);
      const summary = await generateDoctorSummaryAI({
        dateRange: '30',
        selectedNoteIds,
        userNotes: clinicianQuestions,
      });
      setAISummary(summary);
      showToast('Doctor summary organized.');
    } catch {
      showToast('Could not generate AI summary. Using structured summary.');
    } finally {
      setAISummaryLoading(false);
    }
  }, [items, clinicianQuestions, showToast]);

  const refreshAISummary = useCallback(async () => {
    await generateAISummary();
  }, [generateAISummary]);

  const copySummary = useCallback(async () => {
    await saveCurrentDraft();
    try {
      await navigator.clipboard.writeText(renderedSummaryText);
      showToast('Summary copied.');
      return true;
    } catch {
      showToast('Could not copy — try download instead.');
      return false;
    }
  }, [renderedSummaryText, saveCurrentDraft, showToast]);

  const downloadSummary = useCallback(() => {
    void saveCurrentDraft();
    const blob = new Blob([renderedSummaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `curavon-doctor-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Summary downloaded.');
  }, [renderedSummaryText, saveCurrentDraft, showToast]);

  const saveSummary = useCallback(() => {
    void saveCurrentDraft();
    showToast('Summary saved.');
  }, [saveCurrentDraft, showToast]);

  const clearDraft = useCallback(() => {
    void (async () => {
      try {
        const { clearDoctorSummaryDraftsRemote } = await import('../lib/data/productDataService');
        await clearDoctorSummaryDraftsRemote();
        setDrafts([]);
        showToast('Draft cleared.');
      } catch (error) {
        setProductDataError(toProductDataErrorMessage(error));
      }
    })();
  }, [showToast]);

  const clearAllDoctorSummaryData = useCallback(() => {
    void clearDoctorSummaryStorage()
      .then(() => {
        setItems([]);
        setDrafts([]);
        setRedFlagLogs([]);
        setClinicianQuestions([]);
        setAISummary(null);
      })
      .catch((error) => setProductDataError(toProductDataErrorMessage(error)));
  }, []);

  return (
    <DoctorSummaryContext.Provider
      value={{
        items,
        drafts,
        redFlagLogs,
        productDataLoading,
        productDataError,
        clinicianQuestions,
        setClinicianQuestions,
        addClinicianQuestion,
        toggleItemIncluded,
        addFromCheckIn,
        addFromFlow,
        addFromNextAction,
        addFromAsk,
        logRedFlag,
        builtSummary,
        includedCount,
        latestDraftDate,
        copySummary,
        downloadSummary,
        clearDraft,
        saveSummary,
        generateAISummary,
        refreshAISummary,
        aiSummary,
        aiSummaryLoading,
        renderedSummaryText,
        refreshFromStorage,
        clearAllDoctorSummaryData,
      }}
    >
      {children}
    </DoctorSummaryContext.Provider>
  );
}
