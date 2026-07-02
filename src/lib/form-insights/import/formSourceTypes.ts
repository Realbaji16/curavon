import type { FormSourceRole } from '../types';

/** Result of parsing a Google Form CSV export (text only — unzip at script layer). */
export type FormCsvParseResult = {
  headers: readonly string[];
  rows: readonly Record<string, string>[];
};

export type ParseGoogleFormCsvOptions = {
  /** Drop rows where every cell is empty after trim. Default true. */
  skipEmptyRows?: boolean;
};

/** Filename hints used when CSV does not include an explicit role column. */
export const FORM_SOURCE_FILENAME_HINTS: Readonly<
  Record<Exclude<FormSourceRole, 'unknown'>, readonly string[]>
> = {
  doctor: ['doctor', 'doctors', 'physician', 'clinician'],
  pharmacy: ['pharmacy', 'pharmacist', 'chemist'],
  medical_student: ['medical student', 'medical_student', 'medstudent', 'med student'],
  nurse: ['nurse', 'nurses', 'nursing'],
  patient: ['patient', 'patients'],
  caregiver: ['caregiver', 'care giver', 'carer'],
};

export type RedactFormRowInput = {
  row: Readonly<Record<string, string>>;
  headers: readonly string[];
  sourceRole: FormSourceRole;
  /** Stable index within the batch for id generation. */
  rowIndex: number;
  /** Optional batch id prefix for responseId. */
  batchId?: string;
};

export type RedactFormRowResult = {
  responseId: string;
  sourceRole: FormSourceRole;
  consentGranted: boolean | null;
  coarseRegion: string | null;
  deidentifiedAnswers: Readonly<Record<string, string>>;
  rawPayloadHash: string;
  createdAt: string;
};
