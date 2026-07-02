import { createHash } from 'node:crypto';
import type { FormSourceRole } from '../types';
import type { NormalizedFormResponse } from '../types';
import { FORM_SOURCE_FILENAME_HINTS, type RedactFormRowInput, type RedactFormRowResult } from './formSourceTypes';

const PII_HEADER_PATTERN =
  /\b(email|e-?mail|phone|mobile|tel|telephone|whatsapp|name|full\s*name|first\s*name|last\s*name|surname|contact\s*name)\b/i;

const REGION_HEADER_PATTERN = /\b(state|region|province|lga|local\s*government)\b/i;

const CONSENT_HEADER_PATTERN =
  /\b(consent|i\s+consent|i\s+agree|agree|permission|opt[\s-]?in|data\s+use)\b/i;

const AFFIRMATIVE_ANSWERS = new Set(['yes', 'y', 'true', '1', 'agree', 'i agree', 'i consent']);
const NEGATIVE_ANSWERS = new Set(['no', 'n', 'false', '0', 'disagree']);

const TIMESTAMP_HEADERS = new Set(['timestamp', 'date', 'submitted at', 'submission time']);

export type { RedactFormRowInput, RedactFormRowResult } from './formSourceTypes';

/**
 * Infer respondent role from export filename (e.g. "Doctor Pilot.csv").
 */
export function detectSourceRoleFromFilename(filename: string): FormSourceRole {
  const normalized = filename
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .trim();

  const orderedRoles: FormSourceRole[] = [
    'medical_student',
    'pharmacy',
    'doctor',
    'nurse',
    'caregiver',
    'patient',
  ];

  for (const role of orderedRoles) {
    if (role === 'unknown') continue;
    const hints = FORM_SOURCE_FILENAME_HINTS[role];
    for (const hint of hints) {
      if (normalized.includes(hint)) {
        return role;
      }
    }
  }

  return 'unknown';
}

/**
 * De-identify one parsed form row: strip direct identifiers, preserve coarse region,
 * hash raw payload. Does not log or return raw row text.
 */
export function redactFormRow(input: RedactFormRowInput): RedactFormRowResult {
  const consentGranted = resolveConsentGranted(input.headers, input.row);
  const coarseRegion = extractCoarseRegion(input.headers, input.row);
  const deidentifiedAnswers = redactRowAnswers(input.headers, input.row);
  const rawPayloadHash = hashRawRowPayload(input.row);
  const createdAt = extractTimestamp(input.headers, input.row) ?? new Date(0).toISOString();
  const responseId = buildResponseId(input.batchId, input.rowIndex, rawPayloadHash);

  return {
    responseId,
    sourceRole: input.sourceRole,
    consentGranted,
    coarseRegion,
    deidentifiedAnswers,
    rawPayloadHash,
    createdAt,
  };
}

/** SHA-256 of canonical row JSON (sorted keys) for stable dedupe. */
export function hashRawRowPayload(row: Readonly<Record<string, string>>): string {
  const canonical = Object.keys(row)
    .sort((a, b) => a.localeCompare(b))
    .reduce<Record<string, string>>((accumulator, key) => {
      accumulator[key] = row[key] ?? '';
      return accumulator;
    }, {});

  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

export function toNormalizedFormResponse(redacted: RedactFormRowResult): NormalizedFormResponse {
  return {
    responseId: redacted.responseId,
    sourceRole: redacted.sourceRole,
    consentGranted: redacted.consentGranted,
    coarseRegion: redacted.coarseRegion,
    deidentifiedAnswers: redacted.deidentifiedAnswers,
    rawPayloadHash: redacted.rawPayloadHash,
    createdAt: redacted.createdAt,
  };
}

export function redactFormRows(input: {
  headers: readonly string[];
  rows: readonly Readonly<Record<string, string>>[];
  sourceRole: FormSourceRole;
  batchId?: string;
}): NormalizedFormResponse[] {
  return input.rows.map((row, rowIndex) =>
    toNormalizedFormResponse(
      redactFormRow({
        row,
        headers: input.headers,
        sourceRole: input.sourceRole,
        rowIndex,
        batchId: input.batchId,
      }),
    ),
  );
}

function redactRowAnswers(
  headers: readonly string[],
  row: Readonly<Record<string, string>>,
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const header of headers) {
    if (!header || isPiiHeader(header) || isConsentHeader(header)) {
      continue;
    }
    if (isRegionHeader(header)) {
      continue;
    }

    const value = (row[header] ?? '').trim();
    if (!value) continue;

    result[header] = value;
  }

  return result;
}

function resolveConsentGranted(
  headers: readonly string[],
  row: Readonly<Record<string, string>>,
): boolean | null {
  const consentHeader = headers.find((header) => isConsentHeader(header));
  if (!consentHeader) {
    return null;
  }

  const answer = (row[consentHeader] ?? '').trim().toLowerCase();
  if (!answer) return null;
  if (AFFIRMATIVE_ANSWERS.has(answer)) return true;
  if (NEGATIVE_ANSWERS.has(answer)) return false;
  return null;
}

function extractCoarseRegion(
  headers: readonly string[],
  row: Readonly<Record<string, string>>,
): string | null {
  for (const header of headers) {
    if (!isRegionHeader(header)) continue;
    const value = (row[header] ?? '').trim();
    if (value) return value;
  }
  return null;
}

function extractTimestamp(
  headers: readonly string[],
  row: Readonly<Record<string, string>>,
): string | null {
  for (const header of headers) {
    const normalized = header.trim().toLowerCase();
    if (!TIMESTAMP_HEADERS.has(normalized)) continue;
    const value = (row[header] ?? '').trim();
    if (!value) continue;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return null;
}

function isPiiHeader(header: string): boolean {
  return PII_HEADER_PATTERN.test(header);
}

function isRegionHeader(header: string): boolean {
  return REGION_HEADER_PATTERN.test(header);
}

function isConsentHeader(header: string): boolean {
  return CONSENT_HEADER_PATTERN.test(header);
}

function buildResponseId(batchId: string | undefined, rowIndex: number, hash: string): string {
  const prefix = batchId ? batchId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32) : 'batch';
  return `${prefix}_${rowIndex}_${hash.slice(0, 12)}`;
}
