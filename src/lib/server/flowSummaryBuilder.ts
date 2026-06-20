import type {
  FlowAction,
  FlowBlocker,
  FlowRiskLevel,
  HealthFlow,
  RedFlagLogRecord,
} from '../data/dataTypes';
import type { FlowSummarySection } from './aiServerTypes';
import { SUMMARY_DISCLAIMER } from './aiServerTypes';

function readPayloadString(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readPayloadStringArray(payload: Record<string, unknown>, key: string): string[] {
  const value = payload[key];
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

export function buildDeterministicFlowSummary(input: {
  flow: HealthFlow;
  actions: FlowAction[];
  blockers: FlowBlocker[];
  redFlagLogs: RedFlagLogRecord[];
}): { sections: FlowSummarySection[]; summaryText: string; questionsForClinician: string[] } {
  const payload = input.flow.payload ?? {};
  const concernType = readPayloadString(payload, 'concernType') ?? 'General concern';
  const timeline = readPayloadString(payload, 'timeline') ?? 'Timeline not recorded';
  const goal = readPayloadString(payload, 'goal');
  const redFlagCategories =
    readPayloadStringArray(payload, 'redFlagCategories').length > 0
      ? readPayloadStringArray(payload, 'redFlagCategories')
      : input.redFlagLogs.map((log) => log.matchedConcern).slice(0, 5);

  const actionsTried = input.actions.map((action) => {
    const instruction =
      readPayloadString(action.payload, 'instruction') ??
      readPayloadString(action.payload, 'reason') ??
      'Action recorded';
    return `[${action.status}] ${instruction}`;
  });

  const blockerLines = input.blockers.map((blocker) => {
    const notes =
      readPayloadString(blocker.payload, 'notesSummary') ??
      blocker.blockerType.replace(/_/g, ' ');
    return `${blocker.blockerType}: ${notes}`;
  });

  const escalationNotes =
    input.flow.status === 'safety_blocked' || input.flow.riskLevel === 'urgent'
      ? [
          'Urgent safety language or red flags were noted for this flow.',
          ...redFlagCategories.map((category) => `Red-flag category: ${category}`),
        ]
      : redFlagCategories.length
        ? redFlagCategories.map((category) => `Safety note: ${category}`)
        : ['No urgent red-flag categories recorded for this flow.'];

  const sections: FlowSummarySection[] = [
    {
      heading: 'Concern summary',
      lines: [
        `Concern type: ${concernType}`,
        `Timeline: ${timeline}`,
        ...(goal ? [`Goal: ${goal}`] : []),
      ],
    },
    {
      heading: 'Actions tried',
      lines: actionsTried.length ? actionsTried : ['No actions recorded yet.'],
    },
    {
      heading: 'Blockers',
      lines: blockerLines.length ? blockerLines : ['No blockers recorded.'],
    },
    {
      heading: 'Red flags / escalation notes',
      lines: escalationNotes,
    },
  ];

  const summaryText = [
    'Curavon doctor-ready flow summary',
    '',
    ...sections.flatMap((section) => [section.heading, ...section.lines.map((line) => `- ${line}`), '']),
    SUMMARY_DISCLAIMER,
  ].join('\n');

  const questionsForClinician = [
    'What should I watch for based on these notes?',
    'Does this pattern need an in-person visit?',
  ];

  return { sections, summaryText, questionsForClinician };
}

export function mapPrivacyLevelInput(): 'private' {
  return 'private';
}

export function mapRiskLevelFromSafety(
  safetyLevel?: 'normal' | 'caution' | 'urgent',
): FlowRiskLevel {
  if (safetyLevel === 'urgent') return 'urgent';
  if (safetyLevel === 'caution') return 'medium';
  return 'low';
}
