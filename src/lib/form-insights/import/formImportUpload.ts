/** Max upload size for form CSV/ZIP imports (5 MiB). */
export const FORM_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(['.csv', '.zip']);

export type FormImportUploadValidationErrorCode =
  | 'missing_filename'
  | 'invalid_extension'
  | 'file_too_large'
  | 'empty_file';

export type FormImportUploadValidationResult =
  | { ok: true; filename: string; byteLength: number }
  | {
      ok: false;
      code: FormImportUploadValidationErrorCode;
      message: string;
    };

export function validateFormImportUpload(input: {
  filename: string;
  byteLength: number;
  maxBytes?: number;
}): FormImportUploadValidationResult {
  const filename = input.filename.trim();

  if (!filename) {
    return {
      ok: false,
      code: 'missing_filename',
      message: 'Upload filename is required.',
    };
  }

  const extension = filename.includes('.')
    ? `.${filename.split('.').pop()!.toLowerCase()}`
    : '';

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return {
      ok: false,
      code: 'invalid_extension',
      message: 'Only .csv and .zip uploads are accepted.',
    };
  }

  if (input.byteLength <= 0) {
    return {
      ok: false,
      code: 'empty_file',
      message: 'Upload file is empty.',
    };
  }

  const maxBytes = input.maxBytes ?? FORM_IMPORT_MAX_BYTES;
  if (input.byteLength > maxBytes) {
    return {
      ok: false,
      code: 'file_too_large',
      message: `Upload exceeds maximum size of ${maxBytes} bytes.`,
    };
  }

  return { ok: true, filename, byteLength: input.byteLength };
}
