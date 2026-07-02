import type { FormCsvParseResult, ParseGoogleFormCsvOptions } from './formSourceTypes';

/**
 * Parse Google Form CSV export text into headers and row objects.
 * Handles quoted fields, embedded commas, and newlines (RFC 4180-style).
 */
export function parseGoogleFormCsv(
  csvText: string,
  options: ParseGoogleFormCsvOptions = {},
): FormCsvParseResult {
  const skipEmptyRows = options.skipEmptyRows ?? true;
  const records = parseCsvRecords(csvText);

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map((header) => header.trim());
  const rows: Record<string, string>[] = [];

  for (const values of records.slice(1)) {
    const row: Record<string, string> = {};
    let hasContent = false;

    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      if (!header) continue;
      const value = (values[index] ?? '').trim();
      if (value) hasContent = true;
      row[header] = value;
    }

    if (skipEmptyRows && !hasContent) continue;
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * RFC 4180-style CSV record parser (quoted fields, escaped quotes, multiline cells).
 */
export function parseCsvRecords(csvText: string): string[][] {
  const text = csvText.replace(/^\uFEFF/, '');
  const records: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === ',') {
      row.push(field);
      field = '';
      continue;
    }

    if (char === '\n') {
      row.push(field);
      field = '';
      records.push(row);
      row = [];
      continue;
    }

    if (char === '\r') {
      continue;
    }

    field += char;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    records.push(row);
  }

  return records;
}

export type { FormCsvParseResult, ParseGoogleFormCsvOptions };
