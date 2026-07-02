import { validateFormImportUpload } from './formImportUpload';

export type ReadFormImportCsvResult =
  | { ok: true; filename: string; csvText: string }
  | { ok: false; code: string; message: string };

export async function readCsvTextFromUploadBuffer(
  filename: string,
  buffer: Uint8Array,
): Promise<ReadFormImportCsvResult> {
  const validation = validateFormImportUpload({
    filename,
    byteLength: buffer.byteLength,
  });

  if (!validation.ok) {
    return { ok: false, code: validation.code, message: validation.message };
  }

  const normalizedName = validation.filename.toLowerCase();

  if (normalizedName.endsWith('.csv')) {
    return {
      ok: true,
      filename: validation.filename,
      csvText: new TextDecoder('utf-8').decode(buffer),
    };
  }

  try {
    const { default: AdmZip } = await import('adm-zip');
    const zip = new AdmZip(Buffer.from(buffer));
    const csvEntry = zip
      .getEntries()
      .filter((entry) => !entry.isDirectory && entry.entryName.toLowerCase().endsWith('.csv'))
      .sort((left, right) => left.entryName.localeCompare(right.entryName))[0];

    if (!csvEntry) {
      return {
        ok: false,
        code: 'zip_without_csv',
        message: 'ZIP archive must contain at least one .csv file.',
      };
    }

    return {
      ok: true,
      filename: validation.filename,
      csvText: csvEntry.getData().toString('utf8'),
    };
  } catch {
    return {
      ok: false,
      code: 'zip_read_failed',
      message: 'Failed to read ZIP upload.',
    };
  }
}
