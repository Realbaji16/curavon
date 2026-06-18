import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import type {
  DoctorSummaryDraft,
  DoctorSummaryItem,
  RedFlagLog,
} from '../types/doctorSummary';
import type { DailyCheckIn, HealthBlockedReason, NextActionState, AdjustOption } from '../types/health';
import {
  addDoctorSummaryItem as persistAddItem,
  addRedFlagLog as persistAddRedFlag,
  loadDoctorSummaryDrafts,
  loadDoctorSummaryItems,
  loadRedFlagLogs,
  saveDoctorSummaryDrafts,
  saveDoctorSummaryItems,
  clearDoctorSummaryStorage,
} from '../utils/doctorSummaryStorage';
import {
  buildSummaryDocument,
  createAskIntakeSummaryItem,
  createCheckInSummaryItem,
  createFlowSummaryItem,
  createNextActionSummaryItem,
  createRedFlagSummaryItem,
} from '../utils/doctorSummaryItems';
import { findUrgentMatches, URGENT_SAFETY_MESSAGE } from '../utils/healthSafety';
import { useHealth } from './HealthContext';
import { useApp } from './AppContext';

interface DoctorSummaryContextValue {
  items: DoctorSummaryItem[];
  drafts: DoctorSummaryDraft[];
  redFlagLogs: RedFlagLog[];
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
  }) => RedFlagLog;
  builtSummary: ReturnType<typeof buildSummaryDocument>;
  includedCount: number;
  latestDraftDate: string | null;
  copySummary: () => Promise<boolean>;
  downloadSummary: () => void;
  clearDraft: () => void;
  refreshFromStorage: () => void;
  clearAllDoctorSummaryData: () => void;
}

const DoctorSummaryContext = createContext<DoctorSummaryContextValue | null>(null);

export function DoctorSummaryProvider({ children }: { children: ReactNode }) {
  const { healthProfile } = useHealth();
  const { showToast } = useApp();
  const [items, setItems] = useState<DoctorSummaryItem[]>(() => loadDoctorSummaryItems());
  const [drafts, setDrafts] = useState<DoctorSummaryDraft[]>(() => loadDoctorSummaryDrafts());
  const [redFlagLogs, setRedFlagLogs] = useState<RedFlagLog[]>(() => loadRedFlagLogs());
  const [clinicianQuestions, setClinicianQuestions] = useState<string[]>([]);

  const refreshFromStorage = useCallback(() => {
    setItems(loadDoctorSummaryItems());
    setDrafts(loadDoctorSummaryDrafts());
    setRedFlagLogs(loadRedFlagLogs());
  }, []);

  const persistItems = useCallback((next: DoctorSummaryItem[]) => {
    saveDoctorSummaryItems(next);
    setItems(next);
  }, []);

  const toggleItemIncluded = useCallback(
    (id: string) => {
      persistItems(
        items.map((item) =>
          item.id === id ? { ...item, includedInSummary: !item.includedInSummary } : item,
        ),
      );
    },
    [items, persistItems],
  );

  const addClinicianQuestion = useCallback((q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    setClinicianQuestions((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]));
  }, []);

  const addFromCheckIn = useCallback(
    (checkIn: DailyCheckIn) => {
      persistAddItem(createCheckInSummaryItem(checkIn));
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const addFromFlow = useCallback(
    (input: Parameters<typeof createFlowSummaryItem>[0]) => {
      persistAddItem(createFlowSummaryItem(input));
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const addFromNextAction = useCallback(
    (
      state: NextActionState,
      extra?: { blockedReason?: HealthBlockedReason; adjustOption?: AdjustOption },
    ) => {
      persistAddItem(createNextActionSummaryItem(state, extra));
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const addFromAsk = useCallback(
    (input: Parameters<typeof createAskIntakeSummaryItem>[0]) => {
      persistAddItem(createAskIntakeSummaryItem(input));
      refreshFromStorage();
    },
    [refreshFromStorage],
  );

  const logRedFlag = useCallback(
    (input: { source: string; userText: string; guidanceShown?: string; matchedConcern?: string }) => {
      const matches = findUrgentMatches(input.userText);
      const matchedConcern = input.matchedConcern ?? matches[0] ?? 'urgent language';
      const guidance = input.guidanceShown ?? URGENT_SAFETY_MESSAGE;
      const log = persistAddRedFlag({
        source: input.source,
        matchedConcern,
        userText: input.userText,
        guidanceShown: guidance,
      });
      persistAddItem(
        createRedFlagSummaryItem({
          source: input.source,
          matchedConcern,
          userText: input.userText,
          guidanceShown: guidance,
        }),
      );
      refreshFromStorage();
      return log;
    },
    [refreshFromStorage],
  );

  const builtSummary = useMemo(
    () => buildSummaryDocument(items, healthProfile, clinicianQuestions),
    [items, healthProfile, clinicianQuestions],
  );

  const includedCount = items.filter((i) => i.includedInSummary).length;

  const latestDraftDate = drafts[0]?.updatedAt ?? null;

  const saveCurrentDraft = useCallback(() => {
    const now = new Date().toISOString();
    const draft: DoctorSummaryDraft = {
      id: drafts[0]?.id ?? `draft-${Date.now()}`,
      title: builtSummary.title,
      dateRange: builtSummary.dateLabel,
      includedItemIds: items.filter((i) => i.includedInSummary).map((i) => i.id),
      summaryText: builtSummary.fullText,
      questionsForClinician: clinicianQuestions,
      createdAt: drafts[0]?.createdAt ?? now,
      updatedAt: now,
    };
    const next = [draft, ...drafts.filter((d) => d.id !== draft.id)];
    saveDoctorSummaryDrafts(next);
    setDrafts(next);
  }, [drafts, builtSummary, items, clinicianQuestions]);

  const copySummary = useCallback(async () => {
    saveCurrentDraft();
    try {
      await navigator.clipboard.writeText(builtSummary.fullText);
      showToast('Summary copied.');
      return true;
    } catch {
      showToast('Could not copy — try download instead.');
      return false;
    }
  }, [builtSummary.fullText, saveCurrentDraft, showToast]);

  const downloadSummary = useCallback(() => {
    saveCurrentDraft();
    const blob = new Blob([builtSummary.fullText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `curavon-doctor-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Summary downloaded.');
  }, [builtSummary.fullText, saveCurrentDraft, showToast]);

  const clearDraft = useCallback(() => {
    saveDoctorSummaryDrafts([]);
    setDrafts([]);
    showToast('Draft cleared.');
  }, [showToast]);

  const clearAllDoctorSummaryData = useCallback(() => {
    clearDoctorSummaryStorage();
    setItems([]);
    setDrafts([]);
    setRedFlagLogs([]);
    setClinicianQuestions([]);
  }, []);

  return (
    <DoctorSummaryContext.Provider
      value={{
        items,
        drafts,
        redFlagLogs,
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
        refreshFromStorage,
        clearAllDoctorSummaryData,
      }}
    >
      {children}
    </DoctorSummaryContext.Provider>
  );
}

export function useDoctorSummary() {
  const ctx = useContext(DoctorSummaryContext);
  if (!ctx) throw new Error('useDoctorSummary must be used within DoctorSummaryProvider');
  return ctx;
}
