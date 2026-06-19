import {
  createContext,
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
import type { DoctorSummaryOutput } from '../lib/doctorSummary/doctorSummaryTypes';
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
import { useHealth } from './useHealth';
import { useApp } from './useApp';
import {
  formatDoctorSummaryAsPlainText,
  generateDoctorSummaryAI,
} from '../lib/doctorSummary/doctorSummaryAI';

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
  const [items, setItems] = useState<DoctorSummaryItem[]>(() => loadDoctorSummaryItems());
  const [drafts, setDrafts] = useState<DoctorSummaryDraft[]>(() => loadDoctorSummaryDrafts());
  const [redFlagLogs, setRedFlagLogs] = useState<RedFlagLog[]>(() => loadRedFlagLogs());
  const [clinicianQuestions, setClinicianQuestions] = useState<string[]>([]);
  const [aiSummary, setAISummary] = useState<DoctorSummaryOutput | null>(null);
  const [aiSummaryLoading, setAISummaryLoading] = useState(false);

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
      const current = loadDoctorSummaryItems();
      const next = current.map((item) =>
        item.id === id ? { ...item, includedInSummary: !item.includedInSummary } : item,
      );
      persistItems(next);
    },
    [persistItems],
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

  const renderedSummaryText = useMemo(() => {
    if (aiSummary) return formatDoctorSummaryAsPlainText(aiSummary);
    return builtSummary.fullText;
  }, [aiSummary, builtSummary.fullText]);

  const saveCurrentDraft = useCallback(() => {
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
    const next = [draft, ...drafts.filter((d) => d.id !== draft.id)];
    saveDoctorSummaryDrafts(next);
    setDrafts(next);
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
    saveCurrentDraft();
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
    saveCurrentDraft();
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
    saveCurrentDraft();
    showToast('Summary saved.');
  }, [saveCurrentDraft, showToast]);

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
    setAISummary(null);
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
