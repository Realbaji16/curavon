import { runAIOrchestrator } from '../ai/orchestrator/aiOrchestrator';
import type { DoctorSummaryOutput } from './doctorSummaryTypes';
import {
  collectDoctorSummaryInput,
  compressDoctorSummaryInput,
} from './doctorSummaryCollector';
import {
  createFallbackDoctorSummary,
  isDoctorSummaryOutputSafe,
} from './doctorSummaryGuards';
import { buildDoctorSummaryPrompt, DOCTOR_SUMMARY_SYSTEM_PROMPT } from './doctorSummaryPrompt';
import { safeRead, safeWrite } from '../../utils/healthStorage';
import { APP_STORAGE_KEYS } from '../data/storageKeys';

const SUMMARY_VERSION = 'doctor-summary-v1';
const SUMMARY_CACHE = new Map<string, DoctorSummaryOutput>();
const AI_USAGE_LOG_KEY = APP_STORAGE_KEYS.aiUsageLog;

type AIUsageLogEntry = {
  task: 'doctor_summary';
  timestamp: string;
  cacheHit: boolean;
  fallbackUsed: boolean;
  aiUsed: boolean;
  inputSizeEstimate: number;
};

function logUsage(entry: AIUsageLogEntry) {
  const logs = safeRead<AIUsageLogEntry[]>(AI_USAGE_LOG_KEY, []);
  safeWrite(AI_USAGE_LOG_KEY, [entry, ...logs].slice(0, 300));
}

function cacheKey(input: { dateRange: string; selectedNoteIds: string[] }) {
  return `${SUMMARY_VERSION}:${input.dateRange}:${input.selectedNoteIds.sort().join(',')}`;
}

function toPlainLines(title: string, lines: string[]): string[] {
  return lines.length ? [`${title}`, ...lines.map((line) => `- ${line}`)] : [`${title}`, '- None recorded'];
}

export function formatDoctorSummaryAsPlainText(output: DoctorSummaryOutput): string {
  return [
    'CURAVON DOCTOR SUMMARY',
    `Date range: ${output.dateRange}`,
    `Generated: ${new Date().toLocaleString()}`,
    '',
    ...toPlainLines('1. Main concerns', output.mainConcerns),
    '',
    ...toPlainLines('2. Timeline', output.symptomTimeline),
    '',
    ...toPlainLines('3. Patterns noticed', output.recentPatterns),
    '',
    ...toPlainLines('4. Actions tried', output.actionsTried),
    '',
    ...toPlainLines('5. Questions for clinician', output.questionsForClinician),
    '',
    ...toPlainLines('6. Safety notes', output.redFlagNotes),
    '',
    ...toPlainLines('7. Medication notes', output.medicationNotes),
    '',
    ...toPlainLines('8. User goals', output.userGoals),
    '',
    'Footer:',
    output.footer,
  ].join('\n');
}

export async function generateDoctorSummaryAI(input: {
  dateRange: string;
  selectedNoteIds: string[];
  userNotes: string[];
}): Promise<DoctorSummaryOutput> {
  const key = cacheKey(input);
  const cached = SUMMARY_CACHE.get(key);
  if (cached) {
    logUsage({
      task: 'doctor_summary',
      timestamp: new Date().toISOString(),
      cacheHit: true,
      fallbackUsed: cached.fallbackUsed,
      aiUsed: cached.aiUsed,
      inputSizeEstimate: cached.mainConcerns.length + cached.symptomTimeline.length,
    });
    return cached;
  }

  const collected = collectDoctorSummaryInput({
    selectedNoteIds: input.selectedNoteIds,
    userNotes: input.userNotes,
    dateRangeDays: Number.parseInt(input.dateRange, 10) || 30,
  });
  const compressed = compressDoctorSummaryInput(collected);
  const fallback = createFallbackDoctorSummary({
    dateRange: collected.dateRange,
    mainConcerns: compressed.activeConcernSummaries,
    timeline: collected.recentCheckIns.map((c) => `${c.date}: ${c.symptoms || c.notes || 'No symptom note'}`),
    patterns: compressed.repeatedPatterns,
    actions: compressed.recentActions,
    questions: compressed.userQuestions,
    redFlags: compressed.redFlagSummaries,
    medicationNotes: compressed.medicationNoteSummaries,
    goals: collected.profileSnapshot.primaryGoals,
  });

  const prompt = buildDoctorSummaryPrompt({
    payload: compressed,
    dateRange: collected.dateRange,
    userNotes: collected.userNotes,
    safetyLevel: collected.redFlagLogs.length ? 'caution' : 'normal',
  });

  const orchestrated = await runAIOrchestrator({
    userInput: prompt,
    contextSnapshot: {
      mainConcernCount: compressed.mainConcernCount,
      kernelContext: {
        systemPrompt: DOCTOR_SUMMARY_SYSTEM_PROMPT,
        summaryVersion: SUMMARY_VERSION,
        selectedNoteIds: input.selectedNoteIds.slice(0, 40),
        dateRange: collected.dateRange,
      },
    },
    safetyLevel: collected.redFlagLogs.length ? 'caution' : 'normal',
    stageHint: 'summary',
    source: 'doctor_summary',
  });
  const ai = orchestrated.result as {
    fallbackUsed?: boolean;
    summaryTitle?: string;
    mainConcerns?: string[];
    symptomTimeline?: string[];
    recentPatterns?: string[];
    actionsTried?: string[];
    questionsForClinician?: string[];
    redFlagNotes?: string[];
    medicationNotes?: string[];
    userGoals?: string[];
    footer?: string;
  };

  let result: DoctorSummaryOutput = fallback;
  if (!ai.fallbackUsed) {
    const candidate: DoctorSummaryOutput = {
      summaryTitle: ai.summaryTitle || fallback.summaryTitle,
      dateRange: collected.dateRange,
      mainConcerns: ai.mainConcerns ?? fallback.mainConcerns,
      symptomTimeline: ai.symptomTimeline ?? fallback.symptomTimeline,
      recentPatterns: ai.recentPatterns ?? fallback.recentPatterns,
      actionsTried: ai.actionsTried ?? fallback.actionsTried,
      questionsForClinician: ai.questionsForClinician ?? fallback.questionsForClinician,
      redFlagNotes: ai.redFlagNotes ?? fallback.redFlagNotes,
      medicationNotes: ai.medicationNotes ?? fallback.medicationNotes,
      userGoals: ai.userGoals ?? fallback.userGoals,
      footer:
        ai.footer ||
        'This summary is generated from user-provided notes and is not a diagnosis.',
      aiUsed: true,
      fallbackUsed: false,
    };
    result = isDoctorSummaryOutputSafe(candidate) ? candidate : fallback;
  }

  SUMMARY_CACHE.set(key, result);
  logUsage({
    task: 'doctor_summary',
    timestamp: new Date().toISOString(),
    cacheHit: false,
    fallbackUsed: result.fallbackUsed,
    aiUsed: result.aiUsed,
    inputSizeEstimate: JSON.stringify(compressed).length,
  });
  return result;
}
