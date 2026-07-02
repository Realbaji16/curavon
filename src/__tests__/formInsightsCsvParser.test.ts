import { describe, expect, it } from 'vitest';
import {
  detectSourceRoleFromFilename,
  hashRawRowPayload,
  parseGoogleFormCsv,
  redactFormRow,
} from '../lib/form-insights';

describe('parseGoogleFormCsv', () => {
  it('parses a simple Google Form CSV with headers preserved', () => {
    const csv = [
      'Timestamp,What is your main concern?,State',
      '3/21/2026 10:00:00,body hot since yesterday,Lagos',
      '3/21/2026 11:00:00,headache after stress,Abuja',
    ].join('\n');

    const result = parseGoogleFormCsv(csv);

    expect(result.headers).toEqual(['Timestamp', 'What is your main concern?', 'State']);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual({
      Timestamp: '3/21/2026 10:00:00',
      'What is your main concern?': 'body hot since yesterday',
      State: 'Lagos',
    });
  });

  it('handles quoted commas and embedded newlines', () => {
    const csv =
      'Timestamp,Concern,Notes\n' +
      '3/21/2026 10:00:00,"fever, chills","line one\nline two"\n';

    const result = parseGoogleFormCsv(csv);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]?.Concern).toBe('fever, chills');
    expect(result.rows[0]?.Notes).toBe('line one\nline two');
  });
});

describe('detectSourceRoleFromFilename', () => {
  it('detects doctor, pharmacy, and medical_student roles', () => {
    expect(detectSourceRoleFromFilename('Curavon Doctor Feedback.csv')).toBe('doctor');
    expect(detectSourceRoleFromFilename('pharmacy_pilot_export.csv')).toBe('pharmacy');
    expect(detectSourceRoleFromFilename('Medical Student Survey.csv')).toBe('medical_student');
    expect(detectSourceRoleFromFilename('general_responses.csv')).toBe('unknown');
  });
});

describe('redactFormRow', () => {
  const headers = [
    'Timestamp',
    'Full Name',
    'Email Address',
    'Phone Number',
    'State',
    'What is your main concern?',
    'I consent to de-identified product research',
  ];

  const row = {
    Timestamp: '3/21/2026 10:00:00',
    'Full Name': 'Ada Okafor',
    'Email Address': 'ada@example.com',
    'Phone Number': '+2348012345678',
    State: 'Lagos',
    'What is your main concern?': 'chemist gave me drug and body itching',
    'I consent to de-identified product research': 'Yes',
  };

  it('redacts email, phone, and name fields', () => {
    const redacted = redactFormRow({
      row,
      headers,
      sourceRole: 'patient',
      rowIndex: 0,
      batchId: 'pilot',
    });

    expect(redacted.deidentifiedAnswers).not.toHaveProperty('Full Name');
    expect(redacted.deidentifiedAnswers).not.toHaveProperty('Email Address');
    expect(redacted.deidentifiedAnswers).not.toHaveProperty('Phone Number');
    expect(Object.values(redacted.deidentifiedAnswers).join(' ')).not.toContain('ada@example.com');
    expect(Object.values(redacted.deidentifiedAnswers).join(' ')).not.toContain('Ada Okafor');
  });

  it('preserves non-identifying product answers and coarse region', () => {
    const redacted = redactFormRow({
      row,
      headers,
      sourceRole: 'patient',
      rowIndex: 0,
    });

    expect(redacted.coarseRegion).toBe('Lagos');
    expect(redacted.deidentifiedAnswers['What is your main concern?']).toBe(
      'chemist gave me drug and body itching',
    );
    expect(redacted.consentGranted).toBe(true);
    expect(redacted.sourceRole).toBe('patient');
  });

  it('returns null consent when no consent column exists', () => {
    const headersWithoutConsent = headers.filter(
      (header) => !header.toLowerCase().includes('consent'),
    );
    const redacted = redactFormRow({
      row,
      headers: headersWithoutConsent,
      sourceRole: 'unknown',
      rowIndex: 1,
    });

    expect(redacted.consentGranted).toBe(null);
  });

  it('returns a stable hash for the same raw row payload', () => {
    const first = hashRawRowPayload(row);
    const second = hashRawRowPayload({ ...row });
    const changed = hashRawRowPayload({ ...row, State: 'Rivers' });

    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(changed).not.toBe(first);
    expect(
      redactFormRow({ row, headers, sourceRole: 'doctor', rowIndex: 0 }).rawPayloadHash,
    ).toBe(first);
  });
});
