import {
  detectRedFlags,
  type RedFlagDetectionResult,
  type RedFlagMatch,
} from '../../health/redFlags';
import type { IntelligenceRedFlagHit } from '../types';

export type RedFlagBridgeResult = {
  detection: RedFlagDetectionResult;
  hits: IntelligenceRedFlagHit[];
  isUrgent: boolean;
  message: string;
};

function mapSeverity(severity: RedFlagMatch['severity']): IntelligenceRedFlagHit['severity'] {
  return severity;
}

function toIntelligenceHit(match: RedFlagMatch, index: number): IntelligenceRedFlagHit {
  return {
    id: `global:${match.category}:${index}`,
    label: match.label,
    severity: mapSeverity(match.severity),
    matchedTerm: match.matchedTerm,
  };
}

function buildUrgentMessage(detection: RedFlagDetectionResult): string {
  const parts = [detection.title.trim(), detection.body.trim()].filter(Boolean);
  return parts.join('\n\n');
}

/** Wrap shared detectRedFlags for the health-intelligence pipeline. */
export function bridgeRedFlags(rawText: string): RedFlagBridgeResult {
  const detection = detectRedFlags(rawText);
  const hits = detection.matches.map((match, index) => toIntelligenceHit(match, index));
  const isUrgent = detection.hasUrgent;

  return {
    detection,
    hits,
    isUrgent,
    message: isUrgent ? buildUrgentMessage(detection) : '',
  };
}

export { detectRedFlags };
export type { RedFlagDetectionResult, RedFlagMatch };
